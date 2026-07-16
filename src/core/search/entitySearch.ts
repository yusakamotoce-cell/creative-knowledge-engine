import type { Entity, EntityType } from "../entities/entity";
import type { KnowledgeState } from "../knowledge/knowledgeState";

const SEARCH_WHITESPACE_PATTERN = /\p{White_Space}+/gu;

export type SearchMatchedField = "name" | "alias" | "tag";
export type SearchMatchKind = "exact" | "prefix" | "substring";

export interface EntitySearchMatch {
  field: SearchMatchedField;
  kind: SearchMatchKind;
  value: string;
  normalizedValue: string;
}

export interface EntitySearchResult {
  entity: Entity;
  score: number;
  matches: EntitySearchMatch[];
}

export interface EntitySearchResponse {
  normalizedQuery: string;
  results: EntitySearchResult[];
  availableTags: string[];
}

export interface EntitySearchFilters {
  entityTypes?: EntityType[];
  tags?: string[];
}

const SCORE_BY_FIELD_AND_KIND: Record<
  SearchMatchedField,
  Record<SearchMatchKind, number>
> = {
  name: { exact: 900, prefix: 800, substring: 700 },
  alias: { exact: 850, prefix: 750, substring: 650 },
  tag: { exact: 600, prefix: 550, substring: 500 },
};

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(SEARCH_WHITESPACE_PATTERN, " ")
    .toLowerCase();
}

function availableTags(knowledge: KnowledgeState): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entity of knowledge.entities) {
    for (const tag of entity.tags) {
      const normalized = normalizeSearchText(tag);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(tag);
    }
  }
  return result;
}

function passesFilters(
  entity: Entity,
  filters: EntitySearchFilters,
): boolean {
  if (
    filters.entityTypes !== undefined &&
    !filters.entityTypes.includes(entity.entityType)
  ) {
    return false;
  }

  const requiredTags = (filters.tags ?? []).map(normalizeSearchText);
  const entityTags = new Set(entity.tags.map(normalizeSearchText));
  return requiredTags.every((tag) => entityTags.has(tag));
}

function matchKind(
  normalizedValue: string,
  normalizedQuery: string,
): SearchMatchKind | null {
  if (normalizedValue === normalizedQuery) return "exact";
  if (normalizedValue.startsWith(normalizedQuery)) return "prefix";
  if (normalizedValue.includes(normalizedQuery)) return "substring";
  return null;
}

function entityMatches(
  entity: Entity,
  normalizedQuery: string,
): EntitySearchMatch[] {
  const fields: Array<{ field: SearchMatchedField; value: string }> = [
    { field: "name", value: entity.name },
    ...entity.aliases.map((value) => ({ field: "alias" as const, value })),
    ...entity.tags.map((value) => ({ field: "tag" as const, value })),
  ];
  const seen = new Set<string>();
  const matches: EntitySearchMatch[] = [];

  for (const item of fields) {
    const normalizedValue = normalizeSearchText(item.value);
    const kind = matchKind(normalizedValue, normalizedQuery);
    const key = `${item.field}\u0000${normalizedValue}`;
    if (kind === null || seen.has(key)) continue;
    seen.add(key);
    matches.push({ ...item, kind, normalizedValue });
  }

  return matches;
}

export function searchEntities(
  knowledge: KnowledgeState,
  query: string,
  filters: EntitySearchFilters = {},
): EntitySearchResponse {
  const normalizedQuery = normalizeSearchText(query);
  const indexedResults = knowledge.entities.flatMap((entity, index) => {
    if (!passesFilters(entity, filters)) return [];
    if (normalizedQuery.length === 0) {
      return [{ entity, score: 0, matches: [], index }];
    }

    const matches = entityMatches(entity, normalizedQuery);
    if (matches.length === 0) return [];
    const score = Math.max(
      ...matches.map(
        (match) => SCORE_BY_FIELD_AND_KIND[match.field][match.kind],
      ),
    );
    return [{ entity, score, matches, index }];
  });

  indexedResults.sort(
    (left, right) =>
      right.score - left.score ||
      left.index - right.index ||
      left.entity.id.localeCompare(right.entity.id, "en"),
  );

  return {
    normalizedQuery,
    results: indexedResults.map((result) => ({
      entity: result.entity,
      score: result.score,
      matches: result.matches,
    })),
    availableTags: availableTags(knowledge),
  };
}
