import { z } from "zod";

import { normalizeScalarValue } from "../shared/normalization.js";
import {
  isoDateTimeSchema,
  scalarValueSchema,
  type ScalarValue,
} from "../shared/schemas.js";
import {
  buildSourceRefKey,
  sourceRefSchema,
} from "../shared/sourceRef.js";

export const attributeClaimSchema = z.strictObject({
  value: scalarValueSchema,
  sourceRef: sourceRefSchema,
});

export type AttributeClaim = z.infer<typeof attributeClaimSchema>;

export const attributeRecordSchema = z.strictObject({
  canonicalValue: scalarValueSchema.nullable(),
  claims: z.array(attributeClaimSchema),
  conflictResolvedAt: isoDateTimeSchema.nullable(),
});

export type AttributeRecord = z.infer<typeof attributeRecordSchema>;

function buildClaimKey(claim: AttributeClaim): string {
  return JSON.stringify([
    normalizeScalarValue(claim.value),
    buildSourceRefKey(claim.sourceRef),
  ]);
}

export function createAttributeRecord(claim: AttributeClaim): AttributeRecord {
  const parsedClaim = attributeClaimSchema.parse(claim);

  return {
    canonicalValue: parsedClaim.value,
    claims: [parsedClaim],
    conflictResolvedAt: null,
  };
}

export function addAttributeClaim(
  record: AttributeRecord,
  claim: AttributeClaim,
): AttributeRecord {
  const parsedRecord = attributeRecordSchema.parse(record);
  const parsedClaim = attributeClaimSchema.parse(claim);
  const newClaimKey = buildClaimKey(parsedClaim);

  if (parsedRecord.claims.some((existing) => buildClaimKey(existing) === newClaimKey)) {
    return parsedRecord;
  }

  const existingValues = new Set(
    parsedRecord.claims.map((existing) => normalizeScalarValue(existing.value)),
  );
  const introducesDifferentValue =
    existingValues.size > 0 &&
    !existingValues.has(normalizeScalarValue(parsedClaim.value));

  return {
    canonicalValue: parsedRecord.canonicalValue,
    claims: [...parsedRecord.claims, parsedClaim],
    conflictResolvedAt: introducesDifferentValue
      ? null
      : parsedRecord.conflictResolvedAt,
  };
}

export function resolveAttributeConflict(
  record: AttributeRecord,
  canonicalValue: ScalarValue,
  resolvedAt: string,
): AttributeRecord {
  const parsedRecord = attributeRecordSchema.parse(record);

  return {
    canonicalValue: scalarValueSchema.parse(canonicalValue),
    claims: parsedRecord.claims,
    conflictResolvedAt: isoDateTimeSchema.parse(resolvedAt),
  };
}

export function hasUnresolvedAttributeConflict(
  record: AttributeRecord,
): boolean {
  const parsedRecord = attributeRecordSchema.parse(record);
  const values = new Set(
    parsedRecord.claims.map((claim) => normalizeScalarValue(claim.value)),
  );

  return values.size > 1 && parsedRecord.conflictResolvedAt === null;
}
