import { calculateKnowledgeInsights } from "../../core/insights";
import type { Entity } from "../../core/entities/entity";
import type { SourceRef } from "../../core/shared/sourceRef";
import type { StorageSnapshot } from "../../core/storage";
import type { ApplicationControllerActions } from "../state/useApplicationController";

function SourceRefList(props: { sourceRefs: readonly SourceRef[] }) {
  if (props.sourceRefs.length === 0) return <p>SourceRefはありません。</p>;
  return (
    <ul className="source-list">
      {props.sourceRefs.map((sourceRef) => (
        <li key={`${sourceRef.documentId}-${sourceRef.fileName}-${sourceRef.excerpt}`}>
          <blockquote>{sourceRef.excerpt}</blockquote>
          <small>{sourceRef.fileName} · {sourceRef.documentId}</small>
        </li>
      ))}
    </ul>
  );
}

function EntityDetail(props: { entity: Entity; snapshot: StorageSnapshot }) {
  const incoming = props.snapshot.knowledge.relationships.filter(
    (relationship) => relationship.toEntityId === props.entity.id,
  );
  const outgoing = props.snapshot.knowledge.relationships.filter(
    (relationship) => relationship.fromEntityId === props.entity.id,
  );
  const entityName = (id: string) =>
    props.snapshot.knowledge.entities.find((entity) => entity.id === id)?.name ?? id;

  return (
    <article className="entity-detail">
      <div className="candidate-title">
        <div><p className="eyebrow">{props.entity.entityType}</p><h2>{props.entity.name}</h2></div>
        <code>{props.entity.id}</code>
      </div>
      <p>{props.entity.description}</p>
      <dl className="detail-list">
        <div><dt>aliases</dt><dd>{props.entity.aliases.join(", ") || "—"}</dd></div>
        <div><dt>tags</dt><dd>{props.entity.tags.join(", ") || "—"}</dd></div>
        <div><dt>created</dt><dd>{props.entity.createdAt}</dd></div>
        <div><dt>updated</dt><dd>{props.entity.updatedAt}</dd></div>
      </dl>

      <section className="subpanel">
        <h3>Attributes</h3>
        {Object.entries(props.entity.attributes).length === 0 ? <p>属性はありません。</p> : (
          <div className="attribute-cards">
            {Object.entries(props.entity.attributes).map(([key, record]) => (
              <article key={key}>
                <h4>{key}</h4>
                <p>canonical: <code>{JSON.stringify(record.canonicalValue)}</code></p>
                <p>resolvedAt: {record.conflictResolvedAt ?? "未解決または競合なし"}</p>
                <ul>
                  {record.claims.map((claim, index) => (
                    <li key={`${index}-${claim.sourceRef.excerpt}`}>
                      <code>{JSON.stringify(claim.value)}</code> — {claim.sourceRef.excerpt}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="subpanel">
        <h3>Relationships</h3>
        <div className="relationship-columns">
          <div>
            <h4>Outgoing</h4>
            {outgoing.length === 0 ? <p>なし</p> : <ul>{outgoing.map((relationship) => <li key={relationship.id}>{props.entity.name} <strong>{relationship.relationType}</strong> {entityName(relationship.toEntityId)}</li>)}</ul>}
          </div>
          <div>
            <h4>Incoming</h4>
            {incoming.length === 0 ? <p>なし</p> : <ul>{incoming.map((relationship) => <li key={relationship.id}>{entityName(relationship.fromEntityId)} <strong>{relationship.relationType}</strong> {props.entity.name}</li>)}</ul>}
          </div>
        </div>
      </section>

      <section className="subpanel"><h3>Entity SourceRefs</h3><SourceRefList sourceRefs={props.entity.sourceRefs} /></section>
    </article>
  );
}

export function KnowledgeView(props: {
  snapshot: StorageSnapshot;
  selectedEntityId: string | null;
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
        <div className="revision-card"><span>Revision</span><strong>{props.snapshot.knowledgeRevision}</strong></div>
      </section>

      <section className="metric-grid knowledge-metrics" aria-label="Knowledge統計">
        <div><dt>Entities</dt><dd>{insights.statistics.entityCount}</dd></div>
        <div><dt>Relationships</dt><dd>{insights.statistics.relationshipCount}</dd></div>
        <div><dt>Orphans</dt><dd>{insights.statistics.orphanCount}</dd></div>
        <div><dt>Conflicts</dt><dd>{insights.statistics.unresolvedConflictCount}</dd></div>
      </section>

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
        {selectedEntity === undefined ? <div className="empty-state"><h2>Entityを選択してください</h2></div> : <EntityDetail entity={selectedEntity} snapshot={props.snapshot} />}
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
