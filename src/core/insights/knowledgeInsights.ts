import { z } from "zod";

import { hasUnresolvedAttributeConflict } from "../entities/attributeRecord";
import { entityTypeSchema, type EntityType } from "../entities/entity";
import {
  knowledgeStateSchema,
  type KnowledgeState,
} from "../knowledge/knowledgeState";
import { normalizeEntityName } from "../shared/normalization";
import { compareStrings } from "../shared/order";
import {
  isoDateTimeSchema,
  nonEmptyTrimmedStringSchema,
  scalarValueSchema,
} from "../shared/schemas";

export const duplicateInsightSchema = z.strictObject({
  normalizedKey: nonEmptyTrimmedStringSchema,
  entityIds: z.array(nonEmptyTrimmedStringSchema),
});

export const conflictInsightSchema = z.strictObject({
  entityId: nonEmptyTrimmedStringSchema,
  attributeKey: nonEmptyTrimmedStringSchema,
  canonicalValue: scalarValueSchema.nullable(),
  claimValues: z.array(scalarValueSchema),
  conflictResolvedAt: isoDateTimeSchema.nullable(),
});

export const knowledgeStatisticsSchema = z.strictObject({
  entityCount: z.number().int().nonnegative(),
  entityCountByType: z.strictObject({
    character: z.number().int().nonnegative(),
    scene: z.number().int().nonnegative(),
    location: z.number().int().nonnegative(),
    item: z.number().int().nonnegative(),
    organization: z.number().int().nonnegative(),
  }),
  relationshipCount: z.number().int().nonnegative(),
  orphanCount: z.number().int().nonnegative(),
  unresolvedConflictCount: z.number().int().nonnegative(),
});

export const knowledgeInsightsSchema = z.strictObject({
  duplicateGroups: z.array(duplicateInsightSchema),
  conflicts: z.array(conflictInsightSchema),
  orphanEntityIds: z.array(nonEmptyTrimmedStringSchema),
  statistics: knowledgeStatisticsSchema,
});

export type DuplicateInsight = z.infer<typeof duplicateInsightSchema>;
export type ConflictInsight = z.infer<typeof conflictInsightSchema>;
export type KnowledgeStatistics = z.infer<typeof knowledgeStatisticsSchema>;
export type KnowledgeInsights = z.infer<typeof knowledgeInsightsSchema>;

const entityTypes = entityTypeSchema.options;

function calculateDuplicateGroups(
  knowledge: KnowledgeState,
): DuplicateInsight[] {
  const entityIdsByKey = new Map<string, Set<string>>();

  for (const entity of knowledge.entities) {
    for (const value of [entity.name, ...entity.aliases]) {
      const key = normalizeEntityName(value);
      const entityIds = entityIdsByKey.get(key) ?? new Set<string>();
      entityIds.add(entity.id);
      entityIdsByKey.set(key, entityIds);
    }
  }

  return [...entityIdsByKey.entries()]
    .filter(([, entityIds]) => entityIds.size >= 2)
    .sort(([keyA], [keyB]) => compareStrings(keyA, keyB))
    .map(([normalizedKey, entityIds]) => ({
      normalizedKey,
      entityIds: knowledge.entities
        .map((entity) => entity.id)
        .filter((entityId) => entityIds.has(entityId)),
    }));
}

function calculateConflicts(knowledge: KnowledgeState): ConflictInsight[] {
  return knowledge.entities.flatMap((entity) =>
    Object.entries(entity.attributes).flatMap(([attributeKey, record]) =>
      hasUnresolvedAttributeConflict(record)
        ? [
            {
              entityId: entity.id,
              attributeKey,
              canonicalValue: record.canonicalValue,
              claimValues: record.claims.map((claim) => claim.value),
              conflictResolvedAt: record.conflictResolvedAt,
            },
          ]
        : [],
    ),
  );
}

function emptyEntityCounts(): Record<EntityType, number> {
  return Object.fromEntries(
    entityTypes.map((entityType) => [entityType, 0]),
  ) as Record<EntityType, number>;
}

export function calculateKnowledgeInsights(
  input: KnowledgeState,
): KnowledgeInsights {
  const knowledge = knowledgeStateSchema.parse(input);
  const duplicateGroups = calculateDuplicateGroups(knowledge);
  const conflicts = calculateConflicts(knowledge);
  const connectedEntityIds = new Set(
    knowledge.relationships.flatMap((relationship) => [
      relationship.fromEntityId,
      relationship.toEntityId,
    ]),
  );
  const orphanEntityIds = knowledge.entities
    .map((entity) => entity.id)
    .filter((entityId) => !connectedEntityIds.has(entityId));
  const entityCountByType = emptyEntityCounts();

  for (const entity of knowledge.entities) {
    entityCountByType[entity.entityType] += 1;
  }

  return knowledgeInsightsSchema.parse({
    duplicateGroups,
    conflicts,
    orphanEntityIds,
    statistics: {
      entityCount: knowledge.entities.length,
      entityCountByType,
      relationshipCount: knowledge.relationships.length,
      orphanCount: orphanEntityIds.length,
      unresolvedConflictCount: conflicts.length,
    },
  });
}
