import type { ScalarValue } from "./schemas";

const WHITESPACE_PATTERN = /\s+/gu;

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(WHITESPACE_PATTERN, " ");
}

function normalizeComparableText(value: string): string {
  return normalizeText(value).toLowerCase();
}

export function normalizeEntityName(value: string): string {
  return normalizeComparableText(value);
}

export function normalizeAttributeKey(value: string): string {
  return normalizeComparableText(value);
}

export function normalizeRelationType(value: string): string {
  return normalizeComparableText(value);
}

export function normalizeScalarValue(value: ScalarValue): string {
  switch (typeof value) {
    case "string":
      return `string:${normalizeText(value)}`;
    case "number":
      if (!Number.isFinite(value)) {
        throw new TypeError("SCALAR_NUMBER_MUST_BE_FINITE");
      }
      return `number:${Object.is(value, -0) ? "0" : String(value)}`;
    case "boolean":
      return `boolean:${value ? "true" : "false"}`;
  }
}
