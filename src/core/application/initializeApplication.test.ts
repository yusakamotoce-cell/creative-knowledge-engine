import { describe, expect, it } from "vitest";

import {
  expectAsyncErrorCode,
  makeStorageSnapshot,
} from "../import/testSupport";
import {
  defaultLocalStorageKey,
  LocalStorageAdapter,
  type KeyValueStorage,
} from "../storage/localStorageAdapter";
import { MemoryStorageAdapter } from "../storage/memoryStorageAdapter";
import {
  createEmptyStorageSnapshot,
  type StorageAdapter,
  type StorageSnapshot,
} from "../storage/storageAdapter";
import { initializeApplication } from "./initializeApplication";

class FakeStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();
  sets = 0;
  removes = 0;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.sets += 1;
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removes += 1;
    this.values.delete(key);
  }
}

describe("initializeApplication", () => {
  it("loads an existing Memory Snapshot", async () => {
    const snapshot = makeStorageSnapshot();
    const state = await initializeApplication({
      storage: new MemoryStorageAdapter(snapshot),
    });

    expect(state.snapshot).toEqual(snapshot);
  });

  it("loads an existing Local Storage Snapshot", async () => {
    const keyValue = new FakeStorage();
    const storage = new LocalStorageAdapter({ storage: keyValue });
    const snapshot = makeStorageSnapshot();
    await storage.save(snapshot);

    await expect(initializeApplication({ storage })).resolves.toEqual({
      snapshot,
    });
  });

  it("returns the empty Snapshot for empty Local Storage", async () => {
    const storage = new LocalStorageAdapter({ storage: new FakeStorage() });

    await expect(initializeApplication({ storage })).resolves.toEqual({
      snapshot: createEmptyStorageSnapshot(),
    });
  });

  it("loads exactly once and never saves", async () => {
    let loads = 0;
    let saves = 0;
    const storage: StorageAdapter = {
      async load() {
        loads += 1;
        return createEmptyStorageSnapshot();
      },
      async save() {
        saves += 1;
      },
    };

    await initializeApplication({ storage });

    expect(loads).toBe(1);
    expect(saves).toBe(0);
  });

  it("does not let returned-state mutation change persisted data", async () => {
    const storage = new MemoryStorageAdapter(makeStorageSnapshot());
    const state = await initializeApplication({ storage });
    state.snapshot.importedDocuments[0]!.fileName = "mutated.txt";

    expect((await storage.load()).importedDocuments[0]?.fileName).toBe(
      "story.txt",
    );
  });

  it("wraps corrupt Local Storage without resetting or overwriting it", async () => {
    const keyValue = new FakeStorage();
    const raw = "{broken";
    keyValue.values.set(defaultLocalStorageKey, raw);
    const storage = new LocalStorageAdapter({ storage: keyValue });

    await expectAsyncErrorCode(
      () => initializeApplication({ storage }),
      "STORAGE_LOAD_FAILED",
    );
    expect(keyValue.values.get(defaultLocalStorageKey)).toBe(raw);
    expect(keyValue.sets).toBe(0);
    expect(keyValue.removes).toBe(0);
  });

  it("wraps arbitrary Storage load errors", async () => {
    const storage: StorageAdapter = {
      async load(): Promise<StorageSnapshot> {
        throw new Error("offline");
      },
      async save() {
        throw new Error("must not save");
      },
    };

    await expectAsyncErrorCode(
      () => initializeApplication({ storage }),
      "STORAGE_LOAD_FAILED",
    );
  });
});
