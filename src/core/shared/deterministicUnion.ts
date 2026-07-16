import {
  buildSourceRefKey,
  sourceRefSchema,
  type SourceRef,
} from "./sourceRef";

export function unionStrings(
  valuesA: readonly string[],
  valuesB: readonly string[],
): string[] {
  return [...new Set([...valuesA, ...valuesB])];
}

export function unionSourceRefs(
  valuesA: readonly SourceRef[],
  valuesB: readonly SourceRef[],
): SourceRef[] {
  const byKey = new Map<string, SourceRef>();

  for (const value of [...valuesA, ...valuesB]) {
    const parsed = sourceRefSchema.parse(value);
    const key = buildSourceRefKey(parsed);

    if (!byKey.has(key)) {
      byKey.set(key, parsed);
    }
  }

  return [...byKey.values()];
}
