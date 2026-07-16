export const storageErrorCodes = [
  "INVALID_STORAGE_SNAPSHOT",
  "DUPLICATE_IMPORTED_DOCUMENT_ID",
  "DUPLICATE_REVIEW_SESSION_ID",
  "DUPLICATE_IMPORT_HASH",
  "IMPORT_REGISTRY_DANGLING_DOCUMENT",
  "REVIEW_SESSION_DANGLING_DOCUMENT",
  "DUPLICATE_REVIEW_APPLICATION",
  "REVIEW_APPLICATION_DANGLING_SESSION",
  "INVALID_REVIEW_APPLICATION_REVISION",
  "INVALID_PERSISTED_JSON",
  "INVALID_PERSISTED_ENVELOPE",
  "UNSUPPORTED_STORAGE_SCHEMA_VERSION",
  "LOCAL_STORAGE_READ_FAILED",
  "LOCAL_STORAGE_WRITE_FAILED",
] as const;

export type StorageErrorCode = (typeof storageErrorCodes)[number];

export class StorageDomainError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, options?: { cause?: unknown }) {
    super(code, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "StorageDomainError";
    this.code = code;
  }
}
