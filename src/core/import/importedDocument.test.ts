import { describe, expect, it } from "vitest";

import {
  importedDocumentSchema,
  validateImportedDocument,
  validateImportDocumentInput,
} from "./importedDocument";
import {
  expectErrorCode,
  hashA,
  importedAt,
  makeImportedDocument,
} from "./testSupport";

describe("Imported Document", () => {
  it.each([
    ["plain_text", "text/plain", "plain"],
    ["markdown", "text/markdown", "# heading"],
    ["json", "application/json", '{"key":true}'],
  ] as const)("accepts %s input", (format, mediaType, content) => {
    expect(
      validateImportDocumentInput({
        sourceKind: "file",
        format,
        fileName: " input.file ",
        mediaType,
        content,
      }),
    ).toEqual({
      sourceKind: "file",
      format,
      fileName: "input.file",
      mediaType,
      content,
    });
  });

  it("accepts explicitly named pasted text", () => {
    expect(
      validateImportDocumentInput({
        sourceKind: "pasted_text",
        format: "plain_text",
        fileName: "clipboard.txt",
        mediaType: "text/plain",
        content: "pasted",
      }).sourceKind,
    ).toBe("pasted_text");
  });

  it("rejects empty content with a typed error", () => {
    expectErrorCode(
      () =>
        validateImportDocumentInput({
          sourceKind: "file",
          format: "plain_text",
          fileName: "empty.txt",
          mediaType: "text/plain",
          content: "",
        }),
      "EMPTY_DOCUMENT_CONTENT",
    );
  });

  it("rejects empty fileName and unknown fields", () => {
    for (const input of [
      {
        sourceKind: "file",
        format: "plain_text",
        fileName: "   ",
        mediaType: "text/plain",
        content: "text",
      },
      {
        sourceKind: "file",
        format: "plain_text",
        fileName: "story.txt",
        mediaType: "text/plain",
        content: "text",
        encoding: "utf8",
      },
    ]) {
      expectErrorCode(
        () => validateImportDocumentInput(input),
        "INVALID_IMPORT_INPUT",
      );
    }
  });

  it("rejects invalid JSON without normalizing it", () => {
    expectErrorCode(
      () =>
        validateImportDocumentInput({
          sourceKind: "file",
          format: "json",
          fileName: "bad.json",
          mediaType: "application/json",
          content: "{bad}",
        }),
      "INVALID_JSON_DOCUMENT",
    );
  });

  it("preserves BOM, whitespace and CRLF exactly", () => {
    const content = "\uFEFF  first\r\nsecond  ";
    const parsed = validateImportDocumentInput({
      sourceKind: "file",
      format: "plain_text",
      fileName: "story.txt",
      mediaType: "text/plain",
      content,
    });

    expect(parsed.content).toBe(content);
  });

  it("validates hash, importedAt and strict fields", () => {
    expect(importedDocumentSchema.parse(makeImportedDocument())).toEqual(
      makeImportedDocument(),
    );
    expect(importedDocumentSchema.safeParse(makeImportedDocument({
      contentSha256: "ABC",
    })).success).toBe(false);
    expect(importedDocumentSchema.safeParse(makeImportedDocument({
      importedAt: "today",
    })).success).toBe(false);
    expect(importedDocumentSchema.safeParse({
      ...makeImportedDocument(),
      extra: true,
    }).success).toBe(false);
  });

  it("returns INVALID_IMPORTED_DOCUMENT at the application boundary", () => {
    expectErrorCode(
      () => validateImportedDocument({
        ...makeImportedDocument(),
        contentSha256: hashA.toUpperCase(),
        importedAt,
      }),
      "INVALID_IMPORTED_DOCUMENT",
    );
  });
});
