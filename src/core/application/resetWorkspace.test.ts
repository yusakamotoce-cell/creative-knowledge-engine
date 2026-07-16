import { describe, expect, it } from "vitest";

import { expectAsyncErrorCode, makeStorageSnapshot } from "../import/testSupport";
import { MemoryStorageAdapter } from "../storage/memoryStorageAdapter";
import type {
  StorageAdapter,
  StorageSnapshot,
} from "../storage/storageAdapter";
import { createEmptyStorageSnapshot } from "../storage/storageAdapter";
import { resetWorkspace } from "./resetWorkspace";

class SpyStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  saves = 0;
  failSave = false;

  constructor(snapshot: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  load(): Promise<StorageSnapshot> {
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.saves += 1;
    if (this.failSave) throw new Error("save failed");
    await this.memory.save(snapshot);
  }
}

describe("resetWorkspace", () => {
  it("saves and returns one empty Snapshot", async () => {
    const storage = new SpyStorage(makeStorageSnapshot());

    const result = await resetWorkspace({ storage });

    expect(result).toEqual(createEmptyStorageSnapshot());
    expect(storage.saves).toBe(1);
    await expect(storage.load()).resolves.toEqual(result);
  });

  it("preserves the current state when save fails", async () => {
    const initial = makeStorageSnapshot();
    const storage = new SpyStorage(initial);
    storage.failSave = true;

    await expectAsyncErrorCode(
      () => resetWorkspace({ storage }),
      "STORAGE_SAVE_FAILED",
    );
    expect(storage.saves).toBe(1);
    await expect(storage.load()).resolves.toEqual(initial);
  });
});
