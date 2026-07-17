import { CANDIDATE_BUNDLE_LIMITS } from "../../core/import/candidateBundleGrounding.js";

type JsonSchema = Readonly<Record<string, unknown>>;

const scalarValueSchema: JsonSchema = {
  anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
};

const sourceRefSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["documentId", "fileName", "excerpt"],
  properties: {
    documentId: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    fileName: { type: "string", minLength: 1, maxLength: 255 },
    excerpt: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.excerptCharacters,
    },
  },
};

const entityTypeSchema: JsonSchema = {
  type: "string",
  enum: ["character", "scene", "location", "item", "organization"],
};

function entityReferenceVariant(required: readonly string[]): JsonSchema {
  const properties: Record<string, unknown> = {};
  if (required.includes("candidateId")) {
    properties.candidateId = {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    };
  }
  if (required.includes("name")) {
    properties.name = {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.nameCharacters,
    };
  }
  if (required.includes("entityType")) {
    properties.entityType = entityTypeSchema;
  }

  return {
    type: "object",
    additionalProperties: false,
    required,
    properties,
  };
}

const entityReferenceSchema: JsonSchema = {
  anyOf: [
    entityReferenceVariant(["candidateId"]),
    entityReferenceVariant(["candidateId", "entityType"]),
    entityReferenceVariant(["name"]),
    entityReferenceVariant(["name", "entityType"]),
    entityReferenceVariant(["candidateId", "name"]),
    entityReferenceVariant(["candidateId", "name", "entityType"]),
  ],
};

const providerAttributeSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["key", "value"],
  properties: {
    key: {
      type: "string",
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    value: scalarValueSchema,
  },
};

const providerEntityCandidateSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "candidateId",
    "entityType",
    "name",
    "aliases",
    "description",
    "attributes",
    "tags",
    "sourceRefs",
  ],
  properties: {
    candidateId: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    entityType: entityTypeSchema,
    name: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.nameCharacters,
    },
    aliases: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.aliasesPerEntity,
      items: {
        type: "string",
        minLength: 1,
        maxLength: CANDIDATE_BUNDLE_LIMITS.nameCharacters,
      },
    },
    description: {
      type: "string",
      maxLength: CANDIDATE_BUNDLE_LIMITS.descriptionCharacters,
    },
    attributes: {
      type: "array",
      items: providerAttributeSchema,
    },
    tags: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.tagsPerEntity,
      items: {
        type: "string",
        maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
      },
    },
    sourceRefs: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate,
      items: sourceRefSchema,
    },
  },
};

const providerRelationshipCandidateSchema: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "candidateId",
    "fromRef",
    "toRef",
    "relationType",
    "description",
    "sourceRefs",
  ],
  properties: {
    candidateId: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    fromRef: entityReferenceSchema,
    toRef: entityReferenceSchema,
    relationType: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    description: {
      type: "string",
      maxLength: CANDIDATE_BUNDLE_LIMITS.descriptionCharacters,
    },
    sourceRefs: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate,
      items: sourceRefSchema,
    },
  },
};

export const providerCandidateBundleJsonSchema: JsonSchema = Object.freeze({
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "documentId", "entities", "relationships"],
  properties: {
    schemaVersion: { type: "integer", const: 1 },
    documentId: {
      type: "string",
      minLength: 1,
      maxLength: CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
    },
    entities: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.entities,
      items: providerEntityCandidateSchema,
    },
    relationships: {
      type: "array",
      maxItems: CANDIDATE_BUNDLE_LIMITS.relationships,
      items: providerRelationshipCandidateSchema,
    },
  },
});
