import { describe, expect, it } from "vitest";

import {
  makeImportedDocument,
  expectAsyncErrorCode,
  hashA,
} from "../import/testSupport";
import { makeEntity } from "../review/testSupport";
import {
  advanceToRelationshipReview,
  completeReviewSession,
  createReviewSession,
} from "../review/reviewSession";
import type { ReviewSession } from "../review/types";
import type { Clock } from "../shared/clock";
import { SequenceIdGenerator } from "../shared/idGenerator";
import { MemoryStorageAdapter } from "../storage/memoryStorageAdapter";
import type {
  StorageAdapter,
  StorageSnapshot,
} from "../storage/storageAdapter";
import { applyCompletedReviewSession } from "./applyReviewSession";

const appliedAt = "2026-07-16T11:00:00.000Z";

function makeSession(input: {
  id: string;
  baseRevision: number;
  phase?: "entities" | "relationships" | "complete";
  entityIds?: string[];
}): ReviewSession {
  const entities = (input.entityIds ?? []).map((id) =>
    makeEntity({ id, name: id, aliases: [] }),
  );
  const initial = createReviewSession(
    {
      bundle: {
        schemaVersion: 1,
        documentId: "document-1",
        entities: [],
        relationships: [],
      },
      initialKnowledge: { entities, relationships: [] },
      baseKnowledgeRevision: input.baseRevision,
    },
    { idGenerator: new SequenceIdGenerator([input.id]) },
  );

  if (input.phase === "entities" || input.phase === undefined) return initial;
  const relationships = advanceToRelationshipReview(initial);
  return input.phase === "relationships"
    ? relationships
    : completeReviewSession(relationships);
}

function makeSnapshot(
  sessions: ReviewSession[],
  overrides: Partial<StorageSnapshot> = {},
): StorageSnapshot {
  const document = makeImportedDocument();
  return {
    knowledge: { entities: [], relationships: [] },
    knowledgeRevision: 0,
    reviewSessions: sessions,
    reviewApplications: [],
    importedDocuments: [document],
    importRegistry: {
      entries: [
        {
          contentSha256: hashA,
          documentId: document.id,
          firstImportedAt: document.importedAt,
        },
      ],
    },
    ...overrides,
  };
}

class CountingClock implements Clock {
  calls = 0;
  readonly #value: string;

  constructor(value = appliedAt) {
    this.#value = value;
  }

  now(): string {
    this.calls += 1;
    return this.#value;
  }
}

class SpyStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  loads = 0;
  saves = 0;
  failSave = false;

  constructor(snapshot: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  async load(): Promise<StorageSnapshot> {
    this.loads += 1;
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.saves += 1;
    if (this.failSave) throw new Error("save failed");
    await this.memory.save(snapshot);
  }
}

