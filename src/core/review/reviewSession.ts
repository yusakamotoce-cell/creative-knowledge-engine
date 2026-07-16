import { candidateBundleSchema, type CandidateBundle } from "../candidates/candidate";
import { buildEntityNameIndex, findDuplicateEntityIds } from "../entities/entityNameIndex";
import {
  knowledgeStateSchema,
  type KnowledgeState,
} from "../knowledge/knowledgeState";
import type { ReviewSession } from "./types";
import { ReviewDomainError } from "./errors";
import { resolveRelationshipReviewRecord } from "./relationshipReview";
import { requirePhase } from "./sessionUtils";

function requireUniqueValues(
  values: readonly string[],
  code:
    | "DUPLICATE_CANDIDATE_ID"
    | "DUPLICATE_ENTITY_ID"
    | "DUPLICATE_RELATIONSHIP_ID",
): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new ReviewDomainError(code);
    }

    seen.add(value);
  }
}

export function createReviewSession(input: {
  bundle: CandidateBundle;
  initialKnowledge: KnowledgeState;
}): ReviewSession {
  const bundle = candidateBundleSchema.parse(input.bundle);
  const knowledge = knowledgeStateSchema.parse(input.initialKnowledge);

  requireUniqueValues(
    [
      ...bundle.entities.map((candidate) => candidate.candidateId),
      ...bundle.relationships.map((candidate) => candidate.candidateId),
    ],
    "DUPLICATE_CANDIDATE_ID",
  );
  requireUniqueValues(
    knowledge.entities.map((entity) => entity.id),
    "DUPLICATE_ENTITY_ID",
  );
  requireUniqueValues(
    knowledge.relationships.map((relationship) => relationship.id),
    "DUPLICATE_RELATIONSHIP_ID",
  );

  const entityIds = new Set(knowledge.entities.map((entity) => entity.id));

  if (
    knowledge.relationships.some(
      (relationship) =>
        !entityIds.has(relationship.fromEntityId) ||
        !entityIds.has(relationship.toEntityId),
    )
  ) {
    throw new ReviewDomainError("DANGLING_RELATIONSHIP_ENDPOINT");
  }

  const nameIndex = buildEntityNameIndex(knowledge.entities);

  return {
    schemaVersion: 1,
    documentId: bundle.documentId,
    phase: "entities",
    knowledge,
    entityReviews: bundle.entities.map((candidate) => ({
      candidateId: candidate.candidateId,
      candidate,
      status: "pending",
      registeredEntityId: null,
      duplicateEntityIds: findDuplicateEntityIds(candidate, nameIndex),
    })),
    relationshipReviews: bundle.relationships.map((candidate) => ({
      candidateId: candidate.candidateId,
      candidate,
      status: "pending",
      resolvedFromEntityId: null,
      resolvedToEntityId: null,
      blockedReason: null,
      recommendation: null,
      registeredRelationshipId: null,
    })),
    candidateIdToRegisteredEntityId: {},
  };
}

export function advanceToRelationshipReview(
  session: ReviewSession,
): ReviewSession {
  requirePhase(session, "entities");

  if (session.entityReviews.some((review) => review.status === "pending")) {
    throw new ReviewDomainError("ENTITY_REVIEW_INCOMPLETE");
  }

  const relationshipSession: ReviewSession = {
    ...session,
    phase: "relationships",
  };

  return {
    ...relationshipSession,
    relationshipReviews: relationshipSession.relationshipReviews.map((review) =>
      resolveRelationshipReviewRecord(relationshipSession, review),
    ),
  };
}

export function completeReviewSession(session: ReviewSession): ReviewSession {
  requirePhase(session, "relationships");

  if (
    session.relationshipReviews.some(
      (review) => review.status === "pending" || review.status === "blocked",
    )
  ) {
    throw new ReviewDomainError("RELATIONSHIP_REVIEW_INCOMPLETE");
  }

  return { ...session, phase: "complete" };
}
