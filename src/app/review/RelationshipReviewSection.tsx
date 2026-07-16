import { useState } from "react";

import { buildRelationshipKey } from "../../core/relationships/relationshipKey";
import type { RelationshipBlockedReason, RelationshipReviewRecord, ReviewSession } from "../../core/review/types";
import type { ApplicationControllerActions } from "../state/useApplicationController";

const blockedLabels: Record<RelationshipBlockedReason, string> = {
  unresolved_from: "始点を解決できません",
  unresolved_to: "終点を解決できません",
  unresolved_both: "両端を解決できません",
  ambiguous_from: "始点に複数候補があります",
  ambiguous_to: "終点に複数候補があります",
  ambiguous_both: "両端に複数候補があります",
  references_rejected_entity: "RejectされたEntityだけを参照しています",
};

function referenceLabel(reference: RelationshipReviewRecord["candidate"]["fromRef"]): string {
  if (reference.name !== undefined) return reference.name;
  return reference.candidateId ?? "未指定";
}

function RelationshipPanel(props: {
  review: RelationshipReviewRecord;
  session: ReviewSession;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const [fromEntityId, setFromEntityId] = useState(props.review.resolvedFromEntityId ?? "");
  const [toEntityId, setToEntityId] = useState(props.review.resolvedToEntityId ?? "");
  const candidate = props.review.candidate;
  const fromEntity = props.session.knowledge.entities.find(
    (entity) => entity.id === props.review.resolvedFromEntityId,
  );
  const toEntity = props.session.knowledge.entities.find(
    (entity) => entity.id === props.review.resolvedToEntityId,
  );
  const fromOptions = props.session.knowledge.entities.filter(
    (entity) => candidate.fromRef.entityType === undefined || entity.entityType === candidate.fromRef.entityType,
  );
  const toOptions = props.session.knowledge.entities.filter(
    (entity) => candidate.toRef.entityType === undefined || entity.entityType === candidate.toRef.entityType,
  );
  const duplicateRelationship =
    props.review.resolvedFromEntityId === null || props.review.resolvedToEntityId === null
      ? null
      : props.session.knowledge.relationships.find(
          (relationship) =>
            buildRelationshipKey(relationship) ===
            buildRelationshipKey({
              fromEntityId: props.review.resolvedFromEntityId as string,
              toEntityId: props.review.resolvedToEntityId as string,
              relationType: candidate.relationType,
            }),
        ) ?? null;

  return (
    <article className="candidate-panel">
      <div className="candidate-title">
        <div>
          <p className="eyebrow">Relationship</p>
          <h3>{referenceLabel(candidate.fromRef)} → {candidate.relationType} → {referenceLabel(candidate.toRef)}</h3>
        </div>
        <span className={`status-chip status-${props.review.status}`}>{props.review.status}</span>
      </div>
      <dl className="detail-list">
        <div><dt>fromRef</dt><dd><code>{JSON.stringify(candidate.fromRef)}</code></dd></div>
        <div><dt>toRef</dt><dd><code>{JSON.stringify(candidate.toRef)}</code></dd></div>
        <div><dt>resolved from</dt><dd>{fromEntity?.name ?? "未解決"}</dd></div>
        <div><dt>resolved to</dt><dd>{toEntity?.name ?? "未解決"}</dd></div>
        <div><dt>description</dt><dd>{candidate.description || "—"}</dd></div>
      </dl>

      {props.review.blockedReason !== null && (
        <p className="callout warning-callout">
          <strong>Blocked:</strong> {blockedLabels[props.review.blockedReason]}
          {props.review.recommendation === "reject" && "（Rejectを推奨）"}
        </p>
      )}

      {duplicateRelationship !== null && props.review.status === "pending" && (
        <p className="callout info-callout">
          Acceptすると既存Relationship <code>{duplicateRelationship.id}</code> へSourceRefを統合します。
        </p>
      )}

      <section className="subpanel">
        <h4>SourceRefs</h4>
        {candidate.sourceRefs.map((sourceRef) => (
          <blockquote key={`${sourceRef.documentId}-${sourceRef.excerpt}`}>
            {sourceRef.excerpt}<cite>{sourceRef.fileName}</cite>
          </blockquote>
        ))}
      </section>

      {(props.review.status === "pending" || props.review.status === "blocked") && (
        <>
          <form className="subpanel form-stack" onSubmit={(event) => {
            event.preventDefault();
            void props.actions.setManualRelationshipResolution(candidate.candidateId, {
              ...(fromEntityId.length === 0 ? {} : { fromEntityId }),
              ...(toEntityId.length === 0 ? {} : { toEntityId }),
            });
          }}>
            <h4>端点を手動解決</h4>
            <div className="form-row">
              <label>
                from Entity
                <select value={fromEntityId} onChange={(event) => setFromEntityId(event.target.value)}>
                  <option value="">未選択</option>
                  {fromOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} ({entity.entityType})</option>)}
                </select>
              </label>
              <label>
                to Entity
                <select value={toEntityId} onChange={(event) => setToEntityId(event.target.value)}>
                  <option value="">未選択</option>
                  {toOptions.map((entity) => <option key={entity.id} value={entity.id}>{entity.name} ({entity.entityType})</option>)}
                </select>
              </label>
            </div>
            <button type="submit" disabled={props.isBusy}>手動解決を適用</button>
          </form>
          <div className="button-row action-row">
            <button
              className="primary-button"
              type="button"
              disabled={props.isBusy || props.review.status !== "pending"}
              onClick={() => void props.actions.acceptRelationshipCandidate(candidate.candidateId)}
            >
              Accept Relationship
            </button>
            <button
              type="button"
              disabled={props.isBusy}
              onClick={() => void props.actions.rejectRelationshipCandidate(candidate.candidateId)}
            >
              Reject Relationship
            </button>
          </div>
        </>
      )}

      {(props.review.status === "accepted" || props.review.status === "merged" || props.review.status === "rejected") && (
        <p className="reviewed-note">
          このCandidateは{props.review.status}として保存済みです。
          {props.review.registeredRelationshipId !== null && <> 登録先: <code>{props.review.registeredRelationshipId}</code></>}
        </p>
      )}
    </article>
  );
}

