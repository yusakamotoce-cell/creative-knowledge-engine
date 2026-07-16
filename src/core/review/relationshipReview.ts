import { relationshipCandidateSchema } from "../candidates/candidate";
import { relationshipSchema } from "../relationships/relationship";
import { buildRelationshipKey } from "../relationships/relationshipKey";
import type { Clock } from "../shared/clock";
import { unionSourceRefs } from "../shared/deterministicUnion";
import type { IdGenerator } from "../shared/idGenerator";
import { ReviewDomainError } from "./errors";
import {
  resolveEntityReference,
  type EntityReferenceResolution,
} from "./referenceResolution";
import {
  findRelationshipReviewIndex,
  replaceAt,
  requirePhase,
} from "./sessionUtils";
import type {
  RelationshipBlockedReason,
  RelationshipReviewRecord,
  ReviewSession,
} from "./types";

function getBlockedReason(
  from: EntityReferenceResolution,
  to: EntityReferenceResolution,
): RelationshipBlockedReason | null {
  if (
    from.reason === "references_rejected_entity" ||
    to.reason === "references_rejected_entity"
  ) {
    return "references_rejected_entity";
  }

  const fromAmbiguous = from.reason === "ambiguous";
  const toAmbiguous = to.reason === "ambiguous";
  if (fromAmbiguous && toAmbiguous) return "ambiguous_both";
  if (fromAmbiguous) return "ambiguous_from";
  if (toAmbiguous) return "ambiguous_to";

  const fromUnresolved = from.entityId === null;
  const toUnresolved = to.entityId === null;
  if (fromUnresolved && toUnresolved) return "unresolved_both";
  if (fromUnresolved) return "unresolved_from";
  if (toUnresolved) return "unresolved_to";
  return null;
}

export function resolveRelationshipReviewRecord(
  session: ReviewSession,
  review: RelationshipReviewRecord,
  manual: { fromEntityId?: string; toEntityId?: string } = {},
): RelationshipReviewRecord {
  const from = resolveEntityReference({
    reference: review.candidate.fromRef,
    session,
    ...(manual.fromEntityId === undefined
      ? {}
      : { manualEntityId: manual.fromEntityId }),
  });
  const to = resolveEntityReference({
    reference: review.candidate.toRef,
    session,
    ...(manual.toEntityId === undefined
      ? {}
      : { manualEntityId: manual.toEntityId }),
  });
  const blockedReason = getBlockedReason(from, to);

  return {
    ...review,
    status: blockedReason === null ? "pending" : "blocked",
    resolvedFromEntityId: from.entityId,
    resolvedToEntityId: to.entityId,
    blockedReason,
    recommendation:
      blockedReason === "references_rejected_entity" ? "reject" : null,
  };
}

export function setRelationshipManualResolution(
  session: ReviewSession,
  candidateId: string,
  input: { fromEntityId?: string; toEntityId?: string },
): ReviewSession {
  requirePhase(session, "relationships");
  const reviewIndex = findRelationshipReviewIndex(session, candidateId);
  const review = session.relationshipReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  if (review.status !== "pending" && review.status !== "blocked") {
    throw new ReviewDomainError("CANDIDATE_ALREADY_REVIEWED");
  }

  const resolved = resolveRelationshipReviewRecord(session, review, input);
  return {
    ...session,
    relationshipReviews: replaceAt(
      session.relationshipReviews,
      reviewIndex,
      resolved,
    ),
  };
}

export function acceptRelationshipCandidate(
  session: ReviewSession,
  candidateId: string,
  dependencies: { idGenerator: IdGenerator; clock: Clock },
): ReviewSession {
  requirePhase(session, "relationships");
  const reviewIndex = findRelationshipReviewIndex(session, candidateId);
  const review = session.relationshipReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  if (review.status === "blocked") {
    throw new ReviewDomainError("RELATIONSHIP_BLOCKED");
  }

  if (review.status !== "pending") {
    throw new ReviewDomainError("CANDIDATE_ALREADY_REVIEWED");
  }

  if (
    review.resolvedFromEntityId === null ||
    review.resolvedToEntityId === null
  ) {
    throw new ReviewDomainError("RELATIONSHIP_ENDPOINT_UNRESOLVED");
  }

  const candidate = relationshipCandidateSchema.parse(review.candidate);
  const key = buildRelationshipKey({
    fromEntityId: review.resolvedFromEntityId,
    toEntityId: review.resolvedToEntityId,
    relationType: candidate.relationType,
  });
  const matchingIndexes = session.knowledge.relationships.flatMap(
    (relationship, index) =>
      buildRelationshipKey(relationship) === key ? [index] : [],
  );

  if (matchingIndexes.length > 1) {
    throw new ReviewDomainError("DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE");
  }

  if (matchingIndexes.length === 1) {
    const relationshipIndex = matchingIndexes[0];
    const existing =
      relationshipIndex === undefined
        ? undefined
        : session.knowledge.relationships[relationshipIndex];

    if (existing === undefined || relationshipIndex === undefined) {
      throw new ReviewDomainError("DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE");
    }

    const merged = relationshipSchema.parse({
      ...existing,
      sourceRefs: unionSourceRefs(existing.sourceRefs, candidate.sourceRefs),
      updatedAt: dependencies.clock.now(),
    });

    return {
      ...session,
      knowledge: {
        ...session.knowledge,
        relationships: replaceAt(
          session.knowledge.relationships,
          relationshipIndex,
          merged,
        ),
      },
      relationshipReviews: replaceAt(session.relationshipReviews, reviewIndex, {
        ...review,
        candidate,
        status: "merged",
        registeredRelationshipId: existing.id,
      }),
    };
  }

  const id = dependencies.idGenerator.nextId("relationship");
  if (
    session.knowledge.relationships.some(
      (relationship) => relationship.id === id,
    )
  ) {
    throw new ReviewDomainError("DUPLICATE_RELATIONSHIP_ID");
  }

  const timestamp = dependencies.clock.now();
  const relationship = relationshipSchema.parse({
    id,
    fromEntityId: review.resolvedFromEntityId,
    toEntityId: review.resolvedToEntityId,
    relationType: candidate.relationType,
    description: candidate.description,
    sourceRefs: unionSourceRefs([], candidate.sourceRefs),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    ...session,
    knowledge: {
      ...session.knowledge,
      relationships: [...session.knowledge.relationships, relationship],
    },
    relationshipReviews: replaceAt(session.relationshipReviews, reviewIndex, {
      ...review,
      candidate,
      status: "accepted",
      registeredRelationshipId: id,
    }),
  };
}

export function rejectRelationshipCandidate(
  session: ReviewSession,
  candidateId: string,
): ReviewSession {
  requirePhase(session, "relationships");
  const reviewIndex = findRelationshipReviewIndex(session, candidateId);
  const review = session.relationshipReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  if (review.status !== "pending" && review.status !== "blocked") {
    throw new ReviewDomainError("CANDIDATE_ALREADY_REVIEWED");
  }

  return {
    ...session,
    relationshipReviews: replaceAt(session.relationshipReviews, reviewIndex, {
      ...review,
      status: "rejected",
      registeredRelationshipId: null,
    }),
  };
}
