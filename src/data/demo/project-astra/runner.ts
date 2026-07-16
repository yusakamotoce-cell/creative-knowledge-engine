import {
  applyCompletedReviewSession,
  saveReviewSession,
} from "../../../core/application";
import { calculateKnowledgeInsights } from "../../../core/insights";
import {
  FixtureExtractionAdapter,
  importDocument,
} from "../../../core/import";
import {
  acceptEntityCandidate,
  acceptRelationshipCandidate,
  advanceToRelationshipReview,
  completeReviewSession,
  editEntityCandidate,
  mergeEntityCandidate,
  rejectEntityCandidate,
  rejectRelationshipCandidate,
} from "../../../core/review";
import { ReviewDomainError } from "../../../core/review/errors";
import { SequenceClock } from "../../../core/shared/clock";
import { SequenceIdGenerator } from "../../../core/shared/idGenerator";
import { WebCryptoSha256Hasher } from "../../../core/shared/sha256";
import { MemoryStorageAdapter } from "../../../core/storage";
import type { StorageSnapshot } from "../../../core/storage/storageAdapter";
import { ProjectAstraFixtureError } from "./errors";
import {
  assertProjectAstraSourceHashes,
  loadProjectAstraFixture,
  type ProjectAstraSourceFixture,
} from "./loader";

export const projectAstraIdSequence = [
  "astra-doc-001",
  "review-astra-001",
  "ent-astra-001",
  "ent-astra-002",
  "ent-astra-003",
  "ent-astra-004",
  "ent-astra-005",
  "rel-astra-001",
  "rel-astra-002",
  "rel-astra-003",
  "rel-astra-004",
  "astra-doc-002",
  "review-astra-002",
  "astra-doc-003",
  "review-astra-003",
  "ent-astra-006",
  "rel-astra-005",
  "astra-doc-004",
  "review-astra-004",
  "ent-astra-007",
] as const;

export const projectAstraClockSequence = [
  "2026-07-16T00:00:00.000Z",
  "2026-07-16T00:01:00.000Z",
  "2026-07-16T00:02:00.000Z",
  "2026-07-16T00:03:00.000Z",
  "2026-07-16T00:04:00.000Z",
  "2026-07-16T00:05:00.000Z",
  "2026-07-16T00:06:00.000Z",
  "2026-07-16T00:07:00.000Z",
  "2026-07-16T00:08:00.000Z",
  "2026-07-16T00:09:00.000Z",
  "2026-07-16T00:10:00.000Z",
  "2026-07-16T00:11:00.000Z",
  "2026-07-16T00:12:00.000Z",
  "2026-07-16T00:13:00.000Z",
  "2026-07-16T00:14:00.000Z",
  "2026-07-16T00:15:00.000Z",
  "2026-07-16T00:16:00.000Z",
  "2026-07-16T00:17:00.000Z",
  "2026-07-16T00:18:00.000Z",
  "2026-07-16T00:19:00.000Z",
  "2026-07-16T00:20:00.000Z",
  "2026-07-16T00:21:00.000Z",
  "2026-07-16T00:22:00.000Z",
] as const;

async function importFixtureSource(
  source: ProjectAstraSourceFixture,
  dependencies: Parameters<typeof importDocument>[1],
) {
  const result = await importDocument(
    {
      sourceKind: "file",
      format: source.format,
      fileName: source.fileName,
      mediaType: source.mediaType,
      content: source.content,
    },
    dependencies,
  );

  if (result.status !== "imported") {
    throw new ProjectAstraFixtureError("IMPORT_DID_NOT_CREATE_SESSION");
  }
  if (result.reviewSession.id !== source.reviewSessionId) {
    throw new ProjectAstraFixtureError("IMPORT_DID_NOT_CREATE_SESSION");
  }

  return result.reviewSession;
}

function requireDuplicate(
  session: ReturnType<typeof acceptEntityCandidate>,
  candidateId: string,
  entityId: string,
): void {
  const review = session.entityReviews.find(
    (candidate) => candidate.candidateId === candidateId,
  );
  if (!review?.duplicateEntityIds.includes(entityId)) {
    throw new ProjectAstraFixtureError("EXPECTED_DUPLICATE_NOT_FOUND");
  }
}

