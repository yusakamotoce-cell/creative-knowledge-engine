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
import type {
  FileDownloadAdapter,
  FileDownloadInput,
} from "./download/fileDownloadAdapter";
import type { ExtractionAdapter } from "../core/import";
import { LiveExtractionAdapterError } from "./extraction";

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
  overrides: Partial<
    Pick<
      ApplicationDependencies,
      "fileDownloadAdapter" | "exportDateProvider" | "liveExtractionAdapter"
    >
  > = {},
): ApplicationDependencies {
  const projectAstra = loadProjectAstraFixture();
  return {
    storage,
    fixtureExtractionAdapter: new FixtureExtractionAdapter(
      projectAstra.sources.map((source) => ({
        contentSha256: source.contentSha256,
        candidateBundle: source.candidateBundle,
      })),
    ),
    liveExtractionAdapter:
      overrides.liveExtractionAdapter ?? new UnavailableLiveExtractionAdapter(),
    hasher: new WebCryptoSha256Hasher(),
    idGenerator: new SequenceIdGenerator(arbitraryIds),
    clock: new SequenceClock(arbitraryTimes),
    projectAstra,
    fileDownloadAdapter: overrides.fileDownloadAdapter ?? {
      downloadText: () => undefined,
    },
    exportDateProvider:
      overrides.exportDateProvider ?? (() => new Date(2026, 6, 16)),
    createProjectAstraIdGenerator,
    createProjectAstraClock,
  };
}

class UnavailableLiveExtractionAdapter implements ExtractionAdapter {
  extract(): Promise<unknown> {
    return Promise.reject(
      new LiveExtractionAdapterError("LIVE_AI_UNAVAILABLE"),
    );
  }
}

export class RecordingFileDownloadAdapter implements FileDownloadAdapter {
  downloads: FileDownloadInput[] = [];

  downloadText(input: FileDownloadInput): void {
    this.downloads.push({ ...input });
  }
}
