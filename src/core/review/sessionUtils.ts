import type { EntityReviewRecord, ReviewSession } from "./types";
import { buildEntityNameIndex, findDuplicateEntityIds } from "../entities/entityNameIndex";
import { ReviewDomainError } from "./errors";

export function requirePhase(
  session: ReviewSession,
  phase: ReviewSession["phase"],
): void {
  if (session.phase !== phase) {
    throw new ReviewDomainError("INVALID_REVIEW_PHASE");
  }
}

export function findEntityReviewIndex(
  session: ReviewSession,
  candidateId: string,
): number {
  const index = session.entityReviews.findIndex(
    (review) => review.candidateId === candidateId,
  );

  if (index === -1) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  return index;
}

export function findRelationshipReviewIndex(
  session: ReviewSession,
  candidateId: string,
): number {
  const index = session.relationshipReviews.findIndex(
    (review) => review.candidateId === candidateId,
  );

  if (index === -1) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  return index;
}

export function requirePendingEntityReview(review: EntityReviewRecord): void {
  if (review.status !== "pending") {
    throw new ReviewDomainError("CANDIDATE_ALREADY_REVIEWED");
  }
}

export function recomputePendingEntityDuplicates(
  session: ReviewSession,
): EntityReviewRecord[] {
  const index = buildEntityNameIndex(session.knowledge.entities);

  return session.entityReviews.map((review) =>
    review.status === "pending"
      ? {
          ...review,
          duplicateEntityIds: findDuplicateEntityIds(review.candidate, index),
        }
      : review,
  );
}

export function replaceAt<T>(
  values: readonly T[],
  index: number,
  value: T,
): T[] {
  return values.map((current, currentIndex) =>
    currentIndex === index ? value : current,
  );
}
