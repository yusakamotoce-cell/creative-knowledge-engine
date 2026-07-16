import { StorageDomainError } from "./errors";
import { persistedStorageEnvelopeV1HeaderSchema } from "./persistedEnvelope";
import type { StorageSnapshot } from "./storageAdapter";
import { parseStorageSnapshot } from "./storageSchemas";

type StorageDecoder = (input: unknown) => StorageSnapshot;

function decodeV1(input: unknown): StorageSnapshot {
  const parsedEnvelope = persistedStorageEnvelopeV1HeaderSchema.safeParse(input);
  if (!parsedEnvelope.success) {
    throw new StorageDomainError("INVALID_PERSISTED_ENVELOPE", {
      cause: parsedEnvelope.error,
    });
  }

  return parseStorageSnapshot(parsedEnvelope.data.snapshot);
}

const migrations = new Map<number, StorageDecoder>([[1, decodeV1]]);

export function decodePersistedStorage(raw: string): StorageSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new StorageDomainError("INVALID_PERSISTED_JSON", { cause });
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    !("schemaVersion" in parsed) ||
    typeof parsed.schemaVersion !== "number" ||
    !Number.isInteger(parsed.schemaVersion)
  ) {
    throw new StorageDomainError("INVALID_PERSISTED_ENVELOPE");
  }

  const decoder = migrations.get(parsed.schemaVersion);
  if (decoder === undefined) {
    throw new StorageDomainError("UNSUPPORTED_STORAGE_SCHEMA_VERSION");
  }

  return decoder(parsed);
}