export function RelationshipReviewSection(props: {
  session: ReviewSession;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const initialReview =
    props.session.relationshipReviews.find(
      (review) => review.status === "pending" || review.status === "blocked",
    ) ?? props.session.relationshipReviews[0];
  const [selectedId, setSelectedId] = useState(initialReview?.candidateId ?? "");
  const review =
    props.session.relationshipReviews.find((candidate) => candidate.candidateId === selectedId) ??
    props.session.relationshipReviews[0];
  const terminalStatuses = new Set(["accepted", "merged", "rejected"]);
  const reviewedCount = props.session.relationshipReviews.filter((item) =>
    terminalStatuses.has(item.status),
  ).length;
  const allReviewed = reviewedCount === props.session.relationshipReviews.length;

  return (
    <section aria-labelledby="relationship-review-title">
      <div className="review-toolbar">
        <div><p className="eyebrow">Phase 2</p><h2 id="relationship-review-title">Relationship Candidate Review</h2></div>
        <strong>{reviewedCount} / {props.session.relationshipReviews.length} reviewed</strong>
      </div>
      {review === undefined ? (
        <div className="panel empty-state"><h3>Relationship Candidateはありません</h3></div>
      ) : (
        <div className="review-layout">
          <nav className="candidate-list" aria-label="Relationship Candidate一覧">
            {props.session.relationshipReviews.map((item) => (
              <button
                type="button"
                key={item.candidateId}
                aria-pressed={item.candidateId === review.candidateId}
                className={item.candidateId === review.candidateId ? "candidate-selected" : ""}
                onClick={() => setSelectedId(item.candidateId)}
              >
                <span><strong>{item.candidate.relationType}</strong><small>{referenceLabel(item.candidate.fromRef)} → {referenceLabel(item.candidate.toRef)}</small></span>
                <span className={`status-chip status-${item.status}`}>{item.status}</span>
                {item.blockedReason !== null && <small>Blocked: {blockedLabels[item.blockedReason]}</small>}
              </button>
            ))}
          </nav>
          <RelationshipPanel
            key={review.candidateId}
            review={review}
            session={props.session}
            isBusy={props.isBusy}
            actions={props.actions}
          />
        </div>
      )}
      <div className="phase-footer">
        <p>{allReviewed ? "すべてのRelationship Candidateを処理しました。" : "pendingまたはblockedのCandidateがあります。"}</p>
        <button
          className="primary-button"
          type="button"
          disabled={!allReviewed || props.isBusy}
          onClick={() => void props.actions.completeAndApplyReviewSession()}
        >
          Reviewを完了してKnowledgeへ反映
        </button>
      </div>
    </section>
  );
}
