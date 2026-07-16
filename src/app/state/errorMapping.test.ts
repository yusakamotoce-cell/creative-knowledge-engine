import { describe, expect, it } from "vitest";

import { ImportDomainError } from "../../core/import/errors";
import { StorageDomainError } from "../../core/storage/errors";
import { mapErrorToUi } from "./errorMapping";

describe("mapErrorToUi", () => {
  it("maps a direct domain code to user-facing copy", () => {
    expect(mapErrorToUi(new ImportDomainError("EMPTY_DOCUMENT_CONTENT"))).toEqual({
      code: "EMPTY_DOCUMENT_CONTENT",
      title: "文書が空です",
      detail: "Importする本文を入力してください。",
    });
  });

  it("prefers the actionable nested storage code", () => {
    const error = new ImportDomainError("STORAGE_LOAD_FAILED", {
      cause: new StorageDomainError("INVALID_PERSISTED_JSON"),
    });
    expect(mapErrorToUi(error)).toMatchObject({
      code: "INVALID_PERSISTED_JSON",
      detail: expect.stringContaining("自動削除していません"),
    });
  });

  it("reveals a nested fixture-not-found constraint", () => {
    const error = new ImportDomainError("EXTRACTION_FAILED", {
      cause: new ImportDomainError("FIXTURE_NOT_FOUND"),
    });
    expect(mapErrorToUi(error)).toMatchObject({
      code: "FIXTURE_NOT_FOUND",
      detail: expect.stringContaining("Fixture"),
    });
  });

  it.each([
    ["LIVE_AI_UNAVAILABLE", "Live AIを利用できません"],
    ["LIVE_AI_REQUEST_INVALID", "送信する文書を確認してください"],
    ["LIVE_AI_RATE_LIMITED", "Live AIの利用が一時的に制限されています"],
    ["LIVE_AI_TIMEOUT", "Live AIの応答が時間内に完了しませんでした"],
    ["LIVE_AI_REFUSED", "Live AIがこの文書を処理できませんでした"],
    ["LIVE_AI_OUTPUT_INCOMPLETE", "Live AIの抽出結果が不完全です"],
    ["LIVE_AI_INVALID_RESPONSE", "Live AIの抽出結果を検証できませんでした"],
    ["LIVE_AI_EXTRACTION_FAILED", "Live AI抽出に失敗しました"],
  ])("maps nested Live extraction code %s", (code, title) => {
    const error = new ImportDomainError("EXTRACTION_FAILED", {
      cause: Object.assign(new Error("raw internal detail"), { code }),
    });
    const mapped = mapErrorToUi(error);
    expect(mapped).toMatchObject({ code, title });
    expect(mapped.detail).not.toContain("raw internal detail");
  });

  it("uses safe generic copy for unknown errors", () => {
    expect(mapErrorToUi(new Error("secret internal detail"))).toEqual({
      code: "UNKNOWN_ERROR",
      title: "操作を完了できませんでした",
      detail: "状態を確認して再試行してください。保存済みデータは自動削除していません。",
    });
  });

  it.each([
    ["INVALID_KNOWLEDGE_EXPORT", "Knowledge JSONを作成できません"],
    ["FILE_DOWNLOAD_FAILED", "JSONをダウンロードできません"],
    ["GRAPH_PROJECTION_FAILED", "Knowledge Graphを作成できません"],
  ])("maps the Step 7 code %s without exposing its cause", (code, title) => {
    const error = Object.assign(new Error("safe outer"), {
      code,
      cause: new Error("secret internal detail"),
    });
    const mapped = mapErrorToUi(error);
    expect(mapped).toMatchObject({ code, title });
    expect(mapped.detail).not.toContain("secret internal detail");
  });
});
