import { ImportDomainError } from "../import/errors";
import type { StorageAdapter } from "../storage/storageAdapter";
import type { ApplicationState } from "./types";

export async function initializeApplication(dependencies: {
  storage: StorageAdapter;
}): Promise<ApplicationState> {
  try {
    return { snapshot: await dependencies.storage.load() };
  } catch (cause) {
    throw new ImportDomainError("STORAGE_LOAD_FAILED", { cause });
  }
}
