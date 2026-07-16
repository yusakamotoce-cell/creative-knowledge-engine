import { ImportDomainError } from "../import/errors";
import { knowledgeStateSchema } from "../knowledge/knowledgeState";
import type { Clock } from "../shared/clock";
import type { StorageAdapter } from "../storage/storageAdapter";
import { ApplicationDomainError } from "./errors";
import {
  reviewApplicationRecordSchema,
  type ApplyReviewSessionResult,
} from "./types";

async function loadSnapshot(storage: StorageAdapter) {
  try {
    return await storage.load();
  } catch (cause) {
    throw new ImportDomainError("STORAGE_LOAD_FAILED", { cause });
  }
}

export async function applyCompletedReviewSession(
  input: { reviewSessionId: string },
  dependencies: { storage: StorageAdapter; clock: Clock },
): Promise<ApplyReviewSessionResult> {
  const snapshot = await loadSnapshot(dependencies.storage);
  const session = snapshot.reviewSessions.find(
    (candidate) => candidate.id === input.reviewSessionId,
  );

  if (session === undefined) {
    throw new ApplicationDomainError("REVIEW_SESSION_NOT_FOUND", {
      reviewSessionId: input.reviewSessionId,
    });
  }

  const existingApplication = snapshot.reviewApplications.find(
    (application) => application.reviewSessionId === session.id,
  );
  if (existingApplication !== undefined) {
    return {
      status: "already_applied",
      reviewSessionId: session.id,
      application: existingApplication,
      snapshot,
    };
  }

  if (session.phase !== "complete") {
    throw new ApplicationDomainError("REVIEW_SESSION_NOT_COMPLETE", {
      reviewSessionId: session.id,
    });
  }

  if (session.baseKnowledgeRevision !== snapshot.knowledgeRevision) {
    throw new ApplicationDomainError("KNOWLEDGE_REVISION_CONFLICT", {
      reviewSessionId: session.id,
      expectedRevision: session.baseKnowledgeRevision,
      actualRevision: snapshot.knowledgeRevision,
    });
  }

  const nextRevision = snapshot.knowledgeRevision + 1;
  const application = reviewApplicationRecordSchema.parse({
    reviewSessionId: session.id,
    appliedAt: dependencies.clock.now(),
    fromKnowledgeRevision: snapshot.knowledgeRevision,
    toKnowledgeRevision: nextRevision,
  });
  const knowledge = knowledgeStateSchema.parse(session.knowledge);
  const nextSnapshot = {
    ...snapshot,
    knowledge,
    knowledgeRevision: nextRevision,
    reviewApplications: [...snapshot.reviewApplications, application],
  };

  try {
    await dependencies.storage.save(nextSnapshot);
  } catch (cause) {
    throw new ImportDomainError("STORAGE_SAVE_FAILED", { cause });
  }

  return {
    status: "applied",
    reviewSessionId: session.id,
    knowledge,
    knowledgeRevision: nextRevision,
    application,
    snapshot: nextSnapshot,
  };
}
