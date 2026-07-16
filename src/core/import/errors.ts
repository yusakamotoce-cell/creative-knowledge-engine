export const importErrorCodes = [
  "INVALID_IMPORT_INPUT",
  "EMPTY_DOCUMENT_CONTENT",
  "INVALID_JSON_DOCUMENT",
  "INVALID_IMPORTED_DOCUMENT",
  "EXTRACTION_FAILED",
  "INVALID_CANDIDATE_BUNDLE",
  "EXTRACTION_DOCUMENT_ID_MISMATCH",
  "FIXTURE_NOT_FOUND",
  "DUPLICATE_FIXTURE_HASH",
  "STORAGE_LOAD_FAILED",
  "STORAGE_SAVE_FAILED",
] as const;

export type ImportErrorCode = (typeof importErrorCodes)[number];

export class ImportDomainError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, options?: { cause?: unknown }) {
    super(code, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ImportDomainError";
    this.code = code;
  }
}
