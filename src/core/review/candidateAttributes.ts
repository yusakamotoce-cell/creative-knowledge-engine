import {
  addAttributeClaim,
  createAttributeRecord,
  type AttributeRecord,
} from "../entities/attributeRecord";
import { unionSourceRefs } from "../shared/deterministicUnion";
import { normalizeAttributeKey } from "../shared/normalization";
import { compareStrings } from "../shared/order";
import type { ScalarValue } from "../shared/schemas";
import type { SourceRef } from "../shared/sourceRef";
import { ReviewDomainError } from "./errors";

export function createCandidateAttributeRecords(
  attributes: Readonly<Record<string, ScalarValue>>,
  sourceRefs: readonly SourceRef[],
): Record<string, AttributeRecord> {
  const entries = Object.entries(attributes);
  const distinctSourceRefs = unionSourceRefs([], sourceRefs);

  if (entries.length > 0 && distinctSourceRefs.length === 0) {
    throw new ReviewDomainError("ATTRIBUTE_SOURCE_REF_REQUIRED");
  }

  const normalizedEntries = entries.map(([rawKey, value]) => [
    normalizeAttributeKey(rawKey),
    value,
  ] as const);
  const normalizedKeys = new Set<string>();

  for (const [key] of normalizedEntries) {
    if (normalizedKeys.has(key)) {
      throw new ReviewDomainError("ATTRIBUTE_KEY_COLLISION");
    }

    normalizedKeys.add(key);
  }

  return Object.fromEntries(
    [...normalizedEntries]
      .sort(([keyA], [keyB]) => compareStrings(keyA, keyB))
      .map(([key, value]) => {
      const [firstSourceRef, ...remainingSourceRefs] = distinctSourceRefs;

      if (firstSourceRef === undefined) {
        throw new ReviewDomainError("ATTRIBUTE_SOURCE_REF_REQUIRED");
      }

      let record = createAttributeRecord({ value, sourceRef: firstSourceRef });

      for (const sourceRef of remainingSourceRefs) {
        record = addAttributeClaim(record, { value, sourceRef });
      }

        return [key, record];
      }),
  );
}

export const buildCandidateAttributeRecords = createCandidateAttributeRecords;
