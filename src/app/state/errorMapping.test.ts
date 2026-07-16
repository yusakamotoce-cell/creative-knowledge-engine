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
      detail: expect.stringContaining("Live AI"),
    });
  });

  it("uses safe generic copy for unknown errors", () => {
    expect(mapErrorToUi(new Error("secret internal detail"))).toEqual({
      code: "UNKNOWN_ERROR",
      title: "操作を完了できませんでした",
      detail: "状態を確認して再試行してください。保存済みデータは自動削除していません。",
    });
  });
});
