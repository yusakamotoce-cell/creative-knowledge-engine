import { normalizeRelationType } from "../shared/normalization";

interface RelationshipKeyInput {
  fromEntityId: string;
  toEntityId: string;
  relationType: string;
}

export function buildRelationshipKey(input: RelationshipKeyInput): string {
  const fromEntityId = input.fromEntityId.trim();
  const toEntityId = input.toEntityId.trim();
  const relationType = normalizeRelationType(input.relationType);

  if (fromEntityId.length === 0 || toEntityId.length === 0) {
    throw new TypeError("RELATIONSHIP_ENDPOINT_REQUIRED");
  }

  if (relationType.length === 0) {
    throw new TypeError("RELATION_TYPE_REQUIRED");
  }

  return JSON.stringify([fromEntityId, toEntityId, relationType]);
}
