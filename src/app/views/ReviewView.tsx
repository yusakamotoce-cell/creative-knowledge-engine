import type { StorageSnapshot } from "../../core/storage";
import { EntityReviewSection } from "../review/EntityReviewSection";
import { RelationshipReviewSection } from "../review/RelationshipReviewSection";
import type { ApplicationControllerActions } from "../state/useApplicationController";

export function ReviewView(props: {
  snapshot: StorageSnapshot;
  activeReviewSessionId: string | null;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const session = props.snapshot.reviewSessions.find(
    (candidate) => candidate.id === props.activeReviewSessionId,
  );

  if (session === undefined) {
    return (
      <main className="page-shell">
        <section className="panel empty-state">
          <h1>Review Sessionが選択されていません</h1>
          <button type="button" onClick={props.actions.resumeWorkspace}>保存済み作業を探す</button>
        </section>
      </main>
    );
  }

  const document = props.snapshot.importedDocuments.find(
    (candidate) => candidate.id === session.documentId,
  );

  return (
    <main className="page-shell review-page">
      <header className="review-header">
        <div>
          <p className="eyebrow">Candidate Review</p>
          <h1>{document?.fileName ?? session.documentId}</h1>
          <p>Session <code>{session.id}</code> · base revision {session.baseKnowledgeRevision}</p>
        </div>
        <span className={`phase-badge phase-${session.phase}`}>{session.phase}</span>
      </header>

      {session.phase === "entities" && (
        <EntityReviewSection
          key={session.id}
          session={session}
          isBusy={props.isBusy}
          actions={props.actions}
        />
      )}
      {session.phase === "relationships" && (
        <RelationshipReviewSection
          key={session.id}
          session={session}
          isBusy={props.isBusy}
          actions={props.actions}
        />
      )}
      {session.phase === "complete" && (
        <section className="panel completion-panel">
          <p className="eyebrow">Complete, not applied</p>
          <h2>Review結果を正本Knowledgeへ反映できます</h2>
          <p>Sessionは保存済みです。失敗しても再度この画面から適用できます。</p>
          <button className="primary-button" type="button" disabled={props.isBusy} onClick={() => void props.actions.completeAndApplyReviewSession()}>
            正本Knowledgeへ反映
          </button>
        </section>
      )}
    </main>
  );
}
