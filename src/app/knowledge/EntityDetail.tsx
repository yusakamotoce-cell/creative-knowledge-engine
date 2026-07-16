import type { Entity } from "../../core/entities/entity";
import type { KnowledgeState } from "../../core/knowledge";
import type { Relationship } from "../../core/relationships/relationship";
import type { SourceRef } from "../../core/shared/sourceRef";

export function SourceRefList(props: { sourceRefs: readonly SourceRef[] }) {
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

export function EntityDetail(props: {
  entity: Entity;
  knowledge: KnowledgeState;
}) {
  const incoming = props.knowledge.relationships.filter(
    (relationship) => relationship.toEntityId === props.entity.id,
  );
  const outgoing = props.knowledge.relationships.filter(
    (relationship) => relationship.fromEntityId === props.entity.id,
  );
  const entityName = (id: string) =>
    props.knowledge.entities.find((entity) => entity.id === id)?.name ?? id;

  return (
    <article className="entity-detail" aria-labelledby={`entity-detail-${props.entity.id}`}>
      <div className="candidate-title">
        <div>
          <p className="eyebrow">{props.entity.entityType}</p>
          <h2 id={`entity-detail-${props.entity.id}`}>{props.entity.name}</h2>
        </div>
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
        {Object.entries(props.entity.attributes).length === 0 ? (
          <p>属性はありません。</p>
        ) : (
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
            {outgoing.length === 0 ? <p>なし</p> : (
              <ul>{outgoing.map((relationship) => (
                <li key={relationship.id}>{props.entity.name} <strong>{relationship.relationType}</strong> {entityName(relationship.toEntityId)}</li>
              ))}</ul>
            )}
          </div>
          <div>
            <h4>Incoming</h4>
            {incoming.length === 0 ? <p>なし</p> : (
              <ul>{incoming.map((relationship) => (
                <li key={relationship.id}>{entityName(relationship.fromEntityId)} <strong>{relationship.relationType}</strong> {props.entity.name}</li>
              ))}</ul>
            )}
          </div>
        </div>
      </section>

      <section className="subpanel">
        <h3>Entity SourceRefs</h3>
        <SourceRefList sourceRefs={props.entity.sourceRefs} />
      </section>
    </article>
  );
}

export function RelationshipDetail(props: {
  relationship: Relationship;
  knowledge: KnowledgeState;
}) {
  const entityName = (id: string) =>
    props.knowledge.entities.find((entity) => entity.id === id)?.name ?? id;
  return (
    <article className="entity-detail" aria-labelledby={`relationship-detail-${props.relationship.id}`}>
      <div className="candidate-title">
        <div>
          <p className="eyebrow">Directed Relationship</p>
          <h2 id={`relationship-detail-${props.relationship.id}`}>
            {entityName(props.relationship.fromEntityId)} → {props.relationship.relationType} → {entityName(props.relationship.toEntityId)}
          </h2>
        </div>
        <code>{props.relationship.id}</code>
      </div>
      <p>{props.relationship.description || "説明はありません。"}</p>
      <section className="subpanel">
        <h3>Relationship SourceRefs</h3>
        <SourceRefList sourceRefs={props.relationship.sourceRefs} />
      </section>
    </article>
  );
}

