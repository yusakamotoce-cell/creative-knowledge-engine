import type { UiError } from "./types";

const errorMessages: Record<string, Omit<UiError, "code">> = {
  INVALID_KNOWLEDGE_EXPORT: {
    title: "Knowledge JSONを作成できません",
    detail: "現在のKnowledgeを確認してから再試行してください。",
  },
  FILE_DOWNLOAD_FAILED: {
    title: "JSONをダウンロードできません",
    detail: "ブラウザーのダウンロード設定を確認して再試行してください。",
  },
  GRAPH_PROJECTION_FAILED: {
    title: "Knowledge Graphを作成できません",
    detail: "登録済みKnowledgeの整合性を確認してください。",
  },
  FIXTURE_NOT_FOUND: {
    title: "保存済みの抽出結果がありません",
    detail:
      "現在はProject Astra Demoの文書だけを抽出できます。Live AI抽出は後続Stepで提供します。",
  },
  CANDIDATE_ALREADY_REVIEWED: {
    title: "Candidateは処理済みです",
    detail: "最新のReview状態を確認して、未処理のCandidateを選択してください。",
  },
  ENTITY_REVIEW_INCOMPLETE: {
    title: "Entity Reviewが未完了です",
    detail: "すべてのEntity CandidateをAccept、Merge、またはRejectしてください。",
  },
  RELATIONSHIP_BLOCKED: {
    title: "RelationshipをAcceptできません",
    detail: "未解決の端点を手動で解決するか、このCandidateをRejectしてください。",
  },
  RELATIONSHIP_REVIEW_INCOMPLETE: {
    title: "Relationship Reviewが未完了です",
    detail: "すべてのRelationship Candidateを処理してください。",
  },
  KNOWLEDGE_REVISION_CONFLICT: {
    title: "Knowledgeが更新されています",
    detail: "このSessionは古いため自動統合できません。現在の状態を確認してください。",
  },
  INVALID_PERSISTED_JSON: {
    title: "保存データを読み込めません",
    detail: "Local Storageの値が壊れています。データは自動削除していません。",
  },
  UNSUPPORTED_STORAGE_SCHEMA_VERSION: {
    title: "未対応の保存形式です",
    detail: "保存データは変更せず保持しています。対応する移行処理が必要です。",
  },
  LOCAL_STORAGE_READ_FAILED: {
    title: "Local Storageを読み込めません",
    detail: "ブラウザーの保存設定を確認してから再試行してください。",
  },
  LOCAL_STORAGE_WRITE_FAILED: {
    title: "Local Storageへ保存できません",
    detail: "現在の画面を閉じず、ブラウザーの保存設定を確認してください。",
  },
  STORAGE_LOAD_FAILED: {
    title: "Workspaceを読み込めません",
    detail: "保存データは自動削除していません。原因を確認して再試行してください。",
  },
  STORAGE_SAVE_FAILED: {
    title: "Workspaceを保存できません",
    detail: "操作は完了していません。保存状態を確認して再試行してください。",
  },
  EMPTY_DOCUMENT_CONTENT: {
    title: "文書が空です",
    detail: "Importする本文を入力してください。",
  },
  INVALID_JSON_DOCUMENT: {
    title: "JSONを読み込めません",
    detail: "正しいJSON形式へ修正してからImportしてください。",
  },
  INVALID_IMPORT_INPUT: {
    title: "Import内容を確認してください",
    detail: "fileName、format、media type、本文を確認してください。",
  },
};

function errorCode(value: unknown): string | null {
  return typeof value === "object" && value !== null && "code" in value &&
    typeof value.code === "string"
    ? value.code
    : null;
}

function errorCause(value: unknown): unknown {
  return typeof value === "object" && value !== null && "cause" in value
    ? value.cause
    : undefined;
}

export function mapErrorToUi(error: unknown): UiError {
  const chain: unknown[] = [];
  let current: unknown = error;

  while (current !== undefined && chain.length < 8) {
    chain.push(current);
    current = errorCause(current);
  }

  for (const candidate of chain.reverse()) {
    const code = errorCode(candidate);
    if (code !== null && errorMessages[code] !== undefined) {
      return { code, ...errorMessages[code] };
    }
  }

  const code = errorCode(error) ?? "UNKNOWN_ERROR";
  return {
    code,
    title: "操作を完了できませんでした",
    detail: "状態を確認して再試行してください。保存済みデータは自動削除していません。",
  };
}
