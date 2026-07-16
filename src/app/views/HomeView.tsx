import { useEffect, useRef } from "react";

import type { StorageSnapshot } from "../../core/storage";
import type { ProjectAstraFixture } from "../../data/demo/project-astra";
import { ProjectAstraProgress } from "../demo/ProjectAstraProgress";
import {
  deriveProjectAstraProgress,
  isEmptyWorkspace,
} from "../state/projectAstraProgress";
import type {
  ApplicationControllerActions,
} from "../state/useApplicationController";
import type { ResetIntent } from "../state/types";

function ResetConfirmation(props: {
  intent: Exclude<ResetIntent, null>;
  isBusy: boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelButton.current?.focus(), []);

  return (
    <section
      className="confirmation-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-title"
    >
      <p className="eyebrow">Explicit reset</p>
      <h2 id="reset-title">現在のWorkspaceを初期化しますか？</h2>
      <p>
        保存済みKnowledge、Review、Import履歴を空Snapshotへ置き換えます。自動backupは作成しません。
      </p>
      <div className="button-row">
        <button ref={cancelButton} type="button" onClick={props.onCancel}>
          現在のWorkspaceを維持
        </button>
        <button
          className="danger-button"
          type="button"
          disabled={props.isBusy}
          onClick={props.onConfirm}
        >
          {props.intent === "demo" ? "Demo用に初期化" : "空Workspaceへ初期化"}
        </button>
      </div>
    </section>
  );
}

export function HomeView(props: {
  snapshot: StorageSnapshot;
  projectAstra: ProjectAstraFixture;
  isBusy: boolean;
  resetIntent: ResetIntent;
  actions: ApplicationControllerActions;
}) {
  const empty = isEmptyWorkspace(props.snapshot);
  const progress = deriveProjectAstraProgress(props.snapshot, props.projectAstra);
  const incompleteSessions = props.snapshot.reviewSessions.filter(
    (session) => session.phase !== "complete",
  ).length;
  const awaitingApply = props.snapshot.reviewSessions.filter(
    (session) =>
      session.phase === "complete" &&
      !props.snapshot.reviewApplications.some(
        (application) => application.reviewSessionId === session.id,
      ),
  ).length;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Creative knowledge, reviewed by you</p>
          <h1>散らばった設定を、信頼できるKnowledgeへ。</h1>
          <p className="hero-copy">
            Candidateを一件ずつ確認し、関係性と出典を保ったまま作品世界の知識を育てます。
          </p>
          <div className="button-row">
            <button
              className="primary-button"
              type="button"
              disabled={props.isBusy}
              onClick={() => void props.actions.startOrResumeProjectAstra()}
            >
              {progress.every((item) => item.status === "applied")
                ? "Project Astraの完成Knowledgeを見る"
                : "Project Astra Demoを開始"}
            </button>
            <button type="button" onClick={() => props.actions.navigate("import")}>
              文書をImport
            </button>
          </div>
          <p className="supporting-note">Demo ModeはAPI keyもnetwork接続も不要です。</p>
        </div>
        <div className="hero-metric" aria-label="現在のKnowledge revision">
          <span>Knowledge revision</span>
          <strong>{props.snapshot.knowledgeRevision}</strong>
        </div>
      </section>

      {!empty && (
        <section className="workspace-summary panel" aria-labelledby="workspace-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Saved workspace</p>
              <h2 id="workspace-title">作業状況</h2>
            </div>
            <div className="button-row compact">
              <button type="button" onClick={props.actions.resumeWorkspace}>
                作業を再開
              </button>
              <button type="button" onClick={() => props.actions.navigate("knowledge")}>
                Knowledgeを見る
              </button>
            </div>
          </div>
          <dl className="metric-grid">
            <div><dt>Documents</dt><dd>{props.snapshot.importedDocuments.length}</dd></div>
            <div><dt>Review中</dt><dd>{incompleteSessions}</dd></div>
            <div><dt>反映待ち</dt><dd>{awaitingApply}</dd></div>
            <div><dt>Entities</dt><dd>{props.snapshot.knowledge.entities.length}</dd></div>
          </dl>
          <button
            className="text-danger"
            type="button"
            onClick={() => props.actions.requestReset("empty")}
          >
            Workspaceをリセット
          </button>
        </section>
      )}

      <ProjectAstraProgress progress={progress} />

      {props.resetIntent !== null && (
        <ResetConfirmation
          intent={props.resetIntent}
          isBusy={props.isBusy}
          onCancel={props.actions.cancelReset}
          onConfirm={() => void props.actions.confirmReset()}
        />
      )}
    </main>
  );
}