export async function runProjectAstraFixture(): Promise<{
  snapshot: StorageSnapshot;
  insights: ReturnType<typeof calculateKnowledgeInsights>;
}> {
  const fixture = loadProjectAstraFixture();
  const storage = new MemoryStorageAdapter();
  const hasher = new WebCryptoSha256Hasher();
  const idGenerator = new SequenceIdGenerator(projectAstraIdSequence);
  const clock = new SequenceClock(projectAstraClockSequence);
  const extractionAdapter = new FixtureExtractionAdapter(
    fixture.sources.map((source) => ({
      contentSha256: source.contentSha256,
      candidateBundle: source.candidateBundle,
    })),
  );
  const importDependencies = {
    storage,
    extractionAdapter,
    hasher,
    idGenerator,
    clock,
  };

  await assertProjectAstraSourceHashes(fixture, hasher);

  let session = await importFixtureSource(
    fixture.sources[0] as ProjectAstraSourceFixture,
    importDependencies,
  );
  for (const candidateId of [
    "cand-astra-001-nova",
    "cand-astra-001-corps",
    "cand-astra-001-observatory",
    "cand-astra-001-briefing",
    "cand-astra-001-compass",
  ]) {
    session = acceptEntityCandidate(session, candidateId, {
      idGenerator,
      clock,
    });
  }
  session = advanceToRelationshipReview(session);
  for (const candidateId of [
    "relcand-astra-001-member",
    "relcand-astra-001-carries",
    "relcand-astra-001-appears",
    "relcand-astra-001-located",
  ]) {
    session = acceptRelationshipCandidate(session, candidateId, {
      idGenerator,
      clock,
    });
  }
  session = completeReviewSession(session);
  await saveReviewSession(session.id, session, { storage });
  await applyCompletedReviewSession(
    { reviewSessionId: session.id },
    { storage, clock },
  );

  session = await importFixtureSource(
    fixture.sources[1] as ProjectAstraSourceFixture,
    importDependencies,
  );
  requireDuplicate(session, "cand-astra-002-nova", "ent-astra-001");
  session = mergeEntityCandidate(
    session,
    "cand-astra-002-nova",
    "ent-astra-001",
    {},
    { clock },
  );
  session = editEntityCandidate(session, "cand-astra-002-observatory", {
    name: "Northstar Observatory",
  });
  requireDuplicate(session, "cand-astra-002-observatory", "ent-astra-003");
  session = mergeEntityCandidate(
    session,
    "cand-astra-002-observatory",
    "ent-astra-003",
    {},
    { clock },
  );
  session = advanceToRelationshipReview(session);
  session = acceptRelationshipCandidate(session, "relcand-astra-002-member", {
    idGenerator,
    clock,
  });
  session = completeReviewSession(session);
  await saveReviewSession(session.id, session, { storage });
  await applyCompletedReviewSession(
    { reviewSessionId: session.id },
    { storage, clock },
  );

  session = await importFixtureSource(
    fixture.sources[2] as ProjectAstraSourceFixture,
    importDependencies,
  );
  requireDuplicate(session, "cand-astra-003-unknown-nova", "ent-astra-001");
  session = acceptEntityCandidate(session, "cand-astra-003-unknown-nova", {
    idGenerator,
    clock,
  });
  session = advanceToRelationshipReview(session);
  session = acceptRelationshipCandidate(session, "relcand-astra-003-appears", {
    idGenerator,
    clock,
  });
  session = completeReviewSession(session);
  await saveReviewSession(session.id, session, { storage });
  await applyCompletedReviewSession(
    { reviewSessionId: session.id },
    { storage, clock },
  );

  session = await importFixtureSource(
    fixture.sources[3] as ProjectAstraSourceFixture,
    importDependencies,
  );
  session = acceptEntityCandidate(session, "cand-astra-004-prism", {
    idGenerator,
    clock,
  });
  session = rejectEntityCandidate(session, "cand-astra-004-royal-key");
  session = advanceToRelationshipReview(session);
  const blockedReview = session.relationshipReviews.find(
    (review) => review.candidateId === "relcand-astra-004-points",
  );
  if (
    blockedReview?.status !== "blocked" ||
    blockedReview.blockedReason !== "unresolved_to"
  ) {
    throw new ProjectAstraFixtureError(
      "EXPECTED_BLOCKED_RELATIONSHIP_NOT_FOUND",
    );
  }
  try {
    acceptRelationshipCandidate(session, "relcand-astra-004-points", {
      idGenerator,
      clock,
    });
    throw new ProjectAstraFixtureError("BLOCKED_RELATIONSHIP_ACCEPTED");
  } catch (error) {
    if (
      !(error instanceof ReviewDomainError) ||
      error.code !== "RELATIONSHIP_BLOCKED"
    ) {
      throw error;
    }
  }
  session = rejectRelationshipCandidate(
    session,
    "relcand-astra-004-points",
  );
  session = completeReviewSession(session);
  await saveReviewSession(session.id, session, { storage });
  await applyCompletedReviewSession(
    { reviewSessionId: session.id },
    { storage, clock },
  );

  if (idGenerator.remainingCount !== 0 || clock.remainingCount !== 0) {
    throw new ProjectAstraFixtureError("FIXED_SEQUENCE_NOT_EXHAUSTED");
  }

  const snapshot = await storage.load();
  return {
    snapshot,
    insights: calculateKnowledgeInsights(snapshot.knowledge),
  };
}
