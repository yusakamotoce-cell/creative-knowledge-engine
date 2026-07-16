import type { ImportRegistry } from "../import/importRegistry";
import type { ImportedDocument } from "../import/importedDocument";
import type { KnowledgeState } from "../knowledge/knowledgeState";
import type { ReviewSession } from "../review/types";

export interface StorageSnapshot {
  knowledge: KnowledgeState;
  reviewSessions: ReviewSession[];
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
    reviewSessions: [],
    importedDocuments: [],
    importRegistry: { entries: [] },
  };
}