describe("applyCompletedReviewSession", () => {
  it("replaces canonical Knowledge and appends one application atomically", async () => {
    const session = makeSession({
      id: "session-complete",
      baseRevision: 0,
      phase: "complete",
      entityIds: ["entity-z", "entity-a"],
    });
    const otherSession = makeSession({
      id: "session-other",
      baseRevision: 0,
      phase: "entities",
    });
    const initial = makeSnapshot([session, otherSession], {
      knowledge: {
        entities: [makeEntity({ id: "entity-old", name: "Old" })],
        relationships: [],
      },
    });
    const original = structuredClone(initial);
    const storage = new SpyStorage(initial);
    const clock = new CountingClock();
    const input = { reviewSessionId: session.id };
    const result = await applyCompletedReviewSession(input, { storage, clock });

    expect(result).toMatchObject({
      status: "applied",
      reviewSessionId: session.id,
      knowledgeRevision: 1,
      application: {
        reviewSessionId: session.id,
        appliedAt,
        fromKnowledgeRevision: 0,
        toKnowledgeRevision: 1,
      },
    });
    expect(result.snapshot.knowledge.entities.map(({ id }) => id)).toEqual([
      "entity-z",
      "entity-a",
    ]);
    expect(result.snapshot.reviewSessions).toEqual(original.reviewSessions);
    expect(result.snapshot.importedDocuments).toEqual(original.importedDocuments);
    expect(result.snapshot.importRegistry).toEqual(original.importRegistry);
    expect(result.snapshot.reviewApplications).toHaveLength(1);
    expect(storage.loads).toBe(1);
    expect(storage.saves).toBe(1);
    expect(clock.calls).toBe(1);
    expect(initial).toEqual(original);
    expect(input).toEqual({ reviewSessionId: "session-complete" });
  });

  it("returns already_applied without Clock, save, revision, or Knowledge changes", async () => {
    const session = makeSession({
      id: "session-complete",
      baseRevision: 0,
      phase: "complete",
      entityIds: ["entity-new"],
    });
    const storage = new SpyStorage(makeSnapshot([session]));
    const clock = new CountingClock();
    const first = await applyCompletedReviewSession(
      { reviewSessionId: session.id },
      { storage, clock },
    );
    const storedAfterFirst = await storage.memory.load();
    const second = await applyCompletedReviewSession(
      { reviewSessionId: session.id },
      { storage, clock },
    );

    expect(first.status).toBe("applied");
    expect(second.status).toBe("already_applied");
    expect(second.snapshot).toEqual(storedAfterFirst);
    expect(second.snapshot.knowledgeRevision).toBe(1);
    expect(second.snapshot.reviewApplications).toHaveLength(1);
    expect(storage.saves).toBe(1);
    expect(clock.calls).toBe(1);
  });

  it("rejects a missing Session without save or Clock", async () => {
    const storage = new SpyStorage(makeSnapshot([]));
    const clock = new CountingClock();

    await expectAsyncErrorCode(
      () => applyCompletedReviewSession(
        { reviewSessionId: "missing" },
        { storage, clock },
      ),
      "REVIEW_SESSION_NOT_FOUND",
    );
    expect(storage.saves).toBe(0);
    expect(clock.calls).toBe(0);
  });

  it.each(["entities", "relationships"] as const)(
    "rejects a Session in %s phase",
    async (phase) => {
      const session = makeSession({
        id: `session-${phase}`,
        baseRevision: 0,
        phase,
      });
      const storage = new SpyStorage(makeSnapshot([session]));
      const clock = new CountingClock();

      await expectAsyncErrorCode(
        () => applyCompletedReviewSession(
          { reviewSessionId: session.id },
          { storage, clock },
        ),
        "REVIEW_SESSION_NOT_COMPLETE",
      );
      expect(storage.saves).toBe(0);
      expect(clock.calls).toBe(0);
    },
  );

  it("rejects stale Knowledge without rebase, merge, save, or Clock", async () => {
    const session = makeSession({
      id: "session-stale",
      baseRevision: 1,
      phase: "complete",
      entityIds: ["entity-stale"],
    });
    const initial = makeSnapshot([session]);
    const storage = new SpyStorage(initial);
    const clock = new CountingClock();

    try {
      await applyCompletedReviewSession(
        { reviewSessionId: session.id },
        { storage, clock },
      );
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({
        code: "KNOWLEDGE_REVISION_CONFLICT",
        details: {
          reviewSessionId: session.id,
          expectedRevision: 1,
          actualRevision: 0,
        },
      });
    }
    expect(storage.saves).toBe(0);
    expect(clock.calls).toBe(0);
    await expect(storage.memory.load()).resolves.toEqual(initial);
  });

  it("applies when base and current revision are both one", async () => {
    const prior = makeSession({
      id: "session-prior",
      baseRevision: 0,
      phase: "complete",
      entityIds: ["entity-prior"],
    });
    const target = makeSession({
      id: "session-target",
      baseRevision: 1,
      phase: "complete",
      entityIds: ["entity-target"],
    });
    const snapshot = makeSnapshot([prior, target], {
      knowledge: prior.knowledge,
      knowledgeRevision: 1,
      reviewApplications: [
        {
          reviewSessionId: prior.id,
          appliedAt,
          fromKnowledgeRevision: 0,
          toKnowledgeRevision: 1,
        },
      ],
    });
    const result = await applyCompletedReviewSession(
      { reviewSessionId: target.id },
      { storage: new SpyStorage(snapshot), clock: new CountingClock() },
    );

    expect(result.status).toBe("applied");
    expect(result.snapshot.knowledgeRevision).toBe(2);
    expect(result.snapshot.knowledge.entities[0]?.id).toBe("entity-target");
  });

  it("rejects a second stale Session after another Session applies first", async () => {
    const first = makeSession({
      id: "session-first",
      baseRevision: 0,
      phase: "complete",
      entityIds: ["entity-first"],
    });
    const stale = makeSession({
      id: "session-stale",
      baseRevision: 0,
      phase: "complete",
      entityIds: ["entity-stale"],
    });
    const storage = new SpyStorage(makeSnapshot([first, stale]));
    await applyCompletedReviewSession(
      { reviewSessionId: first.id },
      { storage, clock: new CountingClock() },
    );

    await expectAsyncErrorCode(
      () => applyCompletedReviewSession(
        { reviewSessionId: stale.id },
        { storage, clock: new CountingClock() },
      ),
      "KNOWLEDGE_REVISION_CONFLICT",
    );
    const stored = await storage.memory.load();
    expect(stored.knowledge.entities[0]?.id).toBe("entity-first");
    expect(stored.reviewApplications).toHaveLength(1);
  });

  it("wraps Storage load failures", async () => {
    const storage: StorageAdapter = {
      async load() { throw new Error("load failed"); },
      async save() { throw new Error("must not save"); },
    };

    await expectAsyncErrorCode(
      () => applyCompletedReviewSession(
        { reviewSessionId: "session" },
        { storage, clock: new CountingClock() },
      ),
      "STORAGE_LOAD_FAILED",
    );
  });

  it("wraps Storage save failure without treating the next Snapshot as canonical", async () => {
    const session = makeSession({
      id: "session-complete",
      baseRevision: 0,
      phase: "complete",
    });
    const initial = makeSnapshot([session]);
    const storage = new SpyStorage(initial);
    storage.failSave = true;

    await expectAsyncErrorCode(
      () => applyCompletedReviewSession(
        { reviewSessionId: session.id },
        { storage, clock: new CountingClock() },
      ),
      "STORAGE_SAVE_FAILED",
    );
    await expect(storage.memory.load()).resolves.toEqual(initial);
  });

  it("does not save when Clock returns an invalid timestamp", async () => {
    const session = makeSession({
      id: "session-complete",
      baseRevision: 0,
      phase: "complete",
    });
    const initial = makeSnapshot([session]);
    const storage = new SpyStorage(initial);

    await expect(
      applyCompletedReviewSession(
        { reviewSessionId: session.id },
        { storage, clock: new CountingClock("invalid") },
      ),
    ).rejects.toThrow();
    expect(storage.saves).toBe(0);
    await expect(storage.memory.load()).resolves.toEqual(initial);
  });
});
