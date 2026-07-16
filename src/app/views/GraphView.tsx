import { useMemo, useState, type KeyboardEvent } from "react";

import {
  filterKnowledgeGraph,
  graphEntityTypeLanes,
  layoutKnowledgeGraph,
  projectKnowledgeGraph,
  type KnowledgeGraphFilters,
} from "../../core/graph";
import type { KnowledgeState } from "../../core/knowledge";
import { EntityDetail, RelationshipDetail } from "../knowledge/EntityDetail";
import type { ApplicationControllerActions } from "../state/useApplicationController";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function activateOnKeyboard<TElement extends Element>(
  event: KeyboardEvent<TElement>,
  action: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

export function GraphView(props: {
  knowledge: KnowledgeState;
  filters: KnowledgeGraphFilters;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  actions: ApplicationControllerActions;
}) {
  const [zoom, setZoom] = useState(1);
  const graphState = useMemo(() => {
    try {
      const projection = projectKnowledgeGraph(props.knowledge);
      const filtered = filterKnowledgeGraph(projection, props.filters);
      return {
        projection,
        layout: layoutKnowledgeGraph(filtered),
        error: false,
      };
    } catch {
      return { projection: null, layout: null, error: true };
    }
  }, [props.filters, props.knowledge]);

  if (graphState.error || graphState.projection === null || graphState.layout === null) {
    return (
      <main className="page-shell">
        <section className="panel empty-state" role="alert">
          <h1>Knowledge Graphを作成できません</h1>
          <p>登録済みKnowledgeの整合性を確認してください。</p>
          <code>GRAPH_PROJECTION_FAILED</code>
        </section>
      </main>
    );
  }

  const { projection, layout } = graphState;
  const positionedNodes = new Map(layout.nodes.map((node) => [node.id, node]));
  const selectedEntity = props.knowledge.entities.find(
    (entity) => entity.id === props.selectedEntityId,
  );
  const selectedRelationship = props.knowledge.relationships.find(
    (relationship) => relationship.id === props.selectedRelationshipId,
  );
  const visibleRelationships = layout.edges.flatMap((edge) => {
    const relationship = props.knowledge.relationships.find(
      (candidate) => candidate.id === edge.relationshipId,
    );
    return relationship === undefined ? [] : [relationship];
  });
  const setFilters = (filters: KnowledgeGraphFilters) =>
    props.actions.setGraphFilters(filters);

  return (
    <main className="page-shell">
      <section className="page-intro">
        <p className="eyebrow">Read-only derived view</p>
        <h1>Knowledge Graph</h1>
        <p>正本Knowledgeから毎回決定的に再構築します。座標やfilterは保存しません。</p>
      </section>

      <section className="panel graph-controls" aria-labelledby="graph-controls-title">
        <div className="section-heading">
          <h2 id="graph-controls-title">Graph controls</h2>
          <div className="button-row compact">
            <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoom((value) => clampZoom(value - ZOOM_STEP))}>−</button>
            <strong aria-live="polite">{Math.round(zoom * 100)}%</strong>
            <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoom((value) => clampZoom(value + ZOOM_STEP))}>＋</button>
            <button type="button" onClick={() => setZoom(1)}>Reset view</button>
            <button type="button" onClick={() => setZoom(clampZoom(Math.min(1, 900 / layout.width, 520 / layout.height)))}>Fit view</button>
          </div>
        </div>
        <div className="filter-grid">
          <fieldset>
            <legend>EntityType</legend>
            {graphEntityTypeLanes.map((entityType) => (
              <label key={entityType} className="check-label">
                <input
                  type="checkbox"
                  checked={props.filters.entityTypes.includes(entityType)}
                  onChange={() => setFilters({
                    ...props.filters,
                    entityTypes: graphEntityTypeLanes.filter((candidate) =>
                      candidate === entityType
                        ? !props.filters.entityTypes.includes(candidate)
                        : props.filters.entityTypes.includes(candidate),
                    ),
                  })}
                />
                {entityType}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>relationType</legend>
            {projection.availableRelationTypes.length === 0 ? <p>Relationshipはありません。</p> : projection.availableRelationTypes.map((relationType) => (
              <label key={relationType} className="check-label">
                <input
                  type="checkbox"
                  checked={props.filters.relationTypes.includes(relationType)}
                  onChange={() => setFilters({
                    ...props.filters,
                    relationTypes: props.filters.relationTypes.includes(relationType)
                      ? props.filters.relationTypes.filter((candidate) => candidate !== relationType)
                      : [...props.filters.relationTypes, relationType],
                  })}
                />
                {relationType}
              </label>
            ))}
          </fieldset>
          <label className="orphan-toggle">
            <input
              type="checkbox"
              checked={props.filters.includeOrphans}
              onChange={(event) => setFilters({ ...props.filters, includeOrphans: event.target.checked })}
            />
            Orphan Entityを表示
          </label>
        </div>
        <div className="graph-legend" aria-label="EntityType legend">
          {graphEntityTypeLanes.map((entityType) => <span key={entityType} className={`legend-${entityType}`}>{entityType}</span>)}
          <span>矢印はRelationshipの方向</span>
        </div>
      </section>

      <section className="panel graph-panel" aria-labelledby="graph-viewport-title">
        <div className="section-heading">
          <h2 id="graph-viewport-title">Graph viewport</h2>
          <strong>{layout.nodes.length} nodes · {layout.edges.length} edges</strong>
        </div>
        {layout.nodes.length === 0 ? (
          <div className="empty-state"><h3>filterに一致するNodeはありません</h3></div>
        ) : (
          <div className="graph-scroll">
            <svg
              className="knowledge-graph"
              role="group"
              aria-label={`Knowledge Graph: ${layout.nodes.length} nodes and ${layout.edges.length} directed edges`}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              style={{ width: layout.width * zoom, height: layout.height * zoom }}
            >
              <defs>
                <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L8,4 L0,8 z" />
                </marker>
              </defs>
              {layout.edges.map((edge) => {
                const source = positionedNodes.get(edge.sourceNodeId);
                const target = positionedNodes.get(edge.targetNodeId);
                if (source === undefined || target === undefined) return null;
                const selected = edge.relationshipId === props.selectedRelationshipId;
                return (
                  <g
                    key={edge.id}
                    className={`graph-edge ${selected ? "graph-edge-selected" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${source.label} ${edge.relationType} ${target.label}`}
                    onClick={() => props.actions.selectRelationship(edge.relationshipId)}
                    onKeyDown={(event) => activateOnKeyboard(event, () => props.actions.selectRelationship(edge.relationshipId))}
                  >
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} markerEnd="url(#graph-arrow)" />
                    <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 8}>{edge.label}</text>
                  </g>
                );
              })}
              {layout.nodes.map((node) => (
                <g
                  key={node.id}
                  className={`graph-node graph-node-${node.entityType} ${node.entityId === props.selectedEntityId ? "graph-node-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={node.entityId === props.selectedEntityId}
                  aria-label={`${node.label}, ${node.entityType}, ${node.relationshipCount} relationships${node.isOrphan ? ", orphan" : ""}`}
                  transform={`translate(${node.x} ${node.y})`}
                  onClick={() => props.actions.selectEntity(node.entityId)}
                  onKeyDown={(event) => activateOnKeyboard(event, () => props.actions.selectEntity(node.entityId))}
                >
                  <rect x="-92" y="-42" width="184" height="84" rx="14" />
                  <text className="graph-node-name" textAnchor="middle" y="-10">{node.label}</text>
                  <text textAnchor="middle" y="13">{node.entityType}</text>
                  <text textAnchor="middle" y="31">{node.relationshipCount} relationships{node.isOrphan ? " · orphan" : ""}</text>
                </g>
              ))}
            </svg>
          </div>
        )}
      </section>

      <div className="graph-detail-layout">
        <section className="panel" aria-labelledby="graph-relationships-title">
          <div className="section-heading"><h2 id="graph-relationships-title">Visible Relationships</h2><span>{visibleRelationships.length}</span></div>
          {visibleRelationships.length === 0 ? <p className="empty-copy">表示対象Relationshipはありません。</p> : (
            <nav className="relationship-selection-list" aria-label="Graph Relationship一覧">
              {visibleRelationships.map((relationship) => {
                const from = props.knowledge.entities.find((entity) => entity.id === relationship.fromEntityId)?.name ?? relationship.fromEntityId;
                const to = props.knowledge.entities.find((entity) => entity.id === relationship.toEntityId)?.name ?? relationship.toEntityId;
                return (
                  <button
                    type="button"
                    key={relationship.id}
                    aria-pressed={props.selectedRelationshipId === relationship.id}
                    onClick={() => props.actions.selectRelationship(relationship.id)}
                    onKeyDown={(event) =>
                      activateOnKeyboard(event, () =>
                        props.actions.selectRelationship(relationship.id),
                      )
                    }
                  >
                    <span>{from} <strong>{relationship.relationType}</strong> {to}</span><code>{relationship.id}</code>
                  </button>
                );
              })}
            </nav>
          )}
        </section>
        <section className="panel">
          {selectedRelationship === undefined ? <div className="empty-state"><h2>Relationshipを選択してください</h2></div> : <RelationshipDetail relationship={selectedRelationship} knowledge={props.knowledge} />}
        </section>
      </div>

      <section className="panel graph-entity-detail">
        {selectedEntity === undefined ? <div className="empty-state"><h2>Nodeを選択してください</h2></div> : <EntityDetail entity={selectedEntity} knowledge={props.knowledge} />}
      </section>
    </main>
  );
}
