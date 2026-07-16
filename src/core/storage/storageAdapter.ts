import type { ImportRegistry } from "../import/importRegistry";
import type { ImportedDocument } from "../import/importedDocument";
import type { KnowledgeState } from "../knowledge/knowledgeState";
import type { ReviewSession } from "../review/types";
import type { ReviewApplicationRecord } from "../application/types";

export interface StorageSnapshot {
  knowledge: KnowledgeState;
  knowledgeRevision: number;
  reviewSessions: ReviewSession[];
  reviewApplications: ReviewApplicationRecord[];
  importedDocuments: ImportedDocument[];
  importRegistry: ImportRegistry;
}

export interface StorageAdapter {
  load(): Promise<StorageSnapshot>;
  save(snapshot: StorageSnapshot): Promise<void>;
}

export function createEmptyStorageSnapshot(): StorageSnapshot {
  return {
    knowledge: { entities: [], relationships: [] },
    knowledgeRevision: 0,
    reviewSessions: [],
    reviewApplications: [],
    importedDocuments: [],
    importRegistry: { entries: [] },
  };
}
