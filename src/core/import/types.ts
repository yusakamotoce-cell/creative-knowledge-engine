export type {
  ImportDocumentInput,
  ImportedDocument,
  ImportFormat,
  ImportSourceKind,
} from "./importedDocument";
export type { ImportRegistry, ImportRegistryEntry } from "./importRegistry";

import type { CandidateBundle } from "../candidates/candidate";
import type { ReviewSession } from "../review/types";
import type { StorageSnapshot } from "../storage/storageAdapter";
import type { ImportedDocument } from "./importedDocument";

export type ImportDocumentResult =
  | {
      status: "imported";
      document: ImportedDocument;
      candidateBundle: CandidateBundle;
      reviewSession: ReviewSession;
      snapshot: StorageSnapshot;
    }
  | {
      status: "already_imported";
      existingDocument: ImportedDocument;
      existingReviewSession: ReviewSession | null;
      snapshot: StorageSnapshot;
    };
