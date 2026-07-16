import { calculateKnowledgeInsights } from "../../core/insights";
import type { StorageSnapshot } from "../../core/storage";
import { EntityDetail, SourceRefList } from "../knowledge/EntityDetail";
import { KnowledgeExportPanel } from "../knowledge/KnowledgeExportPanel";
import type { ApplicationControllerActions } from "../state/useApplicationController";

export function KnowledgeView(props: {
  snapshot: StorageSnapshot;
  selectedEntityId: string | null;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const insights = calculateKnowledgeInsights(props.snapshot.knowledge);
  const selectedEntity =
    props.snapshot.knowledge.entities.find((entity) => entity.id === props.selectedEntityId) ??
    props.snapshot.knowledge.entities[0];
  const entityName = (id: string) =>
    props.snapshot.knowledge.entities.find((entity) => entity.id === id)?.name ?? id;

  return (
    <main className="page-shell">
      <section className="page-intro knowledge-intro">
        <div><p className="eyebrow">Registered Knowledge</p><h1>Knowledge & Insights</h1><p>正本Knowledgeだけから現在の構造と確認事項を表示します。</p></div>
        <div className="revision-card" aria-label="Knowledge revision"><span>Revision</span><strong>{props.snapshot.knowledgeRevision}</strong></div>
      </section>

      <section className="metric-grid knowledge-metrics" aria-label="Knowledge統計">
        <div><dt>Entities</dt><dd>{insights.statistics.entityCount}</dd></div>
        <div><dt>Relationships</dt><dd>{insights.statistics.relationshipCount}</dd></div>
        <div><dt>Orphans</dt><dd>{insights.statistics.orphanCount}</dd></div>
        <div><dt>Conflicts</dt><dd>{insights.statistics.unresolvedConflictCount}</dd></div>
      </section>

      <KnowledgeExportPanel
        snapshot={props.snapshot}
        isBusy={props.isBusy}
        actions={props.actions}
      />

      <section className="panel" aria-labelledby="type-statistics-title">
        <div className="section-heading"><h2 id="type-statistics-title">Entity types</h2></div>
        <dl className="type-statistics">
          {Object.entries(insights.statistics.entityCountByType).map(([type, count]) => <div key={type}><dt>{type}</dt><dd>{count}</dd></div>)}
        </dl>
      </section>

      <div className="insight-grid">
        <section className="panel" aria-labelledby="duplicates-title">
          <p className="eyebrow">Exact normalized match</p><h2 id="duplicates-title">Duplicate</h2>
          {insights.duplicateGroups.length === 0 ? <p className="empty-copy">Duplicate候補はありません。</p> : insights.duplicateGroups.map((group) => (
            <article className="insight-item" key={group.normalizedKey}>
              <code>{group.normalizedKey}</code>
              <ul>{group.entityIds.map((id) => <li key={id}><strong>{entityName(id)}</strong><small>{id}</small></li>)}</ul>
            </article>
          ))}
        </section>

        <section className="panel" aria-labelledby="conflicts-title">
          <p className="eyebrow">Unresolved claims</p><h2 id="conflicts-title">Conflict</h2>
          {insights.conflicts.length === 0 ? <p className="empty-copy">未解決Conflictはありません。</p> : insights.conflicts.map((conflict) => {
            const entity = props.snapshot.knowledge.entities.find((item) => item.id === conflict.entityId);
            const record = entity?.attributes[conflict.attributeKey];
            return (
              <article className="insight-item" key={`${conflict.entityId}-${conflict.attributeKey}`}>
                <h3>{entity?.name ?? conflict.entityId} · {conflict.attributeKey}</h3>
                <p>canonical: <code>{JSON.stringify(conflict.canonicalValue)}</code></p>
                <p>claims: {conflict.claimValues.map((value) => JSON.stringify(value)).join(" / ")}</p>
                <p>resolvedAt: {conflict.conflictResolvedAt ?? "未解決"}</p>
                {record !== undefined && <SourceRefList sourceRefs={record.claims.map((claim) => claim.sourceRef)} />}
              </article>
            );
          })}
        </section>

        <section className="panel" aria-labelledby="orphans-title">
          <p className="eyebrow">No registered links</p><h2 id="orphans-title">Orphan</h2>
          {insights.orphanEntityIds.length === 0 ? <p className="empty-copy">Orphan Entityはありません。</p> : (
            <ul className="insight-list">{insights.orphanEntityIds.map((id) => {
              const entity = props.snapshot.knowledge.entities.find((item) => item.id === id);
              return <li key={id}><strong>{entity?.name ?? id}</strong><span>{entity?.entityType}</span><code>{id}</code></li>;
            })}</ul>
          )}
        </section>
      </div>

      <section className="knowledge-browser panel" aria-labelledby="entities-title">
        <aside>
          <div className="section-heading"><h2 id="entities-title">Entities</h2><span>{props.snapshot.knowledge.entities.length}</span></div>
          {props.snapshot.knowledge.entities.length === 0 ? <p>登録済みEntityはありません。</p> : (
            <nav className="entity-list" aria-label="登録済みEntity一覧">
              {props.snapshot.knowledge.entities.map((entity) => {
                const relationshipCount = props.snapshot.knowledge.relationships.filter((relationship) => relationship.fromEntityId === entity.id || relationship.toEntityId === entity.id).length;
                return (
                  <button key={entity.id} type="button" aria-pressed={selectedEntity?.id === entity.id} className={selectedEntity?.id === entity.id ? "entity-selected" : ""} onClick={() => props.actions.selectEntity(entity.id)}>
                    <span><strong>{entity.name}</strong><small>{entity.entityType} · {entity.tags.join(", ") || "no tags"}</small></span><span>{relationshipCount} links</span>
                  </button>
                );
              })}
            </nav>
          )}
        </aside>
        {selectedEntity === undefined ? <div className="empty-state"><h2>Entityを選択してください</h2></div> : <EntityDetail entity={selectedEntity} knowledge={props.snapshot.knowledge} />}
      </section>

      <section className="panel" aria-labelledby="relationships-title">
        <div className="section-heading"><h2 id="relationships-title">Relationships</h2><span>{props.snapshot.knowledge.relationships.length}</span></div>
        {props.snapshot.knowledge.relationships.length === 0 ? <p className="empty-copy">登録済みRelationshipはありません。</p> : (
          <div className="relationship-table-wrap">
            <table>
              <thead><tr><th>From</th><th>Relation</th><th>To</th><th>SourceRefs</th></tr></thead>
              <tbody>{props.snapshot.knowledge.relationships.map((relationship) => (
                <tr key={relationship.id}><td>{entityName(relationship.fromEntityId)}</td><td><strong>{relationship.relationType}</strong><small>{relationship.id}</small></td><td>{entityName(relationship.toEntityId)}</td><td>{relationship.sourceRefs.map((sourceRef) => sourceRef.fileName).join(", ")}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
