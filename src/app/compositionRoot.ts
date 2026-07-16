import { FixtureExtractionAdapter } from "../core/import";
import { SystemClock, SequenceClock } from "../core/shared/clock";
import { CryptoIdGenerator, SequenceIdGenerator } from "../core/shared/idGenerator";
import { WebCryptoSha256Hasher } from "../core/shared/sha256";
import { LocalStorageAdapter, type StorageSnapshot } from "../core/storage";
import {
  loadProjectAstraFixture,
  projectAstraClockSequence,
  projectAstraIdSequence,
} from "../data/demo/project-astra";
import type { ApplicationDependencies } from "./state/types";
import { BrowserFileDownloadAdapter } from "./download/fileDownloadAdapter";

function collectStoredIds(snapshot: StorageSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const document of snapshot.importedDocuments) ids.add(document.id);
  for (const session of snapshot.reviewSessions) {
    ids.add(session.id);
    for (const entity of session.knowledge.entities) ids.add(entity.id);
    for (const relationship of session.knowledge.relationships) {
      ids.add(relationship.id);
    }
  }
  for (const entity of snapshot.knowledge.entities) ids.add(entity.id);
  for (const relationship of snapshot.knowledge.relationships) {
    ids.add(relationship.id);
  }
  return ids;
}

function collectStoredTimes(snapshot: StorageSnapshot): Set<string> {
  const times = new Set<string>();
  for (const document of snapshot.importedDocuments) times.add(document.importedAt);
  for (const application of snapshot.reviewApplications) {
    times.add(application.appliedAt);
  }
  for (const knowledge of [
    snapshot.knowledge,
    ...snapshot.reviewSessions.map((session) => session.knowledge),
  ]) {
    for (const entity of knowledge.entities) {
      times.add(entity.createdAt);
      times.add(entity.updatedAt);
    }
    for (const relationship of knowledge.relationships) {
      times.add(relationship.createdAt);
      times.add(relationship.updatedAt);
    }
  }
  return times;
}

export function createProjectAstraIdGenerator(
  snapshot: StorageSnapshot,
): SequenceIdGenerator {
  const used = collectStoredIds(snapshot);
  return new SequenceIdGenerator(
    projectAstraIdSequence.filter((id) => !used.has(id)),
  );
}

export function createProjectAstraClock(
  snapshot: StorageSnapshot,
): SequenceClock {
  const used = collectStoredTimes(snapshot);
  return new SequenceClock(
    projectAstraClockSequence.filter((timestamp) => !used.has(timestamp)),
  );
}

export function createBrowserApplicationDependencies(): ApplicationDependencies {
  const projectAstra = loadProjectAstraFixture();

  return {
    storage: new LocalStorageAdapter({ storage: window.localStorage }),
    extractionAdapter: new FixtureExtractionAdapter(
      projectAstra.sources.map((source) => ({
        contentSha256: source.contentSha256,
        candidateBundle: source.candidateBundle,
      })),
    ),
    hasher: new WebCryptoSha256Hasher(),
    idGenerator: new CryptoIdGenerator(),
    clock: new SystemClock(),
    projectAstra,
    fileDownloadAdapter: new BrowserFileDownloadAdapter(),
    exportDateProvider: () => new Date(),
    createProjectAstraIdGenerator,
    createProjectAstraClock,
  };
}
