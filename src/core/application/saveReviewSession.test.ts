import { describe, expect, it } from "vitest";

import {
  expectAsyncErrorCode,
  makeStorageSnapshot,
} from "../import/testSupport";
import { advanceToRelationshipReview } from "../review/reviewSession";
import type { ReviewSession } from "../review/types";
import { MemoryStorageAdapter } from "../storage/memoryStorageAdapter";
import type {
  StorageAdapter,
  StorageSnapshot,
} from "../storage/storageAdapter";
import { saveReviewSession } from "./saveReviewSession";

class SpyStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  loads = 0;
  saves = 0;
  failLoad = false;
  failSave = false;

  constructor(snapshot: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  async load(): Promise<StorageSnapshot> {
    this.loads += 1;
    if (this.failLoad) throw new Error("load failed");
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.saves += 1;
    if (this.failSave) throw new Error("save failed");
    await this.memory.save(snapshot);
  }
}

describe("saveReviewSession", () => {
  it("replaces the matching Session and saves exactly once", async () => {
    const initial = makeStorageSnapshot();
    const updated = advanceToRelationshipReview(initial.reviewSessions[0] as ReviewSession);
    const storage = new SpyStorage(initial);

    const result = await saveReviewSession(updated.id, updated, { storage });

    expect(result.reviewSessions).toEqual([updated]);
    expect(storage.loads).toBe(1);
    expect(storage.saves).toBe(1);
    await expect(storage.memory.load()).resolves.toEqual(result);
  });

  it("preserves root Knowledge, revision, applications, documents and registry", async () => {
    const initial = makeStorageSnapshot();
    const updated = advanceToRelationshipReview(initial.reviewSessions[0] as ReviewSession);
    const storage = new SpyStorage(initial);

    const result = await saveReviewSession(updated.id, updated, { storage });

    expect({
      knowledge: result.knowledge,
      knowledgeRevision: result.knowledgeRevision,
      reviewApplications: result.reviewApplications,
      importedDocuments: result.importedDocuments,
      importRegistry: result.importRegistry,
    }).toEqual({
      knowledge: initial.knowledge,
      knowledgeRevision: initial.knowledgeRevision,
      reviewApplications: initial.reviewApplications,
      importedDocuments: initial.importedDocuments,
      importRegistry: initial.importRegistry,
    });
  });

  it("rejects an invalid updated Session before loading", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    const invalid = {
      ...initial.reviewSessions[0],
      schemaVersion: 2,
    } as unknown as ReviewSession;

    await expectAsyncErrorCode(
      () => saveReviewSession("review-session-1", invalid, { storage }),
      "INVALID_REVIEW_SESSION",
    );
    expect(storage.loads).toBe(0);
    expect(storage.saves).toBe(0);
  });

  it("rejects a requested and updated Session ID mismatch", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    const updated = {
      ...(initial.reviewSessions[0] as ReviewSession),
      id: "different-session",
    };

    await expectAsyncErrorCode(
      () => saveReviewSession("review-session-1", updated, { storage }),
      "REVIEW_SESSION_ID_MISMATCH",
    );
    expect(storage.loads).toBe(0);
    expect(storage.saves).toBe(0);
  });

  it("rejects a missing stored Session", async () => {
    const initial = makeStorageSnapshot();
    const updated = initial.reviewSessions[0] as ReviewSession;
    const storage = new SpyStorage({ ...initial, reviewSessions: [] });

    await expectAsyncErrorCode(
      () => saveReviewSession(updated.id, updated, { storage }),
      "REVIEW_SESSION_NOT_FOUND",
    );
    expect(storage.saves).toBe(0);
  });

  it("rejects documentId changes", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    const updated = {
      ...(initial.reviewSessions[0] as ReviewSession),
      documentId: "different-document",
    };

    await expectAsyncErrorCode(
      () => saveReviewSession(updated.id, updated, { storage }),
      "REVIEW_SESSION_DOCUMENT_ID_CHANGED",
    );
    expect(storage.saves).toBe(0);
  });

  it("rejects baseKnowledgeRevision changes", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    const updated = {
      ...(initial.reviewSessions[0] as ReviewSession),
      baseKnowledgeRevision: 1,
    };

    await expectAsyncErrorCode(
      () => saveReviewSession(updated.id, updated, { storage }),
      "REVIEW_SESSION_BASE_REVISION_CHANGED",
    );
    expect(storage.saves).toBe(0);
  });

  it("wraps load failures and never saves", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    storage.failLoad = true;

    await expectAsyncErrorCode(
      () => saveReviewSession("review-session-1", initial.reviewSessions[0] as ReviewSession, { storage }),
      "STORAGE_LOAD_FAILED",
    );
    expect(storage.saves).toBe(0);
  });

  it("wraps save failures without changing stored state", async () => {
    const initial = makeStorageSnapshot();
    const updated = advanceToRelationshipReview(initial.reviewSessions[0] as ReviewSession);
    const storage = new SpyStorage(initial);
    storage.failSave = true;

    await expectAsyncErrorCode(
      () => saveReviewSession(updated.id, updated, { storage }),
      "STORAGE_SAVE_FAILED",
    );
    expect(storage.saves).toBe(1);
    await expect(storage.memory.load()).resolves.toEqual(initial);
  });
});
