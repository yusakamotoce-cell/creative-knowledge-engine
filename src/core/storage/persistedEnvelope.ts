import { z } from "zod";

import type { StorageSnapshot } from "./storageAdapter";
import {
  parseStorageSnapshot,
  storageSnapshotSchema,
} from "./storageSchemas";

export const persistedStorageEnvelopeV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  snapshot: storageSnapshotSchema,
});

export const persistedStorageEnvelopeV1HeaderSchema = z.strictObject({
  schemaVersion: z.literal(1),
  snapshot: z.unknown(),
});

export interface PersistedStorageEnvelopeV1 {
  schemaVersion: 1;
  snapshot: StorageSnapshot;
}

export function encodePersistedStorage(snapshot: StorageSnapshot): string {
  const envelope: PersistedStorageEnvelopeV1 = {
    schemaVersion: 1,
    snapshot: parseStorageSnapshot(snapshot),
  };

  return JSON.stringify(envelope);
}
