import { beforeAll, describe, expect, it } from "vitest";

import { initializeApplication } from "../../../core/application";
import type { ExtractionAdapter } from "../../../core/import/extractionAdapter";
import { importDocument } from "../../../core/import/importService";
import type { ImportedDocument } from "../../../core/import/importedDocument";
import type { Clock } from "../../../core/shared/clock";
import type { IdGenerator } from "../../../core/shared/idGenerator";
import { WebCryptoSha256Hasher } from "../../../core/shared/sha256";
import {
  defaultLocalStorageKey,
  LocalStorageAdapter,
  type KeyValueStorage,
} from "../../../core/storage/localStorageAdapter";
import { MemoryStorageAdapter } from "../../../core/storage/memoryStorageAdapter";
import type {
  StorageAdapter,
  StorageSnapshot,
} from "../../../core/storage/storageAdapter";
import { calculateKnowledgeInsights } from "../../../core/insights";
import { loadProjectAstraFixture } from "./loader";
import { runProjectAstraFixture } from "./runner";

type RunnerResult = Awaited<ReturnType<typeof runProjectAstraFixture>>;

class CountingStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  saves = 0;

  constructor(snapshot: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  load(): Promise<StorageSnapshot> {
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.saves += 1;
    await this.memory.save(snapshot);
  }
}

class NeverExtractionAdapter implements ExtractionAdapter {
  calls = 0;

  async extract(_document: ImportedDocument): Promise<unknown> {
    void _document;
    this.calls += 1;
    throw new Error("extraction must not run");
  }
}

class NeverIdGenerator implements IdGenerator {
  calls = 0;

  nextId(_prefix: string): string {
    void _prefix;
    this.calls += 1;
    throw new Error("ID generation must not run");
  }
}

class NeverClock implements Clock {
  calls = 0;

  now(): string {
    this.calls += 1;
    throw new Error("Clock must not run");
  }
}

class MemoryKeyValueStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("runProjectAstraFixture", () => {
  let result: RunnerResult;

  beforeAll(async () => {
    result = await runProjectAstraFixture();
  });

  it("matches the immutable final Knowledge and Insights golden files", () => {
    const fixture = loadProjectAstraFixture();

    expect(result.snapshot.knowledge).toEqual(fixture.expectedKnowledge);
    expect(result.insights).toEqual(fixture.expectedInsights);
  });

  it("completes four imports, reviews and applications through revision four", () => {
    expect(result.snapshot.knowledgeRevision).toBe(4);
    expect(result.snapshot.importedDocuments).toHaveLength(4);
    expect(result.snapshot.importRegistry.entries).toHaveLength(4);
    expect(result.snapshot.reviewSessions).toHaveLength(4);
    expect(result.snapshot.reviewSessions.map((session) => session.phase)).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
    expect(
      result.snapshot.reviewSessions.map(
        (session) => session.baseKnowledgeRevision,
      ),
    ).toEqual([0, 1, 2, 3]);
    expect(result.snapshot.reviewApplications).toEqual([
      {
        reviewSessionId: "review-astra-001",
        appliedAt: "2026-07-16T00:10:00.000Z",
        fromKnowledgeRevision: 0,
        toKnowledgeRevision: 1,
      },
      {
        reviewSessionId: "review-astra-002",
        appliedAt: "2026-07-16T00:15:00.000Z",
        fromKnowledgeRevision: 1,
        toKnowledgeRevision: 2,
      },
      {
        reviewSessionId: "review-astra-003",
        appliedAt: "2026-07-16T00:19:00.000Z",
        fromKnowledgeRevision: 2,
        toKnowledgeRevision: 3,
      },
      {
        reviewSessionId: "review-astra-004",
        appliedAt: "2026-07-16T00:22:00.000Z",
        fromKnowledgeRevision: 3,
        toKnowledgeRevision: 4,
      },
    ]);
  });

  it("consumes the fixed registered Entity and Relationship IDs in order", () => {
    expect(result.snapshot.knowledge.entities.map((entity) => entity.id)).toEqual([
      "ent-astra-001",
      "ent-astra-002",
      "ent-astra-003",
      "ent-astra-004",
      "ent-astra-005",
      "ent-astra-006",
      "ent-astra-007",
    ]);
    expect(
      result.snapshot.knowledge.relationships.map((relationship) =>
        relationship.id,
      ),
    ).toEqual([
      "rel-astra-001",
      "rel-astra-002",
      "rel-astra-003",
      "rel-astra-004",
      "rel-astra-005",
    ]);
  });

  it("records Nova and edited Observatory merges without overwriting canonical text", () => {
    const session = result.snapshot.reviewSessions[1];
    const nova = result.snapshot.knowledge.entities[0];
    const observatory = result.snapshot.knowledge.entities[2];

    expect(session?.entityReviews).toMatchObject([
      {
        candidateId: "cand-astra-002-nova",
        status: "merged",
        registeredEntityId: "ent-astra-001",
      },
      {
        candidateId: "cand-astra-002-observatory",
        status: "merged",
        registeredEntityId: "ent-astra-003",
        candidate: { name: "Northstar Observatory" },
      },
    ]);
    expect(nova).toMatchObject({
      name: "Nova Arclight",
      description: "A celestial cartographer in the Astra Survey Corps.",
      aliases: ["Nova"],
    });
    expect(observatory).toMatchObject({
      name: "Northstar Observatory",
      description: "An observatory where a repeating signal was detected.",
      aliases: [],
    });
  });

  it("keeps the explicit duplicate as a new Entity", () => {
    const review = result.snapshot.reviewSessions[2]?.entityReviews[0];

    expect(review).toMatchObject({
      candidateId: "cand-astra-003-unknown-nova",
      duplicateEntityIds: ["ent-astra-001"],
      status: "accepted",
      registeredEntityId: "ent-astra-006",
    });
    expect(result.insights.duplicateGroups).toEqual([
      {
        normalizedKey: "nova",
        entityIds: ["ent-astra-001", "ent-astra-006"],
      },
    ]);
  });

  it("keeps age 17 canonical with an unresolved 17/18 conflict", () => {
    expect(result.insights.conflicts).toEqual([
      {
        entityId: "ent-astra-001",
        attributeKey: "age",
        canonicalValue: 17,
        claimValues: [17, 18],
        conflictResolvedAt: null,
      },
    ]);
  });

  it("makes Quiet Prism the only orphan", () => {
    expect(result.insights.orphanEntityIds).toEqual(["ent-astra-007"]);
    expect(result.insights.statistics.orphanCount).toBe(1);
  });

  it("merges duplicate member_of SourceRefs into rel-astra-001", () => {
    const relationship = result.snapshot.knowledge.relationships[0];
    const review = result.snapshot.reviewSessions[1]?.relationshipReviews[0];

    expect(relationship?.id).toBe("rel-astra-001");
    expect(relationship?.sourceRefs).toHaveLength(2);
    expect(relationship?.sourceRefs.map((sourceRef) => sourceRef.documentId)).toEqual([
      "astra-doc-001",
      "astra-doc-002",
    ]);
    expect(review).toMatchObject({
      status: "merged",
      registeredRelationshipId: "rel-astra-001",
    });
  });

  it("rejects Royal Key and the unresolved blocked Relationship without issuing IDs", () => {
    const session = result.snapshot.reviewSessions[3];

    expect(session?.entityReviews).toMatchObject([
      {
        candidateId: "cand-astra-004-prism",
        status: "accepted",
        registeredEntityId: "ent-astra-007",
      },
      {
        candidateId: "cand-astra-004-royal-key",
        status: "rejected",
        registeredEntityId: null,
      },
    ]);
    expect(session?.relationshipReviews).toMatchObject([
      {
        candidateId: "relcand-astra-004-points",
        status: "rejected",
        blockedReason: "unresolved_to",
        registeredRelationshipId: null,
      },
    ]);
    expect(
      result.snapshot.knowledge.entities.some(
        (entity) => entity.name === "Royal Key" || entity.name === "Outer Gate",
      ),
    ).toBe(false);
    expect(
      result.snapshot.knowledge.relationships.some(
        (relationship) => relationship.relationType === "points_to",
      ),
    ).toBe(false);
  });

  it("re-imports Document 01 without extraction, ID, Clock, save or state changes", async () => {
    const source = loadProjectAstraFixture().sources[0];
    if (source === undefined) throw new Error("missing source");
    const storage = new CountingStorage(result.snapshot);
    const extractionAdapter = new NeverExtractionAdapter();
    const idGenerator = new NeverIdGenerator();
    const clock = new NeverClock();

    const importResult = await importDocument(
      {
        sourceKind: "file",
        format: source.format,
        fileName: source.fileName,
        mediaType: source.mediaType,
        content: source.content,
      },
      {
        storage,
        extractionAdapter,
        hasher: new WebCryptoSha256Hasher(),
        idGenerator,
        clock,
      },
    );

    expect(importResult.status).toBe("already_imported");
    expect(extractionAdapter.calls).toBe(0);
    expect(idGenerator.calls).toBe(0);
    expect(clock.calls).toBe(0);
    expect(storage.saves).toBe(0);
    expect(importResult.snapshot).toEqual(result.snapshot);
    expect(calculateKnowledgeInsights(importResult.snapshot.knowledge)).toEqual(
      result.insights,
    );
  });

  it("round-trips the final Snapshot through Local Storage and initialization", async () => {
    const keyValueStorage = new MemoryKeyValueStorage();
    const storage = new LocalStorageAdapter({ storage: keyValueStorage });

    await storage.save(result.snapshot);

    await expect(storage.load()).resolves.toEqual(result.snapshot);
    await expect(initializeApplication({ storage })).resolves.toEqual({
      snapshot: result.snapshot,
    });
    expect(keyValueStorage.values.get(defaultLocalStorageKey)).toContain(
      '"schemaVersion":1',
    );
  });

  it("does not reset corrupt Local Storage content", async () => {
    const keyValueStorage = new MemoryKeyValueStorage();
    const storage = new LocalStorageAdapter({ storage: keyValueStorage });
    keyValueStorage.setItem(defaultLocalStorageKey, "not-json");

    await expect(storage.load()).rejects.toMatchObject({
      code: "INVALID_PERSISTED_JSON",
    });
    expect(keyValueStorage.getItem(defaultLocalStorageKey)).toBe("not-json");
  });
});
