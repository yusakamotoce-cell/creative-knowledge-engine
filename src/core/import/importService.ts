import type { Clock } from "../shared/clock";
import type { IdGenerator } from "../shared/idGenerator";
import { sha256HexSchema, type Sha256Hasher } from "../shared/sha256";
import { createReviewSession } from "../review/reviewSession";
import type { StorageAdapter } from "../storage/storageAdapter";
import { StorageDomainError } from "../storage/errors";
import { ImportDomainError } from "./errors";
import {
  extractCandidateBundle,
  type ExtractionAdapter,
} from "./extractionAdapter";
import {
  validateImportedDocument,
  validateImportDocumentInput,
  type ImportDocumentInput,
} from "./importedDocument";
import {
  findImportRegistryEntry,
  registerImportedDocument,
} from "./importRegistry";
import type { ImportDocumentResult } from "./types";

export interface ImportDocumentDependencies {
  storage: StorageAdapter;
  extractionAdapter: ExtractionAdapter;
  hasher: Sha256Hasher;
  idGenerator: IdGenerator;
  clock: Clock;
}

async function loadSnapshot(storage: StorageAdapter) {
  try {
    return await storage.load();
  } catch (cause) {
    throw new ImportDomainError("STORAGE_LOAD_FAILED", { cause });
  }
}

export async function importDocument(
  input: ImportDocumentInput,
  dependencies: ImportDocumentDependencies,
): Promise<ImportDocumentResult> {
  const parsedInput = validateImportDocumentInput(input);
  const hashResult = await dependencies.hasher.hashUtf8(parsedInput.content);
  const parsedHash = sha256HexSchema.safeParse(hashResult);
  if (!parsedHash.success) {
    throw new ImportDomainError("INVALID_IMPORTED_DOCUMENT", {
      cause: parsedHash.error,
    });
  }
  const contentSha256 = parsedHash.data;
  const snapshot = await loadSnapshot(dependencies.storage);
  const existingEntry = findImportRegistryEntry(
    snapshot.importRegistry,
    contentSha256,
  );

  if (existingEntry !== null) {
    const existingDocument = snapshot.importedDocuments.find(
      (document) => document.id === existingEntry.documentId,
    );

    if (existingDocument === undefined) {
      throw new StorageDomainError("IMPORT_REGISTRY_DANGLING_DOCUMENT");
    }

    return {
      status: "already_imported",
      existingDocument,
      existingReviewSession:
        snapshot.reviewSessions.find(
          (session) => session.documentId === existingDocument.id,
        ) ?? null,
      snapshot,
    };
  }

  const document = validateImportedDocument({
    id: dependencies.idGenerator.nextId("document"),
    ...parsedInput,
    contentSha256,
    importedAt: dependencies.clock.now(),
  });
  const candidateBundle = await extractCandidateBundle(
    dependencies.extractionAdapter,
    document,
  );
  const reviewSession = createReviewSession(
    {
      bundle: candidateBundle,
      initialKnowledge: snapshot.knowledge,
      baseKnowledgeRevision: snapshot.knowledgeRevision,
    },
    { idGenerator: dependencies.idGenerator },
  );
  const nextSnapshot = {
    ...snapshot,
    reviewSessions: [...snapshot.reviewSessions, reviewSession],
    importedDocuments: [...snapshot.importedDocuments, document],
    importRegistry: registerImportedDocument(snapshot.importRegistry, document),
  };

  try {
    await dependencies.storage.save(nextSnapshot);
  } catch (cause) {
    throw new ImportDomainError("STORAGE_SAVE_FAILED", { cause });
  }

  return {
    status: "imported",
    document,
    candidateBundle,
    reviewSession,
    snapshot: nextSnapshot,
  };
}
