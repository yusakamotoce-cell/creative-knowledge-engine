export const storageErrorCodes = [
  "INVALID_STORAGE_SNAPSHOT",
  "DUPLICATE_IMPORTED_DOCUMENT_ID",
  "DUPLICATE_REVIEW_SESSION_ID",
  "DUPLICATE_IMPORT_HASH",
  "IMPORT_REGISTRY_DANGLING_DOCUMENT",
  "REVIEW_SESSION_DANGLING_DOCUMENT",
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
