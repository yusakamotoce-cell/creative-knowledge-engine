import { ImportDomainError } from "../import/errors";
import {
  createEmptyStorageSnapshot,
  type StorageAdapter,
  type StorageSnapshot,
} from "../storage/storageAdapter";

export async function resetWorkspace(dependencies: {
  storage: StorageAdapter;
}): Promise<StorageSnapshot> {
  const emptySnapshot = createEmptyStorageSnapshot();

  try {
    await dependencies.storage.save(emptySnapshot);
  } catch (cause) {
    throw new ImportDomainError("STORAGE_SAVE_FAILED", { cause });
  }

  return emptySnapshot;
}
