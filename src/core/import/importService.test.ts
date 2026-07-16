import { describe, expect, it } from "vitest";

import { makeEntity } from "../review/testSupport";
import type { Clock } from "../shared/clock";
import type { IdGenerator } from "../shared/idGenerator";
import { MemoryStorageAdapter } from "../storage/memoryStorageAdapter";
import {
  createEmptyStorageSnapshot,
  type StorageAdapter,
  type StorageSnapshot,
} from "../storage/storageAdapter";
import type { ExtractionAdapter } from "./extractionAdapter";
import { importDocument } from "./importService";
import type { ImportDocumentInput, ImportedDocument } from "./importedDocument";
import {
  expectAsyncErrorCode,
  FixedHasher,
  hashA,
  importedAt,
  makeCandidateBundle,
  makeImportedDocument,
} from "./testSupport";

class CountingIdGenerator implements IdGenerator {
  readonly prefixes: string[] = [];
  readonly #ids: string[];

  constructor(ids = ["document-1", "review-session-1"]) {
    this.#ids = [...ids];
  }

  nextId(prefix: string): string {
    this.prefixes.push(prefix);
    const id = this.#ids.shift();
    if (id === undefined) throw new Error("ID_SEQUENCE_EXHAUSTED");
    return id;
  }
}

class CountingClock implements Clock {
  calls = 0;

  now(): string {
    this.calls += 1;
    return importedAt;
  }
}

class CountingExtractionAdapter implements ExtractionAdapter {
  calls = 0;
  receivedDocument: ImportedDocument | null = null;
  readonly #output: unknown;

  constructor(output: unknown = makeCandidateBundle()) {
    this.#output = output;
  }

  async extract(document: ImportedDocument): Promise<unknown> {
    this.calls += 1;
    this.receivedDocument = structuredClone(document);
    return structuredClone(this.#output);
  }
}

class SpyStorage implements StorageAdapter {
  loads = 0;
  saves = 0;
  readonly memory: MemoryStorageAdapter;

