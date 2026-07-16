import type { CandidateBundle } from "../candidates/candidate";
import { createReviewSession } from "../review/reviewSession";
import { SequenceIdGenerator } from "../shared/idGenerator";
import type { Sha256Hasher } from "../shared/sha256";
import type { StorageSnapshot } from "../storage/storageAdapter";
import type { ImportedDocument } from "./importedDocument";

export const hashA = "a".repeat(64);
export const hashB = "b".repeat(64);
export const importedAt = "2026-07-16T08:00:00.000Z";

export function makeImportedDocument(
  overrides: Partial<ImportedDocument> = {},
): ImportedDocument {
  return {
    id: "document-1",
    sourceKind: "file",
    format: "plain_text",
    fileName: "story.txt",
    mediaType: "text/plain",
    content: "hello",
    contentSha256: hashA,
    importedAt,
    ...overrides,
  };
}

export function makeCandidateBundle(documentId = "document-1"): CandidateBundle {
  return {
    schemaVersion: 1,
    documentId,
    entities: [],
    relationships: [],
  };
}

export function makeStorageSnapshot(): StorageSnapshot {
  const document = makeImportedDocument();
  const reviewSession = createReviewSession(
    {
      bundle: makeCandidateBundle(document.id),
      initialKnowledge: { entities: [], relationships: [] },
    },
    { idGenerator: new SequenceIdGenerator(["review-session-1"]) },
  );

  return {
    knowledge: { entities: [], relationships: [] },
    reviewSessions: [reviewSession],
    importedDocuments: [document],
    importRegistry: {
      entries: [
        {
          contentSha256: document.contentSha256,
          documentId: document.id,
          firstImportedAt: document.importedAt,
        },
      ],
    },
  };
}

export class FixedHasher implements Sha256Hasher {
  readonly #hash: string;
  calls = 0;
  readonly values: string[] = [];

  constructor(hash = hashA) {
    this.#hash = hash;
  }

  async hashUtf8(value: string): Promise<string> {
    this.calls += 1;
    this.values.push(value);
    return this.#hash;
  }
}

export function expectErrorCode(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    ) {
      return;
    }
    throw new Error(`Expected error code ${code}`, { cause: error });
  }

  throw new Error(`Expected error code ${code}`);
}

export async function expectAsyncErrorCode(
  action: () => Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    ) {
      return;
    }
    throw new Error(`Expected error code ${code}`, { cause: error });
  }

  throw new Error(`Expected error code ${code}`);
}
