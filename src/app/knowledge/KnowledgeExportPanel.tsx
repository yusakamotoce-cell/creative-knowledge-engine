import { useMemo, useState } from "react";

import {
  createKnowledgeExport,
  serializeKnowledgeExport,
} from "../../core/export";
import type { StorageSnapshot } from "../../core/storage";
import type { ApplicationControllerActions } from "../state/useApplicationController";

export function KnowledgeExportPanel(props: {
  snapshot: StorageSnapshot;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const preview = useMemo(
    () => serializeKnowledgeExport(createKnowledgeExport(props.snapshot)),
    [props.snapshot],
  );

  return (
    <section className="panel export-panel" aria-labelledby="knowledge-export-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portable canonical data</p>
          <h2 id="knowledge-export-title">Knowledge JSON Export</h2>
        </div>
        <div className="button-row compact">
          <button
            type="button"
            aria-expanded={previewOpen}
            aria-controls="knowledge-export-preview"
            onClick={() => setPreviewOpen((current) => !current)}
          >
            {previewOpen ? "JSON previewを閉じる" : "JSON previewを表示"}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={props.isBusy}
            onClick={() => void props.actions.exportKnowledge()}
          >
            Knowledge JSONをダウンロード
          </button>
        </div>
      </div>
      <dl className="metric-grid export-metrics">
        <div><dt>Revision</dt><dd>{props.snapshot.knowledgeRevision}</dd></div>
        <div><dt>Entities</dt><dd>{props.snapshot.knowledge.entities.length}</dd></div>
        <div><dt>Relationships</dt><dd>{props.snapshot.knowledge.relationships.length}</dd></div>
      </dl>
      <p>
        Entity、Relationship、attributes、claims、SourceRefs、timestampsをversion付き単一JSONへ出力します。
      </p>
      <p className="supporting-note">
        raw Document、Import Registry、Candidate、Review Session、Application履歴、UI状態、Insightsは含みません。
      </p>
      {previewOpen && (
        <pre id="knowledge-export-preview" className="json-preview" tabIndex={0}>
          {preview}
        </pre>
      )}
    </section>
  );
}

