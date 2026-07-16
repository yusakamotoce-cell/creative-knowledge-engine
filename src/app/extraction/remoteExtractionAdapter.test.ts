import { describe, expect, it, vi } from "vitest";

import type { FetchLike } from "./liveExtractionContracts";
import {
  LiveExtractionAdapterError,
  RemoteExtractionAdapter,
} from "./remoteExtractionAdapter";
import {
  createLiveTestBundle,
  createLiveTestDocument,
} from "../../test/liveExtractionTestSupport";

function successResponse(candidateBundle: unknown = createLiveTestBundle()) {
  return Response.json({
    ok: true,
    schemaVersion: 1,
    candidateBundle,
    meta: {
      model: "gpt-5.6-fixed",
      promptVersion: "creative-knowledge-candidate-extraction-v1",
    },
  });
}

async function expectAdapterError(
  operation: () => Promise<unknown>,
  code: LiveExtractionAdapterError["code"],
): Promise<void> {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining({ name: "LiveExtractionAdapterError", code }),
  );
}

describe("RemoteExtractionAdapter", () => {
  it("posts the minimal request to the same-origin endpoint and validates success", async () => {
    const fetcher = vi.fn<FetchLike>(async () => successResponse());
    const document = createLiveTestDocument();
    const before = structuredClone(document);

    await expect(
      new RemoteExtractionAdapter({ fetcher }).extract(document),
    ).resolves.toEqual(createLiveTestBundle());

    expect(document).toEqual(before);
    const [endpoint, init] = fetcher.mock.calls[0]!;
    expect(endpoint).toBe("/api/extract");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.headers).not.toHaveProperty("Authorization");
    expect(init?.cache).toBe("no-store");
    expect(JSON.parse(String(init?.body))).toEqual({
      schemaVersion: 1,
      document: {
        id: document.id,
        fileName: document.fileName,
        format: document.format,
        mediaType: document.mediaType,
        content: document.content,
      },
    });
  });

  it("supports an explicitly injected endpoint", async () => {
    const fetcher = vi.fn<FetchLike>(async () => successResponse());
    await new RemoteExtractionAdapter({
      endpoint: "/custom/extract",
      fetcher,
    }).extract(createLiveTestDocument());
    expect(fetcher).toHaveBeenCalledWith(
      "/custom/extract",
      expect.any(Object),
    );
  });

  it.each([
    ["AI_RATE_LIMITED", "LIVE_AI_RATE_LIMITED"],
    ["AI_TIMEOUT", "LIVE_AI_TIMEOUT"],
    ["AI_REFUSAL", "LIVE_AI_REFUSED"],
    ["AI_OUTPUT_INCOMPLETE", "LIVE_AI_OUTPUT_INCOMPLETE"],
    ["AI_CONTENT_FILTERED", "LIVE_AI_OUTPUT_INCOMPLETE"],
    ["AI_RESPONSE_INCOMPLETE", "LIVE_AI_OUTPUT_INCOMPLETE"],
    ["LIVE_REQUEST_INVALID", "LIVE_AI_REQUEST_INVALID"],
    ["LIVE_REQUEST_TOO_LARGE", "LIVE_AI_REQUEST_INVALID"],
    ["AI_INVALID_UPSTREAM_RESPONSE", "LIVE_AI_INVALID_RESPONSE"],
    ["AI_DOCUMENT_ID_MISMATCH", "LIVE_AI_INVALID_RESPONSE"],
    ["AI_SOURCE_REF_MISMATCH", "LIVE_AI_INVALID_RESPONSE"],
    ["AI_UNGROUNDED_SOURCE_REF", "LIVE_AI_INVALID_RESPONSE"],
    ["AI_OUTPUT_LIMIT_EXCEEDED", "LIVE_AI_INVALID_RESPONSE"],
    ["LIVE_AI_DISABLED", "LIVE_AI_UNAVAILABLE"],
    ["AI_CONFIGURATION_ERROR", "LIVE_AI_UNAVAILABLE"],
    ["AI_UPSTREAM_UNAVAILABLE", "LIVE_AI_UNAVAILABLE"],
    ["AI_REQUEST_FAILED", "LIVE_AI_UNAVAILABLE"],
    ["UNKNOWN", "LIVE_AI_EXTRACTION_FAILED"],
  ] as const)("maps server failure %s", async (serverCode, browserCode) => {
    const fetcher = vi.fn<FetchLike>(async () =>
      Response.json(
        {
          ok: false,
          schemaVersion: 1,
          error: { code: serverCode, message: "safe", retryable: false },
        },
        { status: 422 },
      ),
    );
    await expectAdapterError(
      () =>
        new RemoteExtractionAdapter({ fetcher }).extract(
          createLiveTestDocument(),
        ),
      browserCode,
    );
  });

  it.each([
    ["malformed JSON", async () => new Response("not-json")],
    [
      "unknown envelope field",
      async () =>
        Response.json({
          ok: false,
          schemaVersion: 1,
          error: { code: "X", message: "safe", retryable: false },
          raw: "not allowed",
        }),
    ],
    ["invalid Candidate Bundle", async () => successResponse({})],
  ] as const)("rejects %s", async (_name, implementation) => {
    const fetcher = vi.fn<FetchLike>(implementation);
    await expectAdapterError(
      () =>
        new RemoteExtractionAdapter({ fetcher }).extract(
          createLiveTestDocument(),
        ),
      "LIVE_AI_INVALID_RESPONSE",
    );
  });

  it("rechecks document ID and exact SourceRef grounding in the browser", async () => {
    const documentMismatch = createLiveTestBundle({ documentId: "other" });
    const ungrounded = createLiveTestBundle();
    ungrounded.entities[0]!.sourceRefs[0]!.excerpt = "not present";

    for (const candidateBundle of [documentMismatch, ungrounded]) {
      const fetcher = vi.fn<FetchLike>(async () =>
        successResponse(candidateBundle),
      );
      await expectAdapterError(
        () =>
          new RemoteExtractionAdapter({ fetcher }).extract(
            createLiveTestDocument(),
          ),
        "LIVE_AI_INVALID_RESPONSE",
      );
    }
  });

  it("rejects oversized input before fetch", async () => {
    const fetcher = vi.fn<FetchLike>();
    await expectAdapterError(
      () =>
        new RemoteExtractionAdapter({ fetcher }).extract(
          createLiveTestDocument({ content: "x".repeat(20_001) }),
        ),
      "LIVE_AI_REQUEST_INVALID",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps network failure and does not retry", async () => {
    const fetcher = vi.fn<FetchLike>(async () => {
      throw new Error("offline");
    });
    await expectAdapterError(
      () =>
        new RemoteExtractionAdapter({ fetcher }).extract(
          createLiveTestDocument(),
        ),
      "LIVE_AI_UNAVAILABLE",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("aborts a timed out request and does not retry", async () => {
    const fetcher = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expectAdapterError(
      () =>
        new RemoteExtractionAdapter({ fetcher, timeoutMs: 1 }).extract(
          createLiveTestDocument(),
        ),
      "LIVE_AI_TIMEOUT",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
