import { StorageDomainError } from "./errors";
import { decodePersistedStorage } from "./migration";
import { encodePersistedStorage } from "./persistedEnvelope";
import {
  createEmptyStorageSnapshot,
  type StorageAdapter,
  type StorageSnapshot,
} from "./storageAdapter";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const defaultLocalStorageKey =
  "creative-knowledge-engine:storage:v1";

export class LocalStorageAdapter implements StorageAdapter {
  readonly #storage: KeyValueStorage;
  readonly #key: string;

  constructor(input: { storage: KeyValueStorage; key?: string }) {
    this.#storage = input.storage;
    this.#key = input.key ?? defaultLocalStorageKey;
  }

  async load(): Promise<StorageSnapshot> {
    let raw: string | null;
    try {
      raw = this.#storage.getItem(this.#key);
    } catch (cause) {
      throw new StorageDomainError("LOCAL_STORAGE_READ_FAILED", { cause });
    }

    return raw === null
      ? createEmptyStorageSnapshot()
      : decodePersistedStorage(raw);
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    const encoded = encodePersistedStorage(snapshot);

    try {
      this.#storage.setItem(this.#key, encoded);
    } catch (cause) {
      throw new StorageDomainError("LOCAL_STORAGE_WRITE_FAILED", { cause });
    }
  }
}
