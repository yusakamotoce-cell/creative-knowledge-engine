import {
  entityCandidateSchema,
} from "../candidates/candidate";
import {
  addAttributeClaim,
  type AttributeRecord,
} from "../entities/attributeRecord";
import { entitySchema, type EntityType } from "../entities/entity";
import { unionSourceRefs, unionStrings } from "../shared/deterministicUnion";
import type { Clock } from "../shared/clock";
import type { IdGenerator } from "../shared/idGenerator";
import { normalizeEntityName } from "../shared/normalization";
import type { ScalarValue } from "../shared/schemas";
import { createCandidateAttributeRecords } from "./candidateAttributes";
import { ReviewDomainError } from "./errors";
import {
  findEntityReviewIndex,
  recomputePendingEntityDuplicates,
  replaceAt,
  requirePendingEntityReview,
  requirePhase,
} from "./sessionUtils";
import type { ReviewSession } from "./types";

export interface EntityCandidateEdit {
  entityType?: EntityType;
  name?: string;
  aliases?: string[];
  description?: string;
  attributes?: Record<string, ScalarValue>;
  tags?: string[];
}

function withUpdatedPendingDuplicates(session: ReviewSession): ReviewSession {
  return {
    ...session,
    entityReviews: recomputePendingEntityDuplicates(session),
  };
}

export function editEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  edit: EntityCandidateEdit,
): ReviewSession {
  requirePhase(session, "entities");
  const reviewIndex = findEntityReviewIndex(session, candidateId);
  const review = session.entityReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  requirePendingEntityReview(review);
  const candidate = entityCandidateSchema.parse({
    ...review.candidate,
    entityType: edit.entityType ?? review.candidate.entityType,
    name: edit.name ?? review.candidate.name,
    aliases: edit.aliases ?? review.candidate.aliases,
    description: edit.description ?? review.candidate.description,
    attributes: edit.attributes ?? review.candidate.attributes,
    tags: edit.tags ?? review.candidate.tags,
  });
  const nextSession: ReviewSession = {
    ...session,
    entityReviews: replaceAt(session.entityReviews, reviewIndex, {
      ...review,
      candidate,
    }),
  };

  return withUpdatedPendingDuplicates(nextSession);
}

export function acceptEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  dependencies: { idGenerator: IdGenerator; clock: Clock },
): ReviewSession {
  requirePhase(session, "entities");
  const reviewIndex = findEntityReviewIndex(session, candidateId);
  const review = session.entityReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  requirePendingEntityReview(review);
  const candidate = entityCandidateSchema.parse(review.candidate);
  const attributes = createCandidateAttributeRecords(
    candidate.attributes,
    candidate.sourceRefs,
  );
  const id = dependencies.idGenerator.nextId("entity");

  if (session.knowledge.entities.some((entity) => entity.id === id)) {
    throw new ReviewDomainError("DUPLICATE_ENTITY_ID");
  }

  const timestamp = dependencies.clock.now();
  const entity = entitySchema.parse({
    id,
    entityType: candidate.entityType,
    name: candidate.name,
    aliases: unionStrings([], candidate.aliases),
    description: candidate.description,
    attributes,
    tags: unionStrings([], candidate.tags),
    sourceRefs: unionSourceRefs([], candidate.sourceRefs),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const nextSession: ReviewSession = {
    ...session,
    knowledge: {
      ...session.knowledge,
      entities: [...session.knowledge.entities, entity],
    },
    entityReviews: replaceAt(session.entityReviews, reviewIndex, {
      ...review,
      candidate,
      status: "accepted",
      registeredEntityId: id,
    }),
    candidateIdToRegisteredEntityId: {
      ...session.candidateIdToRegisteredEntityId,
      [candidateId]: id,
    },
  };

  return withUpdatedPendingDuplicates(nextSession);
}

function mergeAttributeRecords(
  existing: Readonly<Record<string, AttributeRecord>>,
  incoming: Readonly<Record<string, AttributeRecord>>,
): Record<string, AttributeRecord> {
  const result: Record<string, AttributeRecord> = { ...existing };

  for (const [key, incomingRecord] of Object.entries(incoming)) {
    const existingRecord = result[key];

    if (existingRecord === undefined) {
      result[key] = incomingRecord;
      continue;
    }

    let merged = existingRecord;
    for (const claim of incomingRecord.claims) {
      merged = addAttributeClaim(merged, claim);
    }
    result[key] = merged;
  }

  return result;
}

export function mergeEntityCandidate(
  session: ReviewSession,
  candidateId: string,
  targetEntityId: string,
  resolution: { name?: string; description?: string },
  dependencies: { clock: Clock },
): ReviewSession {
  requirePhase(session, "entities");
  const reviewIndex = findEntityReviewIndex(session, candidateId);
  const review = session.entityReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  requirePendingEntityReview(review);
  const targetIndex = session.knowledge.entities.findIndex(
    (entity) => entity.id === targetEntityId,
  );
  const target = session.knowledge.entities[targetIndex];

  if (target === undefined) {
    throw new ReviewDomainError("ENTITY_NOT_FOUND");
  }

  const candidate = entityCandidateSchema.parse(review.candidate);
  if (target.entityType !== candidate.entityType) {
    throw new ReviewDomainError("ENTITY_TYPE_MISMATCH");
  }

  const candidateAttributes = createCandidateAttributeRecords(
    candidate.attributes,
    candidate.sourceRefs,
  );
  const finalName = resolution.name ?? target.name;
  let aliases = unionStrings(target.aliases, candidate.aliases);

  if (normalizeEntityName(candidate.name) !== normalizeEntityName(finalName)) {
    aliases = unionStrings(aliases, [candidate.name]);
  }

  const merged = entitySchema.parse({
    ...target,
    name: finalName,
    description: resolution.description ?? target.description,
    aliases,
    attributes: mergeAttributeRecords(target.attributes, candidateAttributes),
    tags: unionStrings(target.tags, candidate.tags),
    sourceRefs: unionSourceRefs(target.sourceRefs, candidate.sourceRefs),
    updatedAt: dependencies.clock.now(),
  });
  const nextSession: ReviewSession = {
    ...session,
    knowledge: {
      ...session.knowledge,
      entities: replaceAt(session.knowledge.entities, targetIndex, merged),
    },
    entityReviews: replaceAt(session.entityReviews, reviewIndex, {
      ...review,
      candidate,
      status: "merged",
      registeredEntityId: targetEntityId,
    }),
    candidateIdToRegisteredEntityId: {
      ...session.candidateIdToRegisteredEntityId,
      [candidateId]: targetEntityId,
    },
  };

  return withUpdatedPendingDuplicates(nextSession);
}

export function rejectEntityCandidate(
  session: ReviewSession,
  candidateId: string,
): ReviewSession {
  requirePhase(session, "entities");
  const reviewIndex = findEntityReviewIndex(session, candidateId);
  const review = session.entityReviews[reviewIndex];

  if (review === undefined) {
    throw new ReviewDomainError("CANDIDATE_NOT_FOUND");
  }

  requirePendingEntityReview(review);
  return {
    ...session,
    entityReviews: replaceAt(session.entityReviews, reviewIndex, {
      ...review,
      status: "rejected",
      registeredEntityId: null,
    }),
  };
}
