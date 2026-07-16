import { describe, expect, it } from "vitest";

import {
  findImportRegistryEntry,
  registerImportedDocument,
  type ImportRegistry,
} from "./importRegistry";
import {
  hashA,
  hashB,
  makeImportedDocument,
} from "./testSupport";

describe("Import Registry", () => {
  it("registers and finds a new document by hash", () => {
    const registry = registerImportedDocument(
      { entries: [] },
      makeImportedDocument(),
    );

    expect(findImportRegistryEntry(registry, hashA)).toEqual({
      contentSha256: hashA,
      documentId: "document-1",
      firstImportedAt: "2026-07-16T08:00:00.000Z",
    });
  });

  it("returns null for an unknown hash", () => {
    expect(findImportRegistryEntry({ entries: [] }, hashA)).toBeNull();
  });

  it("does not add a second entry for the same hash", () => {
    const original = registerImportedDocument(
      { entries: [] },
      makeImportedDocument(),
    );
    const duplicate = registerImportedDocument(
      original,
      makeImportedDocument({
        id: "document-2",
        fileName: "renamed.txt",
        importedAt: "2026-07-16T09:00:00.000Z",
      }),
    );

    expect(duplicate).toEqual(original);
    expect(duplicate.entries).toHaveLength(1);
  });

  it("preserves the first document ID and import time", () => {
    const original = registerImportedDocument(
      { entries: [] },
      makeImportedDocument(),
    );
    const duplicate = registerImportedDocument(
      original,
      makeImportedDocument({ id: "later-document" }),
    );

    expect(duplicate.entries[0]).toEqual(original.entries[0]);
  });

  it("preserves first-registration order", () => {
    let registry: ImportRegistry = { entries: [] };
    registry = registerImportedDocument(
      registry,
      makeImportedDocument({ id: "document-a", contentSha256: hashA }),
    );
    registry = registerImportedDocument(
      registry,
      makeImportedDocument({ id: "document-b", contentSha256: hashB }),
    );

    expect(registry.entries.map(({ documentId }) => documentId)).toEqual([
      "document-a",
      "document-b",
    ]);
  });

  it("does not mutate registry or document inputs", () => {
    const registry: ImportRegistry = { entries: [] };
    const document = makeImportedDocument();
    const originalRegistry = structuredClone(registry);
    const originalDocument = structuredClone(document);

    registerImportedDocument(registry, document);

    expect(registry).toEqual(originalRegistry);
    expect(document).toEqual(originalDocument);
  });
});