  constructor(snapshot = createEmptyStorageSnapshot()) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  async load(): Promise<StorageSnapshot> {
    this.loads += 1;
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.saves += 1;
    await this.memory.save(snapshot);
  }
}

function makeInput(
  overrides: Partial<ImportDocumentInput> = {},
): ImportDocumentInput {
  return {
    sourceKind: "file",
    format: "plain_text",
    fileName: "story.txt",
    mediaType: "text/plain",
    content: "hello",
    ...overrides,
  };
}

function makeDependencies(snapshot = createEmptyStorageSnapshot()) {
  return {
    storage: new SpyStorage(snapshot),
    extractionAdapter: new CountingExtractionAdapter(),
    hasher: new FixedHasher(),
    idGenerator: new CountingIdGenerator(),
    clock: new CountingClock(),
  };
}

describe("Import Service success", () => {
  it.each([
    ["plain_text", "text/plain", "plain", "file"],
    ["markdown", "text/markdown", "# heading", "file"],
    ["json", "application/json", '{"key":true}', "file"],
    ["plain_text", "text/plain", "pasted", "pasted_text"],
  ] as const)(
    "imports %s from %s",
    async (format, mediaType, content, sourceKind) => {
      const dependencies = makeDependencies();
      const input = makeInput({ format, mediaType, content, sourceKind });
      const result = await importDocument(input, dependencies);

      expect(result.status).toBe("imported");
      if (result.status !== "imported") return;
      expect(result.document).toMatchObject({
        id: "document-1",
        format,
        mediaType,
        sourceKind,
        content,
        contentSha256: hashA,
        importedAt,
      });
      expect(result.reviewSession.id).toBe("review-session-1");
    },
  );

  it("uses the exact processing dependencies once and saves one atomic snapshot", async () => {
    const dependencies = makeDependencies();
    const input = makeInput();
    const originalInput = structuredClone(input);
    const result = await importDocument(input, dependencies);

    expect(input).toEqual(originalInput);
    expect(dependencies.hasher.calls).toBe(1);
    expect(dependencies.hasher.values).toEqual([input.content]);
    expect(dependencies.storage.loads).toBe(1);
    expect(dependencies.extractionAdapter.calls).toBe(1);
    expect(dependencies.clock.calls).toBe(1);
    expect(dependencies.idGenerator.prefixes).toEqual([
      "document",
      "review-session",
    ]);
    expect(dependencies.storage.saves).toBe(1);
    expect(result.snapshot.importedDocuments).toHaveLength(1);
    expect(result.snapshot.reviewSessions).toHaveLength(1);
    expect(result.snapshot.importRegistry.entries).toEqual([
      {
        contentSha256: hashA,
        documentId: "document-1",
        firstImportedAt: importedAt,
      },
    ]);
  });

  it("passes current Knowledge into the new Session without changing Knowledge", async () => {
    const initial = createEmptyStorageSnapshot();
    initial.knowledge.entities.push(makeEntity());
    const dependencies = makeDependencies(initial);
    const result = await importDocument(makeInput(), dependencies);

    expect(result.status).toBe("imported");
    if (result.status !== "imported") return;
    expect(result.snapshot.knowledge).toEqual(initial.knowledge);
    expect(result.reviewSession.knowledge).toEqual(initial.knowledge);
    expect(result.reviewSession.phase).toBe("entities");
  });

  it("passes the issued document ID to Extraction and requires it in the Bundle", async () => {
    const dependencies = makeDependencies();
    const result = await importDocument(makeInput(), dependencies);

    expect(result.status).toBe("imported");
    expect(dependencies.extractionAdapter.receivedDocument?.id).toBe("document-1");
    if (result.status === "imported") {
      expect(result.candidateBundle.documentId).toBe(result.document.id);
    }
  });
});

describe("Import Service re-import idempotency", () => {
  it("returns the first document and Session for identical raw content", async () => {
    const dependencies = makeDependencies();
    const first = await importDocument(makeInput(), dependencies);
    const second = await importDocument(
      makeInput({
        fileName: "renamed.md",
        format: "markdown",
        mediaType: "text/markdown",
      }),
      dependencies,
    );

    expect(first.status).toBe("imported");
    expect(second.status).toBe("already_imported");
    if (first.status !== "imported" || second.status !== "already_imported") return;
    expect(second.existingDocument).toEqual(first.document);
    expect(second.existingReviewSession).toEqual(first.reviewSession);
    expect(dependencies.extractionAdapter.calls).toBe(1);
    expect(dependencies.idGenerator.prefixes).toEqual([
      "document",
      "review-session",
    ]);
    expect(dependencies.clock.calls).toBe(1);
    expect(dependencies.storage.saves).toBe(1);
    expect(dependencies.hasher.values).toEqual(["hello", "hello"]);
  });

  it("performs no Extraction, ID, Clock, or save when Registry already contains content", async () => {
    const document = makeImportedDocument();
    const snapshot: StorageSnapshot = {
      knowledge: { entities: [], relationships: [] },
      reviewSessions: [],
      importedDocuments: [document],
      importRegistry: {
        entries: [{
          contentSha256: hashA,
          documentId: document.id,
          firstImportedAt: document.importedAt,
        }],
      },
    };
    const storage = new SpyStorage(snapshot);
    const result = await importDocument(makeInput(), {
      storage,
      extractionAdapter: {
        async extract() {
          throw new Error("must not be called");
        },
      },
      hasher: new FixedHasher(),
      idGenerator: new CountingIdGenerator([]),
      clock: {
        now() {
          throw new Error("must not be called");
        },
      },
    });

    expect(result).toMatchObject({
      status: "already_imported",
      existingDocument: document,
      existingReviewSession: null,
    });
    expect(storage.saves).toBe(0);
  });

  it("rejects a dangling Registry without attempting repair", async () => {
    const dangling = createEmptyStorageSnapshot();
    dangling.importRegistry.entries.push({
      contentSha256: hashA,
      documentId: "missing",
      firstImportedAt: importedAt,
    });
    const storage: StorageAdapter = {
      async load() {
        return dangling;
      },
      async save() {
        throw new Error("must not save");
      },
    };

    await expectAsyncErrorCode(
      () => importDocument(makeInput(), {
        storage,
        extractionAdapter: new CountingExtractionAdapter(),
        hasher: new FixedHasher(),
        idGenerator: new CountingIdGenerator([]),
        clock: new CountingClock(),
      }),
      "IMPORT_REGISTRY_DANGLING_DOCUMENT",
    );
  });
});

describe("Import Service atomic failures", () => {
  async function expectUnchangedAfterFailure(
    adapter: ExtractionAdapter,
    code: string,
  ) {
    const storage = new SpyStorage();
    await expectAsyncErrorCode(
      () => importDocument(makeInput(), {
        storage,
        extractionAdapter: adapter,
        hasher: new FixedHasher(),
        idGenerator: new CountingIdGenerator(),
        clock: new CountingClock(),
      }),
      code,
    );
    expect(storage.saves).toBe(0);
    await expect(storage.memory.load()).resolves.toEqual(
      createEmptyStorageSnapshot(),
    );
  }

  it("does not save when Extraction throws", async () => {
    await expectUnchangedAfterFailure(
      { async extract() { throw new Error("offline"); } },
      "EXTRACTION_FAILED",
    );
  });

  it("does not save an invalid Candidate Bundle", async () => {
    await expectUnchangedAfterFailure(
      new CountingExtractionAdapter({ ...makeCandidateBundle(), extra: true }),
      "INVALID_CANDIDATE_BUNDLE",
    );
  });

  it("does not save a documentId mismatch", async () => {
    await expectUnchangedAfterFailure(
      new CountingExtractionAdapter(makeCandidateBundle("other-document")),
      "EXTRACTION_DOCUMENT_ID_MISMATCH",
    );
  });

  it("does not save when Review Session ID generation fails", async () => {
    const storage = new SpyStorage();
    await expect(
      importDocument(makeInput(), {
        storage,
        extractionAdapter: new CountingExtractionAdapter(),
        hasher: new FixedHasher(),
        idGenerator: new CountingIdGenerator(["document-1"]),
        clock: new CountingClock(),
      }),
    ).rejects.toThrow("ID_SEQUENCE_EXHAUSTED");
    expect(storage.saves).toBe(0);
    await expect(storage.memory.load()).resolves.toEqual(
      createEmptyStorageSnapshot(),
    );
  });

  it("converts Storage save failures", async () => {
    const storage: StorageAdapter = {
      async load() {
        return createEmptyStorageSnapshot();
      },
      async save() {
        throw new Error("disk full");
      },
    };

    await expectAsyncErrorCode(
      () => importDocument(makeInput(), {
        storage,
        extractionAdapter: new CountingExtractionAdapter(),
        hasher: new FixedHasher(),
        idGenerator: new CountingIdGenerator(),
        clock: new CountingClock(),
      }),
      "STORAGE_SAVE_FAILED",
    );
  });

  it("converts Storage load failures before issuing IDs or calling Extraction", async () => {
    const ids = new CountingIdGenerator();
    const extraction = new CountingExtractionAdapter();
    const storage: StorageAdapter = {
      async load() {
        throw new Error("unavailable");
      },
      async save() {
        throw new Error("must not save");
      },
    };

    await expectAsyncErrorCode(
      () => importDocument(makeInput(), {
        storage,
        extractionAdapter: extraction,
        hasher: new FixedHasher(),
        idGenerator: ids,
        clock: new CountingClock(),
      }),
      "STORAGE_LOAD_FAILED",
    );
    expect(ids.prefixes).toEqual([]);
    expect(extraction.calls).toBe(0);
  });

  it("validates JSON before hashing or loading Storage", async () => {
    const hasher = new FixedHasher();
    const storage = new SpyStorage();

    await expectAsyncErrorCode(
      () => importDocument(makeInput({ format: "json", content: "{bad}" }), {
        storage,
        extractionAdapter: new CountingExtractionAdapter(),
        hasher,
        idGenerator: new CountingIdGenerator(),
        clock: new CountingClock(),
      }),
      "INVALID_JSON_DOCUMENT",
    );
    expect(hasher.calls).toBe(0);
    expect(storage.loads).toBe(0);
  });

  it("rejects strict input extras without mutating input", async () => {
    const input = { ...makeInput(), unknown: true };
    const original = structuredClone(input);

    await expectAsyncErrorCode(
      () => importDocument(input as never, makeDependencies()),
      "INVALID_IMPORT_INPUT",
    );
    expect(input).toEqual(original);
  });

  it("rejects an invalid Hasher result before loading Storage", async () => {
    const dependencies = makeDependencies();
    dependencies.hasher = new FixedHasher("INVALID");

    await expectAsyncErrorCode(
      () => importDocument(makeInput(), dependencies),
      "INVALID_IMPORTED_DOCUMENT",
    );
    expect(dependencies.storage.loads).toBe(0);
    expect(dependencies.storage.saves).toBe(0);
  });
});
