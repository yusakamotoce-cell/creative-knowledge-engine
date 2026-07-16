import { z } from "zod";

import {
  type CandidateBundle,
  type EntityReference,
} from "../../core/candidates/candidate";
import { entityTypeSchema } from "../../core/entities/entity";
import { normalizeAttributeKey } from "../../core/shared/normalization";
import {
  nonEmptyTrimmedStringSchema,
  scalarValueSchema,
  type ScalarValue,
} from "../../core/shared/schemas";
import { CANDIDATE_BUNDLE_LIMITS } from "../../core/import/candidateBundleGrounding";

const providerIdentifierSchema = nonEmptyTrimmedStringSchema.max(
  CANDIDATE_BUNDLE_LIMITS.identifierCharacters,
);
const providerNameSchema = nonEmptyTrimmedStringSchema.max(
  CANDIDATE_BUNDLE_LIMITS.nameCharacters,
);
const providerSourceRefSchema = z.strictObject({
  documentId: providerIdentifierSchema,
  fileName: nonEmptyTrimmedStringSchema.max(255),
  excerpt: z
    .string()
    .min(1)
    .max(CANDIDATE_BUNDLE_LIMITS.excerptCharacters),
});

export const providerAttributeSchema = z.strictObject({
  key: z.string().max(CANDIDATE_BUNDLE_LIMITS.identifierCharacters),
  value: scalarValueSchema,
});

export type ProviderAttribute = z.infer<typeof providerAttributeSchema>;

const providerEntityReferenceSchema = z.union([
  z.strictObject({ candidateId: providerIdentifierSchema }),
  z.strictObject({
    candidateId: providerIdentifierSchema,
    entityType: entityTypeSchema,
  }),
  z.strictObject({ name: providerNameSchema }),
  z.strictObject({
    name: providerNameSchema,
    entityType: entityTypeSchema,
  }),
  z.strictObject({
    candidateId: providerIdentifierSchema,
    name: providerNameSchema,
  }),
  z.strictObject({
    candidateId: providerIdentifierSchema,
    name: providerNameSchema,
    entityType: entityTypeSchema,
  }),
]);

const providerEntityCandidateSchema = z.strictObject({
  candidateId: providerIdentifierSchema,
  entityType: entityTypeSchema,
  name: providerNameSchema,
  aliases: z
    .array(providerNameSchema)
    .max(CANDIDATE_BUNDLE_LIMITS.aliasesPerEntity),
  description: z
    .string()
    .max(CANDIDATE_BUNDLE_LIMITS.descriptionCharacters),
  attributes: z.array(providerAttributeSchema),
  tags: z
    .array(z.string().max(CANDIDATE_BUNDLE_LIMITS.identifierCharacters))
    .max(CANDIDATE_BUNDLE_LIMITS.tagsPerEntity),
  sourceRefs: z
    .array(providerSourceRefSchema)
    .max(CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate),
});

const providerRelationshipCandidateSchema = z.strictObject({
  candidateId: providerIdentifierSchema,
  fromRef: providerEntityReferenceSchema,
  toRef: providerEntityReferenceSchema,
  relationType: providerIdentifierSchema,
  description: z
    .string()
    .max(CANDIDATE_BUNDLE_LIMITS.descriptionCharacters),
  sourceRefs: z
    .array(providerSourceRefSchema)
    .max(CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate),
});

export const providerCandidateBundleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documentId: providerIdentifierSchema,
  entities: z
    .array(providerEntityCandidateSchema)
    .max(CANDIDATE_BUNDLE_LIMITS.entities),
  relationships: z
    .array(providerRelationshipCandidateSchema)
    .max(CANDIDATE_BUNDLE_LIMITS.relationships),
});

export type ProviderCandidateBundle = z.infer<
  typeof providerCandidateBundleSchema
>;

export type ProviderCandidateBundleConversionErrorCode =
  | "INVALID_PROVIDER_CANDIDATE_BUNDLE"
  | "EMPTY_ATTRIBUTE_KEY"
  | "DUPLICATE_RAW_ATTRIBUTE_KEY"
  | "NORMALIZED_ATTRIBUTE_KEY_COLLISION";

export class ProviderCandidateBundleConversionError extends Error {
  readonly code: ProviderCandidateBundleConversionErrorCode;

  constructor(
    code: ProviderCandidateBundleConversionErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "ProviderCandidateBundleConversionError";
    this.code = code;
  }
}

function convertAttributes(
  attributes: readonly ProviderAttribute[],
): Record<string, ScalarValue> {
  const rawKeys = new Set<string>();
  const normalizedKeys = new Map<string, string>();
  const converted: Record<string, ScalarValue> = {};

  for (const attribute of attributes) {
    if (rawKeys.has(attribute.key)) {
      throw new ProviderCandidateBundleConversionError(
        "DUPLICATE_RAW_ATTRIBUTE_KEY",
      );
    }
    rawKeys.add(attribute.key);

    const normalizedKey = normalizeAttributeKey(attribute.key);
    if (normalizedKey.length === 0) {
      throw new ProviderCandidateBundleConversionError(
        "EMPTY_ATTRIBUTE_KEY",
      );
    }
    if (normalizedKeys.has(normalizedKey)) {
      throw new ProviderCandidateBundleConversionError(
        "NORMALIZED_ATTRIBUTE_KEY_COLLISION",
      );
    }
    normalizedKeys.set(normalizedKey, attribute.key);

    const scalarValue = scalarValueSchema.safeParse(attribute.value);
    if (!scalarValue.success) {
      throw new ProviderCandidateBundleConversionError(
        "INVALID_PROVIDER_CANDIDATE_BUNDLE",
        { cause: scalarValue.error },
      );
    }
    Object.defineProperty(converted, attribute.key, {
      value: scalarValue.data,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }

  return converted;
}

function cloneReference(reference: EntityReference): EntityReference {
  return { ...reference };
}

export function convertProviderCandidateBundle(
  input: unknown,
): CandidateBundle {
  const parsed = providerCandidateBundleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProviderCandidateBundleConversionError(
      "INVALID_PROVIDER_CANDIDATE_BUNDLE",
      { cause: parsed.error },
    );
  }

  return {
    schemaVersion: 1,
    documentId: parsed.data.documentId,
    entities: parsed.data.entities.map((entity) => ({
      ...entity,
      aliases: [...entity.aliases],
      attributes: convertAttributes(entity.attributes),
      tags: [...entity.tags],
      sourceRefs: entity.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    })),
    relationships: parsed.data.relationships.map((relationship) => ({
      ...relationship,
      fromRef: cloneReference(relationship.fromRef),
      toRef: cloneReference(relationship.toRef),
      sourceRefs: relationship.sourceRefs.map((sourceRef) => ({ ...sourceRef })),
    })),
  };
}
