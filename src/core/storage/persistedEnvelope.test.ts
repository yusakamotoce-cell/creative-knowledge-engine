import { describe, expect, it } from "vitest";

import {
  expectErrorCode,
  makeStorageSnapshot,
} from "../import/testSupport";
import { decodePersistedStorage } from "./migration";
import { encodePersistedStorage } from "./persistedEnvelope";

describe("Persisted Storage Envelope", () => {
  it("encodes and decodes the current v1 Snapshot", () => {
    const snapshot = makeStorageSnapshot();
    const raw = encodePersistedStorage(snapshot);

    expect(JSON.parse(raw)).toEqual({ schemaVersion: 1, snapshot });
    expect(decodePersistedStorage(raw)).toEqual(snapshot);
  });

  it("rejects invalid JSON", () => {
    expectErrorCode(
      () => decodePersistedStorage("{broken"),
      "INVALID_PERSISTED_JSON",
    );
  });

  it("rejects top-level unknown fields", () => {
    expectErrorCode(
      () =>
        decodePersistedStorage(JSON.stringify({
          schemaVersion: 1,
          snapshot: makeStorageSnapshot(),
          extra: true,
        })),
      "INVALID_PERSISTED_ENVELOPE",
    );
  });

  it("does not assume v1 when schemaVersion is missing", () => {
    expectErrorCode(
      () =>
        decodePersistedStorage(JSON.stringify({
          snapshot: makeStorageSnapshot(),
        })),
      "INVALID_PERSISTED_ENVELOPE",
    );
  });

  it("rejects unsupported integer versions without migration guesses", () => {
    expectErrorCode(
      () =>
        decodePersistedStorage(JSON.stringify({
          schemaVersion: 2,
          snapshot: makeStorageSnapshot(),
        })),
      "UNSUPPORTED_STORAGE_SCHEMA_VERSION",
    );
  });

  it("rejects an invalid v1 Snapshot through the current Schema", () => {
    const snapshot = makeStorageSnapshot() as unknown as Record<string, unknown>;
    delete snapshot.knowledgeRevision;

    expectErrorCode(
      () =>
        decodePersistedStorage(JSON.stringify({
          schemaVersion: 1,
          snapshot,
        })),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });

  it("does not modify the raw persisted string while decoding", () => {
    const raw = JSON.stringify({
      schemaVersion: 1,
      snapshot: makeStorageSnapshot(),
    });
    const original = `${raw}`;

    decodePersistedStorage(raw);

    expect(raw).toBe(original);
  });
});
