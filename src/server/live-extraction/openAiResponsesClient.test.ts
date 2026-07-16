import { describe, expect, it, vi } from "vitest";

import type { FetchLike } from "./contracts";
import { LiveExtractionServerError } from "./errors";
import {
  DEFAULT_OPENAI_MODEL,
  LIVE_EXTRACTION_MAX_OUTPUT_TOKENS,
  OPENAI_RESPONSES_API_URL,
  OpenAiResponsesClient,
} from "./openAiResponsesClient";
import { LIVE_EXTRACTION_DEVELOPER_PROMPT } from "./prompt";
import {
  completedOpenAiResponse,
  createLiveTestDocument,
  createLiveTestProviderBundle,
} from "../../test/liveExtractionTestSupport";

async function expectClientError(
  operation: () => Promise<unknown>,
  code: LiveExtractionServerError["code"],
): Promise<void> {
  await expect(operation()).rejects.toEqual(
    expect.objectContaining({ name: "LiveExtractionServerError", code }),
  );
}

function clientFor(
  fetcher: FetchLike,
  options: { model?: string; timeoutMs?: number } = {},
) {
  return new OpenAiResponsesClient({
    apiKey: "test-api-token",
    fetcher,
    ...options,
  });
}

describe("OpenAiResponsesClient", () => {
  it("sends a non-stored Responses API request with separate developer and user content", async () => {
    const fetcher = vi.fn<FetchLike>(async () => completedOpenAiResponse());
    const document = createLiveTestDocument();

    const result = await clientFor(fetcher).extract(document);

    expect(result).toEqual({
      model: "gpt-5.6-2026-07-01",
      providerCandidateBundle: createLiveTestProviderBundle(),
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(OPENAI_RESPONSES_API_URL);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      Authorization: "Bearer test-api-token",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.model).toBe(DEFAULT_OPENAI_MODEL);
    expect(body.store).toBe(false);
    expect(body.reasoning).toEqual({ effort: "low" });
    expect(body.max_output_tokens).toBe(LIVE_EXTRACTION_MAX_OUTPUT_TOKENS);
    const input = body.input as Array<Record<string, unknown>>;
    expect(input[0]).toEqual({
      role: "developer",
      content: LIVE_EXTRACTION_DEVELOPER_PROMPT,
    });
    expect(input[1]?.role).toBe("user");
    expect(JSON.parse(String(input[1]?.content))).toEqual({
      document: {
        id: document.id,
        fileName: document.fileName,
        format: document.format,
        mediaType: document.mediaType,
        content: document.content,
      },
    });
    expect(body.text).toEqual(
      expect.objectContaining({
        format: expect.objectContaining({
          type: "json_schema",
          name: "creative_knowledge_candidate_bundle",
          strict: true,
        }),
      }),
    );
    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("previous_response_id");
  });

  it("uses a server-selected model override", async () => {
    const fetcher = vi.fn<FetchLike>(async () => completedOpenAiResponse());
    await clientFor(fetcher, { model: "gpt-5.6-fixed" }).extract(
      createLiveTestDocument(),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)) as {
      model: string;
    };
    expect(body.model).toBe("gpt-5.6-fixed");
  });

  it("rejects a missing server API key before making a request", () => {
    expect(
      () =>
        new OpenAiResponsesClient({
          apiKey: " ",
          fetcher: vi.fn<FetchLike>(),
        }),
    ).toThrowError(
      expect.objectContaining({ code: "AI_CONFIGURATION_ERROR" }),
    );
  });

  it("maps refusal without exposing refusal text", async () => {
    const refusal = "raw refusal must remain server-side";
    const fetcher = vi.fn<FetchLike>(async () =>
      Response.json({
        status: "completed",
        model: "gpt-5.6",
        output: [
          {
            type: "message",
            content: [{ type: "refusal", refusal }],
          },
        ],
      }),
    );
    try {
      await clientFor(fetcher).extract(createLiveTestDocument());
      throw new Error("expected refusal");
    } catch (error) {
      expect(error).toBeInstanceOf(LiveExtractionServerError);
      expect((error as Error).message).toBe("AI_REFUSAL");
      expect((error as Error).message).not.toContain(refusal);
    }
  });

  it.each([
    ["max_output_tokens", "AI_OUTPUT_INCOMPLETE"],
    ["content_filter", "AI_CONTENT_FILTERED"],
    ["other", "AI_RESPONSE_INCOMPLETE"],
  ] as const)("maps incomplete reason %s", async (reason, code) => {
    const fetcher = vi.fn<FetchLike>(async () =>
      Response.json({
        status: "incomplete",
        incomplete_details: { reason },
        model: "gpt-5.6",
        output: [],
      }),
    );
    await expectClientError(
      () => clientFor(fetcher).extract(createLiveTestDocument()),
      code,
    );
  });

  it.each([
    [401, "AI_CONFIGURATION_ERROR"],
    [403, "AI_CONFIGURATION_ERROR"],
    [429, "AI_RATE_LIMITED"],
    [500, "AI_UPSTREAM_UNAVAILABLE"],
    [503, "AI_UPSTREAM_UNAVAILABLE"],
    [400, "AI_REQUEST_FAILED"],
  ] as const)("maps upstream HTTP %s", async (status, code) => {
    const fetcher = vi.fn<FetchLike>(async () =>
      new Response('{"raw":"do not expose"}', { status }),
    );
    await expectClientError(
      () => clientFor(fetcher).extract(createLiveTestDocument()),
      code,
    );
  });

  it.each([
    ["malformed JSON", new Response("not-json")],
    [
      "missing message",
      Response.json({ status: "completed", model: "gpt-5.6", output: [] }),
    ],
    [
      "missing model",
      Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: "{}" }],
          },
        ],
      }),
    ],
    [
      "invalid response status",
      Response.json({ status: "queued", model: "gpt-5.6", output: [] }),
    ],
  ])("rejects %s", async (_name, response) => {
    const fetcher = vi.fn<FetchLike>(async () => response.clone());
    await expectClientError(
      () => clientFor(fetcher).extract(createLiveTestDocument()),
      "AI_INVALID_UPSTREAM_RESPONSE",
    );
  });

  it("maps a network failure without automatic retry", async () => {
    const fetcher = vi.fn<FetchLike>(async () => {
      throw new Error("network raw detail");
    });
    await expectClientError(
      () => clientFor(fetcher).extract(createLiveTestDocument()),
      "AI_REQUEST_FAILED",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("aborts and maps timeout without retry", async () => {
    const fetcher = vi.fn<FetchLike>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    );
    await expectClientError(
      () =>
        clientFor(fetcher, { timeoutMs: 1 }).extract(
          createLiveTestDocument(),
        ),
      "AI_TIMEOUT",
    );
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
