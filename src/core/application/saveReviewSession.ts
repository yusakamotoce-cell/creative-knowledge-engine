import { ImportDomainError } from "../import/errors";
import { reviewSessionSchema, type ReviewSession } from "../review/types";
import type { StorageAdapter, StorageSnapshot } from "../storage/storageAdapter";
import { ApplicationDomainError } from "./errors";

async function loadSnapshot(storage: StorageAdapter): Promise<StorageSnapshot> {
  try {
    return await storage.load();
  } catch (cause) {
    throw new ImportDomainError("STORAGE_LOAD_FAILED", { cause });
  }
}

export async function saveReviewSession(
  sessionId: string,
  updatedSession: ReviewSession,
  dependencies: { storage: StorageAdapter },
): Promise<StorageSnapshot> {
  const parsedSession = reviewSessionSchema.safeParse(updatedSession);
  if (!parsedSession.success) {
    throw new ApplicationDomainError("INVALID_REVIEW_SESSION");
  }
  if (parsedSession.data.id !== sessionId) {
    throw new ApplicationDomainError("REVIEW_SESSION_ID_MISMATCH", {
      reviewSessionId: sessionId,
    });
  }

  const snapshot = await loadSnapshot(dependencies.storage);
  const sessionIndex = snapshot.reviewSessions.findIndex(
    (session) => session.id === sessionId,
  );
  const existingSession = snapshot.reviewSessions[sessionIndex];
  if (existingSession === undefined) {
    throw new ApplicationDomainError("REVIEW_SESSION_NOT_FOUND", {
      reviewSessionId: sessionId,
    });
  }
  if (parsedSession.data.documentId !== existingSession.documentId) {
    throw new ApplicationDomainError("REVIEW_SESSION_DOCUMENT_ID_CHANGED", {
      reviewSessionId: sessionId,
    });
  }
  if (
    parsedSession.data.baseKnowledgeRevision !==
    existingSession.baseKnowledgeRevision
  ) {
    throw new ApplicationDomainError("REVIEW_SESSION_BASE_REVISION_CHANGED", {
      reviewSessionId: sessionId,
    });
  }

  const nextSnapshot: StorageSnapshot = {
    ...snapshot,
    reviewSessions: snapshot.reviewSessions.map((session, index) =>
      index === sessionIndex ? parsedSession.data : session,
    ),
  };

  try {
    await dependencies.storage.save(nextSnapshot);
  } catch (cause) {
    throw new ImportDomainError("STORAGE_SAVE_FAILED", { cause });
  }

  return nextSnapshot;
}
