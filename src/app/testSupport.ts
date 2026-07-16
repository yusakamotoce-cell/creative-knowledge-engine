import { FixtureExtractionAdapter } from "../core/import";
import { SequenceClock } from "../core/shared/clock";
import { SequenceIdGenerator } from "../core/shared/idGenerator";
import { WebCryptoSha256Hasher } from "../core/shared/sha256";
import { MemoryStorageAdapter } from "../core/storage";
import type { StorageAdapter } from "../core/storage";
import { loadProjectAstraFixture } from "../data/demo/project-astra";
import {
  createProjectAstraClock,
  createProjectAstraIdGenerator,
} from "./compositionRoot";
import type { ApplicationDependencies } from "./state/types";

const arbitraryIds = Array.from(
  { length: 20 },
  (_, index) => `test-id-${index + 1}`,
);
const arbitraryTimes = Array.from(
  { length: 20 },
  (_, index) => `2027-01-01T00:${String(index).padStart(2, "0")}:00.000Z`,
);

export function createTestApplicationDependencies(
  storage: StorageAdapter = new MemoryStorageAdapter(),
): ApplicationDependencies {
  const projectAstra = loadProjectAstraFixture();
  return {
    storage,
    extractionAdapter: new FixtureExtractionAdapter(
      projectAstra.sources.map((source) => ({
        contentSha256: source.contentSha256,
        candidateBundle: source.candidateBundle,
      })),
    ),
    hasher: new WebCryptoSha256Hasher(),
    idGenerator: new SequenceIdGenerator(arbitraryIds),
    clock: new SequenceClock(arbitraryTimes),
    projectAstra,
    createProjectAstraIdGenerator,
    createProjectAstraClock,
  };
}
