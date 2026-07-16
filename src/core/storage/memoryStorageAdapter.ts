import type { StorageAdapter, StorageSnapshot } from "./storageAdapter";
import { createEmptyStorageSnapshot } from "./storageAdapter";
import { parseStorageSnapshot } from "./storageSchemas";

export class MemoryStorageAdapter implements StorageAdapter {
  #snapshot: StorageSnapshot;

  constructor(initialSnapshot: StorageSnapshot = createEmptyStorageSnapshot()) {
    this.#snapshot = parseStorageSnapshot(initialSnapshot);
  }

  async load(): Promise<StorageSnapshot> {
    return parseStorageSnapshot(this.#snapshot);
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    this.#snapshot = parseStorageSnapshot(snapshot);
  }
}
