import type { EntityReference } from "../candidates/candidate";
import { buildEntityNameIndex } from "../entities/entityNameIndex";
import { normalizeEntityName } from "../shared/normalization";
import { ReviewDomainError } from "./errors";
import type { ReviewSession } from "./types";

export type EntityReferenceResolutionReason =
  | "resolved_by_candidate_id"
  | "resolved_by_name"
  | "resolved_manually"
  | "unresolved"
  | "ambiguous"
  | "references_rejected_entity";

export interface EntityReferenceResolution {
  entityId: string | null;
  reason: EntityReferenceResolutionReason;
}

function typeMatches(
  entityType: EntityReference["entityType"],
  actualEntityType: string,
): boolean {
  return entityType === undefined || entityType === actualEntityType;
}

export function resolveEntityReference(input: {
  reference: EntityReference;
  session: ReviewSession;
  manualEntityId?: string;
}): EntityReferenceResolution {
  const { reference, session, manualEntityId } = input;

  if (manualEntityId !== undefined) {
    const entity = session.knowledge.entities.find(
      (candidate) => candidate.id === manualEntityId,
    );

    if (entity === undefined) {
      throw new ReviewDomainError("MANUAL_ENTITY_NOT_FOUND");
    }

    if (!typeMatches(reference.entityType, entity.entityType)) {
      throw new ReviewDomainError("ENTITY_TYPE_MISMATCH");
    }

    return { entityId: entity.id, reason: "resolved_manually" };
  }

  if (reference.candidateId !== undefined) {
    const mappedEntityId =
      session.candidateIdToRegisteredEntityId[reference.candidateId];
    const mappedEntity = session.knowledge.entities.find(
      (entity) => entity.id === mappedEntityId,
    );

    if (
      mappedEntity !== undefined &&
      typeMatches(reference.entityType, mappedEntity.entityType)
    ) {
      return {
        entityId: mappedEntity.id,
        reason: "resolved_by_candidate_id",
      };
    }
  }

  if (reference.name !== undefined) {
    const index = buildEntityNameIndex(session.knowledge.entities);
    const indexedIds = index.get(normalizeEntityName(reference.name)) ?? [];
    const matchingIds = indexedIds.filter((id) => {
      const entity = session.knowledge.entities.find((item) => item.id === id);
      return entity !== undefined && typeMatches(reference.entityType, entity.entityType);
    });

    if (matchingIds.length === 1) {
      return { entityId: matchingIds[0] ?? null, reason: "resolved_by_name" };
    }

    if (matchingIds.length > 1) {
      return { entityId: null, reason: "ambiguous" };
    }
  }

  if (reference.candidateId !== undefined) {
    const review = session.entityReviews.find(
      (candidate) => candidate.candidateId === reference.candidateId,
    );

    if (review?.status === "rejected") {
      return { entityId: null, reason: "references_rejected_entity" };
    }
  }

  return { entityId: null, reason: "unresolved" };
}
