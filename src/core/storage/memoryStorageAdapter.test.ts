import { describe, expect, it } from "vitest";

import { makeEntity, makeKnowledge, makeRelationship } from "../review/testSupport";
import {
  expectAsyncErrorCode,
  expectErrorCode,
  hashB,
  makeImportedDocument,
  makeStorageSnapshot,
} from "../import/testSupport";
import { MemoryStorageAdapter } from "./memoryStorageAdapter";
import { createEmptyStorageSnapshot } from "./storageAdapter";

describe("MemoryStorageAdapter", () => {
  it("starts with the specified empty snapshot", async () => {
    await expect(new MemoryStorageAdapter().load()).resolves.toEqual(
      createEmptyStorageSnapshot(),
    );
  });

  it("saves and loads a valid snapshot", async () => {
    const storage = new MemoryStorageAdapter();
    const snapshot = makeStorageSnapshot();

    await storage.save(snapshot);

    await expect(storage.load()).resolves.toEqual(snapshot);
  });

  it("rejects duplicate Imported Document IDs", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.importedDocuments.push(
      makeImportedDocument({ contentSha256: hashB }),
    );

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "DUPLICATE_IMPORTED_DOCUMENT_ID",
    );
  });

  it("rejects duplicate Review Session IDs", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.reviewSessions.push(structuredClone(snapshot.reviewSessions[0]!));

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "DUPLICATE_REVIEW_SESSION_ID",
    );
  });

  it("rejects duplicate Registry hashes", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.importRegistry.entries.push({
      ...snapshot.importRegistry.entries[0]!,
      documentId: "document-other",
    });

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "DUPLICATE_IMPORT_HASH",
    );
  });

  it("rejects a Registry dangling document", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.importRegistry.entries[0]!.documentId = "missing";

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "IMPORT_REGISTRY_DANGLING_DOCUMENT",
    );
  });

  it("rejects a Review Session dangling document", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.reviewSessions[0]!.documentId = "missing";

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "REVIEW_SESSION_DANGLING_DOCUMENT",
    );
  });

  it("rejects duplicate Knowledge Entity and Relationship IDs", () => {
    const duplicateEntities = makeStorageSnapshot();
    duplicateEntities.knowledge.entities = [makeEntity(), makeEntity()];
    expectErrorCode(
      () => new MemoryStorageAdapter(duplicateEntities),
      "DUPLICATE_ENTITY_ID",
    );

    const duplicateRelationships = makeStorageSnapshot();
    duplicateRelationships.knowledge = makeKnowledge({
      relationships: [makeRelationship(), makeRelationship()],
    });
    expectErrorCode(
      () => new MemoryStorageAdapter(duplicateRelationships),
      "DUPLICATE_RELATIONSHIP_ID",
    );
  });

  it("rejects dangling Knowledge Relationship endpoints", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.knowledge = makeKnowledge({
      relationships: [makeRelationship({ toEntityId: "missing" })],
    });

    expectErrorCode(
      () => new MemoryStorageAdapter(snapshot),
      "DANGLING_RELATIONSHIP_ENDPOINT",
    );
  });

  it("rejects invalid hashes, Review Sessions and unknown fields", () => {
    const invalidHash = makeStorageSnapshot();
    invalidHash.importedDocuments[0]!.contentSha256 = "invalid";
    expectErrorCode(
      () => new MemoryStorageAdapter(invalidHash),
      "INVALID_STORAGE_SNAPSHOT",
    );

    const missingSessionId = makeStorageSnapshot() as unknown as {
      reviewSessions: Array<Record<string, unknown>>;
    };
    delete missingSessionId.reviewSessions[0]!.id;
    expectErrorCode(
      () => new MemoryStorageAdapter(missingSessionId as never),
      "INVALID_STORAGE_SNAPSHOT",
    );

    const unknownField = {
      ...makeStorageSnapshot(),
      schemaVersion: 1,
    };
    expectErrorCode(
      () => new MemoryStorageAdapter(unknownField as never),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });

  it("isolates constructor, save and load references", async () => {
    const initial = makeStorageSnapshot();
    const storage = new MemoryStorageAdapter(initial);
    initial.importedDocuments[0]!.fileName = "mutated-before-load.txt";
    expect((await storage.load()).importedDocuments[0]?.fileName).toBe(
      "story.txt",
    );

    const saved = makeStorageSnapshot();
    await storage.save(saved);
    saved.importedDocuments[0]!.fileName = "mutated-after-save.txt";
    const loaded = await storage.load();
    loaded.importedDocuments[0]!.fileName = "mutated-load.txt";

    expect((await storage.load()).importedDocuments[0]?.fileName).toBe(
      "story.txt",
    );
  });

  it("keeps the previous state when an invalid save is rejected", async () => {
    const original = makeStorageSnapshot();
    const storage = new MemoryStorageAdapter(original);
    const invalid = makeStorageSnapshot();
    invalid.importRegistry.entries[0]!.documentId = "missing";

    await expectAsyncErrorCode(
      () => storage.save(invalid),
      "IMPORT_REGISTRY_DANGLING_DOCUMENT",
    );
    await expect(storage.load()).resolves.toEqual(original);
  });
});
