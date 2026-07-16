import type { EntityCandidate } from "../candidates/candidate";
import { normalizeEntityName } from "../shared/normalization";
import { compareStrings } from "../shared/order";
import type { Entity } from "./entity";

export type EntityNameIndex = Map<string, string[]>;

export function buildEntityNameIndex(
  entities: readonly Entity[],
): EntityNameIndex {
  const mutableIndex = new Map<string, Set<string>>();

  for (const entity of entities) {
    for (const value of [entity.name, ...entity.aliases]) {
      const normalized = normalizeEntityName(value);
      const ids = mutableIndex.get(normalized) ?? new Set<string>();
      ids.add(entity.id);
      mutableIndex.set(normalized, ids);
    }
  }

  const index: EntityNameIndex = new Map();

  for (const key of [...mutableIndex.keys()].sort(compareStrings)) {
    const ids = mutableIndex.get(key);

    if (ids !== undefined) {
      index.set(key, [...ids].sort(compareStrings));
    }
  }

  return index;
}

export function findDuplicateEntityIds(
  candidate: EntityCandidate,
  index: EntityNameIndex,
): string[] {
  const ids = new Set<string>();

  for (const value of [candidate.name, ...candidate.aliases]) {
    const matchingIds = index.get(normalizeEntityName(value)) ?? [];

    for (const id of matchingIds) {
      ids.add(id);
    }
  }

  return [...ids].sort(compareStrings);
}
