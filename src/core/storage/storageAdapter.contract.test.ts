import { describe, expect, it } from "vitest";

import {
  expectAsyncErrorCode,
  hashB,
  makeImportedDocument,
  makeStorageSnapshot,
} from "../import/testSupport";
import { LocalStorageAdapter, type KeyValueStorage } from "./localStorageAdapter";
import { MemoryStorageAdapter } from "./memoryStorageAdapter";
import {
  createEmptyStorageSnapshot,
  type StorageAdapter,
  type StorageSnapshot,
} from "./storageAdapter";

class ContractKeyValueStorage implements KeyValueStorage {
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

type AdapterFactory = () => StorageAdapter;

const factories: Array<[string, AdapterFactory]> = [
  ["MemoryStorageAdapter", () => new MemoryStorageAdapter()],
  [
    "LocalStorageAdapter",
    () => new LocalStorageAdapter({ storage: new ContractKeyValueStorage() }),
  ],
];

describe.each(factories)("%s shared Storage contract", (_name, createAdapter) => {
  it("loads the empty Snapshot", async () => {
    await expect(createAdapter().load()).resolves.toEqual(
      createEmptyStorageSnapshot(),
    );
  });

  it("saves and loads a valid Snapshot", async () => {
    const adapter = createAdapter();
    const snapshot = makeStorageSnapshot();

    await adapter.save(snapshot);

    await expect(adapter.load()).resolves.toEqual(snapshot);
  });

  it("returns the latest of multiple saves", async () => {
    const adapter = createAdapter();
    const first = makeStorageSnapshot();
    const second = makeStorageSnapshot();
    second.importedDocuments[0]!.fileName = "latest.txt";

    await adapter.save(first);
    await adapter.save(second);

    expect((await adapter.load()).importedDocuments[0]?.fileName).toBe(
      "latest.txt",
    );
  });

  it("does not share input or load references", async () => {
    const adapter = createAdapter();
    const snapshot = makeStorageSnapshot();
    await adapter.save(snapshot);
    snapshot.importedDocuments[0]!.fileName = "input-mutation.txt";
    const loaded = await adapter.load();
    loaded.importedDocuments[0]!.fileName = "load-mutation.txt";

    expect((await adapter.load()).importedDocuments[0]?.fileName).toBe(
      "story.txt",
    );
  });

  it("rejects an invalid Knowledge revision", async () => {
    const adapter = createAdapter();
    const invalid = makeStorageSnapshot();
    invalid.knowledgeRevision = -1;

    await expectAsyncErrorCode(
      () => adapter.save(invalid),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });

  it("rejects duplicate IDs and dangling references", async () => {
    const duplicate = makeStorageSnapshot();
    duplicate.importedDocuments.push(
      makeImportedDocument({ contentSha256: hashB }),
    );
    await expectAsyncErrorCode(
      () => createAdapter().save(duplicate),
      "DUPLICATE_IMPORTED_DOCUMENT_ID",
    );

    const dangling = makeStorageSnapshot();
    dangling.reviewSessions[0]!.documentId = "missing";
    await expectAsyncErrorCode(
      () => createAdapter().save(dangling),
      "REVIEW_SESSION_DANGLING_DOCUMENT",
    );
  });

  it("accepts a valid Review Application revision", async () => {
    const adapter = createAdapter();
    const snapshot: StorageSnapshot = makeStorageSnapshot();
    snapshot.knowledgeRevision = 1;
    snapshot.reviewApplications = [
      {
        reviewSessionId: snapshot.reviewSessions[0]!.id,
        appliedAt: "2026-07-16T10:00:00.000Z",
        fromKnowledgeRevision: 0,
        toKnowledgeRevision: 1,
      },
    ];

    await adapter.save(snapshot);

    await expect(adapter.load()).resolves.toEqual(snapshot);
  });
});
