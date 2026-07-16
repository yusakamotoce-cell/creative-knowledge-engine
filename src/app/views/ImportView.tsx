import { useState, type ChangeEvent, type FormEvent } from "react";

import type { ImportDocumentInput, ImportFormat } from "../../core/import";
import type { StorageSnapshot } from "../../core/storage";
import type { ProjectAstraFixture } from "../../data/demo/project-astra";
import { LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS } from "../extraction";
import {
  deriveProjectAstraProgress,
  getNextProjectAstraStep,
} from "../state/projectAstraProgress";
import type { ApplicationControllerActions } from "../state/useApplicationController";

function inferFileFormat(fileName: string): {
  format: ImportFormat;
  mediaType: string;
} | null {
  const extension = fileName.toLowerCase().split(".").pop();
  if (extension === "txt") return { format: "plain_text", mediaType: "text/plain" };
  if (extension === "md" || extension === "markdown") {
    return { format: "markdown", mediaType: "text/markdown" };
  }
  if (extension === "json") return { format: "json", mediaType: "application/json" };
  return null;
}

export function ImportView(props: {
  snapshot: StorageSnapshot;
  projectAstra: ProjectAstraFixture;
  isBusy: boolean;
  actions: ApplicationControllerActions;
}) {
  const [sourceKind, setSourceKind] = useState<"file" | "pasted_text">("pasted_text");
  const [fileName, setFileName] = useState("notes.md");
  const [format, setFormat] = useState<ImportFormat>("markdown");
  const [mediaType, setMediaType] = useState("text/markdown");
  const [content, setContent] = useState("");
  const [consent, setConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const progress = deriveProjectAstraProgress(props.snapshot, props.projectAstra);
  const next = getNextProjectAstraStep(props.snapshot, props.projectAstra);
  const contentOverLimit =
    content.length > LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS;
  const displayedFormError =
    formError ??
    (contentOverLimit
      ? `本文は${LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS.toLocaleString()}文字以内にしてください。`
      : null);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    const inferred = inferFileFormat(file.name);
    if (inferred === null) {
      setFormError(".txt、.md、.markdown、.jsonファイルを選択してください。");
      return;
    }
    setFormError(null);
    setSourceKind("file");
    setFileName(file.name);
    setFormat(inferred.format);
    setMediaType(inferred.mediaType);
    setContent(await file.text());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (content.length === 0) {
      setFormError("Importする本文を入力してください。");
      return;
    }
    if (contentOverLimit) {
      setFormError(
        `本文は${LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS.toLocaleString()}文字以内にしてください。`,
      );
      return;
    }
    if (!consent) {
      setFormError("OpenAI APIへの送信を確認してください。");
      return;
    }
    setFormError(null);
    const input: ImportDocumentInput = {
      sourceKind,
      format,
      fileName,
      mediaType,
      content,
    };
    void props.actions.importArbitraryDocument(input);
  };

  return (
    <main className="page-shell">
      <section className="page-intro">
        <p className="eyebrow">Bring source material</p>
        <h1>文書をImport</h1>
        <p>Project Astra Demo、または任意のテキスト文書をReviewの入口へ送ります。</p>
      </section>

      <div className="two-column-layout import-layout">
        <section className="panel" aria-labelledby="demo-import-title">
          <p className="eyebrow">Demo Mode</p>
          <h2 id="demo-import-title">次のProject Astra文書</h2>
          {next.kind === "import" ? (
            <article className="document-card">
              <span className="document-order">{String(next.source.order).padStart(2, "0")}</span>
              <div>
                <h3>{next.source.fileName}</h3>
                <p>{next.source.documentId}</p>
                <p>保存済みCandidate Bundleを使い、networkなしでReviewします。</p>
              </div>
              <button
                className="primary-button"
                type="button"
                disabled={props.isBusy}
                onClick={() => void props.actions.importNextProjectAstraDocument()}
              >
                ImportしてReview
              </button>
            </article>
          ) : next.kind === "review" ? (
            <div className="empty-state">
              <h3>先に保存済みReviewを完了してください</h3>
              <button type="button" onClick={() => props.actions.openReviewSession(next.sessionId)}>
                Reviewを再開
              </button>
            </div>
          ) : (
            <div className="empty-state"><h3>全4文書を反映済みです</h3></div>
          )}
          <ol className="compact-progress" aria-label="Project Astra文書状況">
            {progress.map((item) => (
              <li key={item.documentId}>
                <span>{item.order}. {item.fileName}</span><strong>{item.status}</strong>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel" aria-labelledby="custom-import-title">
          <p className="eyebrow">Arbitrary document</p>
          <h2 id="custom-import-title">GPT-5.6 Live Extraction</h2>
          <p className="callout warning-callout">
            本文をOpenAI APIへ送信してCandidateを抽出します。結果は自動登録せず、必ずReviewで確認します。API keyはブラウザーへ保存・送信しません。
          </p>
          <form className="form-stack" onSubmit={submit}>
            <label>
              入力方法
              <select value={sourceKind} onChange={(event) => setSourceKind(event.target.value as "file" | "pasted_text")}>
                <option value="pasted_text">貼り付けテキスト</option>
                <option value="file">ファイル</option>
              </select>
            </label>
            <label>
              ファイルを選択
              <input
                type="file"
                accept=".txt,.md,.markdown,.json"
                aria-describedby={formError === null ? undefined : "import-form-error"}
                onChange={(event) => void handleFile(event)}
              />
            </label>
            <label>
              fileName
              <input value={fileName} onChange={(event) => setFileName(event.target.value)} required />
            </label>
            <div className="form-row">
              <label>
                format
                <select value={format} onChange={(event) => setFormat(event.target.value as ImportFormat)}>
                  <option value="plain_text">plain text</option>
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                </select>
              </label>
              <label>
                media type
                <input value={mediaType} onChange={(event) => setMediaType(event.target.value)} required />
              </label>
            </div>
            <label>
              本文
              <textarea
                rows={12}
                value={content}
                aria-describedby="live-content-count import-form-error"
                onChange={(event) => {
                  setContent(event.target.value);
                  setFormError(null);
                }}
              />
            </label>
            <p id="live-content-count" aria-live="polite">
              {content.length.toLocaleString()} / {LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS.toLocaleString()}文字
            </p>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              この文書内容が抽出のためOpenAI APIへ送信されることを確認しました。
            </label>
            {displayedFormError !== null && (
              <p id="import-form-error" className="form-error" aria-live="assertive">
                {displayedFormError}
              </p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={
                props.isBusy ||
                !consent ||
                content.length === 0 ||
                contentOverLimit
              }
            >
              GPT-5.6で抽出してReview
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
