import { describe, expect, it } from "vitest";

import {
  LIVE_EXTRACTION_MAX_CONTENT_BYTES,
  LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS,
  LiveExtractionRequestError,
  liveExtractionResponseSchema,
  validateLiveExtractionRequest,
} from "./liveExtractionContracts";

function request(content = "Mira Vale maps North Harbor.") {
  return {
    schemaVersion: 1,
    document: {
      id: "doc-live-001",
      fileName: "notes.md",
      format: "markdown",
      mediaType: "text/markdown",
      content,
    },
  };
}

function expectRequestError(
  input: unknown,
  code: LiveExtractionRequestError["code"],
): void {
  try {
    validateLiveExtractionRequest(input);
    throw new Error("expected validation failure");
  } catch (error) {
    expect(error).toBeInstanceOf(LiveExtractionRequestError);
    expect((error as LiveExtractionRequestError).code).toBe(code);
  }
}

describe("Live extraction request contract", () => {
  it("accepts the existing Import format and does not mutate input", () => {
    const input = request();
    const before = structuredClone(input);

    expect(validateLiveExtractionRequest(input)).toEqual(input);
    expect(input).toEqual(before);
  });

  it.each([
    ["unknown root field", { ...request(), extra: true }],
    [
      "unknown document field",
      { ...request(), document: { ...request().document, extra: true } },
    ],
    ["wrong version", { ...request(), schemaVersion: 2 }],
    [
      "invalid format",
      { ...request(), document: { ...request().document, format: "pdf" } },
    ],
    [
      "blank content",
      { ...request(), document: { ...request().document, content: "   " } },
    ],
    [
      "blank id",
      { ...request(), document: { ...request().document, id: "" } },
    ],
    [
      "long filename",
      { ...request(), document: { ...request().document, fileName: "x".repeat(256) } },
    ],
    [
      "long media type",
      { ...request(), document: { ...request().document, mediaType: "x".repeat(101) } },
    ],
  ])("rejects %s", (_name, input) => {
    expectRequestError(input, "LIVE_REQUEST_INVALID");
  });

  it.each(["id", "fileName", "mediaType", "content"] as const)(
    "rejects NUL in document.%s",
    (field) => {
      expectRequestError(
        {
          ...request(),
          document: { ...request().document, [field]: `valid\0invalid` },
        },
        "LIVE_REQUEST_INVALID",
      );
    },
  );

  it("rejects content over the character limit", () => {
    expectRequestError(
      request("a".repeat(LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS + 1)),
      "LIVE_REQUEST_TOO_LARGE",
    );
  });

  it("defines the independent UTF-8 byte ceiling", () => {
    expect(LIVE_EXTRACTION_MAX_CONTENT_BYTES).toBe(80 * 1024);
  });
});

describe("Live extraction response contract", () => {
  it("accepts strict success and failure envelopes", () => {
    expect(
      liveExtractionResponseSchema.safeParse({
        ok: true,
        schemaVersion: 1,
        candidateBundle: {},
        meta: { model: "gpt-5.6", promptVersion: "v1" },
      }).success,
    ).toBe(true);
    expect(
      liveExtractionResponseSchema.safeParse({
        ok: false,
        schemaVersion: 1,
        error: { code: "X", message: "safe", retryable: false },
      }).success,
    ).toBe(true);
  });

  it("rejects missing Candidate Bundle and unknown fields", () => {
    expect(
      liveExtractionResponseSchema.safeParse({
        ok: true,
        schemaVersion: 1,
        meta: { model: "gpt-5.6", promptVersion: "v1" },
      }).success,
    ).toBe(false);
    expect(
      liveExtractionResponseSchema.safeParse({
        ok: false,
        schemaVersion: 1,
        error: { code: "X", message: "safe", retryable: false },
        raw: "secret",
      }).success,
    ).toBe(false);
  });
});
