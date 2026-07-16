import {
  candidateBundleSchema,
  type CandidateBundle,
} from "../candidates/candidate";
import type { ImportedDocument } from "./importedDocument";
import { ImportDomainError } from "./errors";

export interface ExtractionAdapter {
  extract(document: ImportedDocument): Promise<unknown>;
}

export async function extractCandidateBundle(
  adapter: ExtractionAdapter,
  document: ImportedDocument,
): Promise<CandidateBundle> {
  let output: unknown;

  try {
    output = await adapter.extract(document);
  } catch (cause) {
    throw new ImportDomainError("EXTRACTION_FAILED", { cause });
  }

  const parsed = candidateBundleSchema.safeParse(output);
  if (!parsed.success) {
    throw new ImportDomainError("INVALID_CANDIDATE_BUNDLE", {
      cause: parsed.error,
    });
  }

  if (parsed.data.documentId !== document.id) {
    throw new ImportDomainError("EXTRACTION_DOCUMENT_ID_MISMATCH");
  }

  return parsed.data;
}
