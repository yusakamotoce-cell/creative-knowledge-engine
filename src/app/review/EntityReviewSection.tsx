import { useState } from "react";

import type { ReviewSession } from "../../core/review/types";
import type { ApplicationControllerActions } from "../state/useApplicationController";
import { EntityEditForm } from "./EntityEditForm";

export function EntityReviewSection(props: {
  session: ReviewSession;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const initialReview =
    props.session.entityReviews.find((review) => review.status === "pending") ??
    props.session.entityReviews[0];
  const [selectedId, setSelectedId] = useState(initialReview?.candidateId ?? "");
  const [confirmReject, setConfirmReject] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeName, setMergeName] = useState("");
  const [mergeDescription, setMergeDescription] = useState("");
  const review =
    props.session.entityReviews.find((candidate) => candidate.candidateId === selectedId) ??
    props.session.entityReviews[0];

  if (review === undefined) {
    return (
      <section className="panel empty-state">
        <h2>Entity Candidateはありません</h2>
        <button type="button" onClick={() => void props.actions.advanceToRelationships()}>
          Relationship Reviewへ進む
        </button>
      </section>
    );
  }

  const candidate = review.candidate;
  const pending = review.status === "pending";
  const reviewedCount = props.session.entityReviews.filter(
    (item) => item.status !== "pending",
  ).length;
  const allReviewed = reviewedCount === props.session.entityReviews.length;
  const duplicateEntities = review.duplicateEntityIds.flatMap((id) => {
    const entity = props.session.knowledge.entities.find((item) => item.id === id);
    return entity === undefined ? [] : [entity];
  });
  const mergeOptions = [
    ...duplicateEntities,
    ...props.session.knowledge.entities.filter(
      (entity) =>
        entity.entityType === candidate.entityType &&
        !review.duplicateEntityIds.includes(entity.id),
    ),
  ];

  return (
    <section aria-labelledby="entity-review-title">
      <div className="review-toolbar">
        <div>
          <p className="eyebrow">Phase 1</p>
          <h2 id="entity-review-title">Entity Candidate Review</h2>
        </div>
        <strong>{reviewedCount} / {props.session.entityReviews.length} reviewed</strong>
      </div>
      <div className="review-layout">
        <nav className="candidate-list" aria-label="Entity Candidate一覧">
          {props.session.entityReviews.map((item) => (
            <button
              type="button"
              key={item.candidateId}
              aria-pressed={item.candidateId === review.candidateId}
              className={item.candidateId === review.candidateId ? "candidate-selected" : ""}
              onClick={() => {
                setSelectedId(item.candidateId);
                setConfirmReject(false);
                setMergeTarget("");
              }}
            >
              <span><strong>{item.candidate.name}</strong><small>{item.candidate.entityType}</small></span>
              <span className={`status-chip status-${item.status}`}>{item.status}</span>
              {item.duplicateEntityIds.length > 0 && <small>{item.duplicateEntityIds.length} Duplicate候補</small>}
            </button>
          ))}
        </nav>

        <article className="candidate-panel">
          <div className="candidate-title">
            <div><p className="eyebrow">{candidate.entityType}</p><h3>{candidate.name}</h3></div>
            <span className={`status-chip status-${review.status}`}>{review.status}</span>
          </div>
          <p>{candidate.description || "説明はありません。"}</p>
          <dl className="detail-list">
            <div><dt>candidateId</dt><dd><code>{candidate.candidateId}</code></dd></div>
            <div><dt>aliases</dt><dd>{candidate.aliases.join(", ") || "—"}</dd></div>
            <div><dt>tags</dt><dd>{candidate.tags.join(", ") || "—"}</dd></div>
            <div><dt>attributes</dt><dd><code>{JSON.stringify(candidate.attributes)}</code></dd></div>
          </dl>

          <section className="subpanel">
            <h4>SourceRefs</h4>
            {candidate.sourceRefs.map((sourceRef) => (
              <blockquote key={`${sourceRef.documentId}-${sourceRef.excerpt}`}>
                {sourceRef.excerpt}<cite>{sourceRef.fileName}</cite>
              </blockquote>
            ))}
          </section>

          <section className={`subpanel ${duplicateEntities.length > 0 ? "warning-callout" : ""}`}>
            <h4>Duplicate候補</h4>
            {duplicateEntities.length === 0 ? <p>完全一致する登録済みEntityはありません。</p> : (
              <ul>{duplicateEntities.map((entity) => <li key={entity.id}><strong>{entity.name}</strong> <code>{entity.id}</code></li>)}</ul>
            )}
          </section>

          {pending ? (
            <>
              <div className="button-row action-row">
                <button className="primary-button" type="button" disabled={props.isBusy} onClick={() => void props.actions.acceptEntityCandidate(candidate.candidateId)}>
                  Accept as new
                </button>
                {!confirmReject ? (
                  <button type="button" onClick={() => setConfirmReject(true)}>Reject</button>
                ) : (
                  <button className="danger-button" type="button" disabled={props.isBusy} onClick={() => void props.actions.rejectEntityCandidate(candidate.candidateId)}>
                    Rejectを確定
                  </button>
                )}
              </div>
              {duplicateEntities.length > 0 && <p className="supporting-note">Duplicate候補があります。別EntityとしてAcceptすることもできます。</p>}

              <form className="subpanel form-stack" onSubmit={(event) => {
                event.preventDefault();
                if (mergeTarget.length === 0) return;
                void props.actions.mergeEntityCandidate(candidate.candidateId, mergeTarget, {
                  ...(mergeName.trim().length === 0 ? {} : { name: mergeName }),
                  ...(mergeDescription.trim().length === 0 ? {} : { description: mergeDescription }),
                });
              }}>
                <h4>登録済みEntityへMerge</h4>
                <label>
                  merge先
                  <select value={mergeTarget} onChange={(event) => setMergeTarget(event.target.value)}>
                    <option value="">選択してください</option>
                    {mergeOptions.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {review.duplicateEntityIds.includes(entity.id) ? "Duplicate: " : ""}{entity.name} ({entity.id})
                      </option>
                    ))}
                  </select>
                </label>
                <label>最終name（空欄なら既存値）<input value={mergeName} onChange={(event) => setMergeName(event.target.value)} /></label>
                <label>最終description（空欄なら既存値）<textarea rows={2} value={mergeDescription} onChange={(event) => setMergeDescription(event.target.value)} /></label>
                <button type="submit" disabled={props.isBusy || mergeTarget.length === 0}>Merge</button>
              </form>

              <EntityEditForm
                key={`${candidate.candidateId}-${JSON.stringify(candidate)}`}
                candidate={candidate}
                disabled={props.isBusy}
                onSave={(edit) => void props.actions.editEntityCandidate(candidate.candidateId, edit)}
              />
            </>
          ) : (
            <p className="reviewed-note">このCandidateは{review.status}として保存済みです。{review.registeredEntityId !== null && <> 登録先: <code>{review.registeredEntityId}</code></>}</p>
          )}
        </article>
      </div>
      <div className="phase-footer">
        <p>{allReviewed ? "すべてのEntity Candidateを処理しました。" : "未処理のEntity Candidateがあります。"}</p>
        <button className="primary-button" type="button" disabled={!allReviewed || props.isBusy} onClick={() => void props.actions.advanceToRelationships()}>
          Relationship Reviewへ進む
        </button>
      </div>
    </section>
  );
}
