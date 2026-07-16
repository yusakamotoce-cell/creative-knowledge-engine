import type { EntityType } from "../entities/entity";
import {
  knowledgeStateSchema,
  type KnowledgeState,
} from "../knowledge/knowledgeState";

export const graphEntityTypeLanes = [
  "character",
  "organization",
  "location",
  "scene",
  "item",
] as const satisfies readonly EntityType[];

export interface KnowledgeGraphNode {
  id: string;
  entityId: string;
  label: string;
  entityType: EntityType;
  isOrphan: boolean;
  relationshipCount: number;
}

export interface KnowledgeGraphEdge {
  id: string;
  relationshipId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  label: string;
}

export interface KnowledgeGraphProjection {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  availableRelationTypes: string[];
}

export interface KnowledgeGraphFilters {
  entityTypes: EntityType[];
  relationTypes: string[];
  includeOrphans: boolean;
}

export interface PositionedGraphNode extends KnowledgeGraphNode {
  x: number;
  y: number;
}

export interface PositionedKnowledgeGraph {
  width: number;
  height: number;
  nodes: PositionedGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export class KnowledgeGraphError extends Error {
  readonly code = "GRAPH_PROJECTION_FAILED";

  constructor(options: { cause?: unknown } = {}) {
    super("GRAPH_PROJECTION_FAILED", options);
    this.name = "KnowledgeGraphError";
  }
}

export function projectKnowledgeGraph(
  knowledge: KnowledgeState,
): KnowledgeGraphProjection {
  const parsed = knowledgeStateSchema.safeParse(knowledge);
  if (!parsed.success) {
    throw new KnowledgeGraphError({ cause: parsed.error });
  }

  const entityIds = new Set<string>();
  const relationshipIds = new Set<string>();
  for (const entity of parsed.data.entities) {
    if (entityIds.has(entity.id)) throw new KnowledgeGraphError();
    entityIds.add(entity.id);
  }
  for (const relationship of parsed.data.relationships) {
    if (relationshipIds.has(relationship.id)) throw new KnowledgeGraphError();
    relationshipIds.add(relationship.id);
  }

  const nodes = parsed.data.entities.map((entity) => {
    const relationshipCount = parsed.data.relationships.filter(
      (relationship) =>
        relationship.fromEntityId === entity.id ||
        relationship.toEntityId === entity.id,
    ).length;
    return {
      id: `node:${entity.id}`,
      entityId: entity.id,
      label: entity.name,
      entityType: entity.entityType,
      isOrphan: relationshipCount === 0,
      relationshipCount,
    };
  });

  const availableRelationTypes: string[] = [];
  const seenRelationTypes = new Set<string>();
  const edges = parsed.data.relationships.map((relationship) => {
    if (!seenRelationTypes.has(relationship.relationType)) {
      seenRelationTypes.add(relationship.relationType);
      availableRelationTypes.push(relationship.relationType);
    }
    return {
      id: `edge:${relationship.id}`,
      relationshipId: relationship.id,
      sourceNodeId: `node:${relationship.fromEntityId}`,
      targetNodeId: `node:${relationship.toEntityId}`,
      relationType: relationship.relationType,
      label: relationship.relationType,
    };
  });

  return { nodes, edges, availableRelationTypes };
}

export function filterKnowledgeGraph(
  projection: KnowledgeGraphProjection,
  filters: KnowledgeGraphFilters,
): KnowledgeGraphProjection {
  const entityTypes = new Set(filters.entityTypes);
  const relationTypes = new Set(filters.relationTypes);
  const nodes = projection.nodes.filter(
    (node) =>
      entityTypes.has(node.entityType) &&
      (filters.includeOrphans || !node.isOrphan),
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = projection.edges.filter(
    (edge) =>
      relationTypes.has(edge.relationType) &&
      nodeIds.has(edge.sourceNodeId) &&
      nodeIds.has(edge.targetNodeId),
  );
  return {
    nodes,
    edges,
    availableRelationTypes: [...projection.availableRelationTypes],
  };
}

const GRAPH_WIDTH = 1180;
const GRAPH_MIN_HEIGHT = 520;
const GRAPH_PADDING_Y = 90;
const LANE_START_X = 120;
const LANE_GAP = 230;
const ROW_GAP = 145;

export function layoutKnowledgeGraph(
  projection: KnowledgeGraphProjection,
): PositionedKnowledgeGraph {
  const laneCounts = new Map<EntityType, number>();
  const nodes = projection.nodes.map((node) => {
    const row = laneCounts.get(node.entityType) ?? 0;
    laneCounts.set(node.entityType, row + 1);
    const lane = graphEntityTypeLanes.indexOf(node.entityType);
    return {
      ...node,
      x: LANE_START_X + lane * LANE_GAP,
      y: GRAPH_PADDING_Y + row * ROW_GAP,
    };
  });
  const largestLane = Math.max(0, ...laneCounts.values());
  const height = Math.max(
    GRAPH_MIN_HEIGHT,
    GRAPH_PADDING_Y * 2 + Math.max(0, largestLane - 1) * ROW_GAP + 90,
  );
  return {
    width: GRAPH_WIDTH,
    height,
    nodes,
    edges: projection.edges.map((edge) => ({ ...edge })),
  };
}

