import { describe, expect, it } from "vitest";

import {
  expectAsyncErrorCode,
  makeStorageSnapshot,
} from "../import/testSupport";
import {
  defaultLocalStorageKey,
  LocalStorageAdapter,
  type KeyValueStorage,
} from "./localStorageAdapter";
import { encodePersistedStorage } from "./persistedEnvelope";

class FakeKeyValueStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  getCalls: string[] = [];
  setCalls: Array<{ key: string; value: string }> = [];
  removeCalls: string[] = [];
  getError: unknown;
  setError: unknown;

  getItem(key: string): string | null {
    this.getCalls.push(key);
    if (this.getError !== undefined) throw this.getError;
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls.push({ key, value });
    if (this.setError !== undefined) throw this.setError;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removeCalls.push(key);
    this.values.delete(key);
  }
}

describe("LocalStorageAdapter", () => {
  it("uses the default key", async () => {
    const storage = new FakeKeyValueStorage();
    const adapter = new LocalStorageAdapter({ storage });

    await adapter.load();
    await adapter.save(makeStorageSnapshot());

    expect(storage.getCalls).toEqual([defaultLocalStorageKey]);
    expect(storage.setCalls[0]?.key).toBe(defaultLocalStorageKey);
  });

  it("uses a custom key", async () => {
    const storage = new FakeKeyValueStorage();
    const adapter = new LocalStorageAdapter({ storage, key: "custom" });

    await adapter.save(makeStorageSnapshot());
    await adapter.load();

    expect(storage.setCalls[0]?.key).toBe("custom");
    expect(storage.getCalls).toEqual(["custom"]);
  });

  it("wraps getItem errors with a Local Storage code and cause", async () => {
    const storage = new FakeKeyValueStorage();
    const cause = new Error("security");
    storage.getError = cause;

    try {
      await new LocalStorageAdapter({ storage }).load();
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({
        code: "LOCAL_STORAGE_READ_FAILED",
        cause,
      });
    }
  });

  it("wraps setItem quota or security errors", async () => {
    const storage = new FakeKeyValueStorage();
    storage.setError = new Error("quota");

    await expectAsyncErrorCode(
      () => new LocalStorageAdapter({ storage }).save(makeStorageSnapshot()),
      "LOCAL_STORAGE_WRITE_FAILED",
    );
  });

  it.each([
    ["{broken", "INVALID_PERSISTED_JSON"],
    [JSON.stringify({ schemaVersion: 2, snapshot: {} }), "UNSUPPORTED_STORAGE_SCHEMA_VERSION"],
    [JSON.stringify({ schemaVersion: 1, snapshot: {} }), "INVALID_STORAGE_SNAPSHOT"],
  ])("rejects corrupt persisted data with %s", async (raw, code) => {
    const storage = new FakeKeyValueStorage();
    storage.values.set(defaultLocalStorageKey, raw);

    await expectAsyncErrorCode(
      () => new LocalStorageAdapter({ storage }).load(),
      code,
    );
    expect(storage.setCalls).toEqual([]);
    expect(storage.removeCalls).toEqual([]);
    expect(storage.values.get(defaultLocalStorageKey)).toBe(raw);
  });

  it("does not call setItem for an invalid Snapshot", async () => {
    const storage = new FakeKeyValueStorage();
    const invalid = makeStorageSnapshot();
    invalid.knowledgeRevision = -1;

    await expectAsyncErrorCode(
      () => new LocalStorageAdapter({ storage }).save(invalid),
      "INVALID_STORAGE_SNAPSHOT",
    );
    expect(storage.setCalls).toEqual([]);
  });

  it("loads a separately decoded copy on every call", async () => {
    const storage = new FakeKeyValueStorage();
    storage.values.set(
      defaultLocalStorageKey,
      encodePersistedStorage(makeStorageSnapshot()),
    );
    const adapter = new LocalStorageAdapter({ storage });
    const first = await adapter.load();
    first.importedDocuments[0]!.fileName = "mutated.txt";

    expect((await adapter.load()).importedDocuments[0]?.fileName).toBe(
      "story.txt",
    );
  });
});
