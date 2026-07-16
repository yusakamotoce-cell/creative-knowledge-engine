import { describe, expect, it, vi } from "vitest";

import extractFunction, {
  createExtractFetchHandler,
} from "../../../api/extract";
import {
  completedOpenAiResponse,
  createLiveTestBundle,
  createLiveTestDocument,
} from "../../test/liveExtractionTestSupport";

function liveRequest(): Request {
  const document = createLiveTestDocument();
  return new Request("https://example.test/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      schemaVersion: 1,
      document: {
        id: document.id,
        fileName: document.fileName,
        format: document.format,
        mediaType: document.mediaType,
        content: document.content,
      },
    }),
  });
}

describe("Vercel extraction adapter", () => {
  it("exports the Web fetch contract", () => {
    expect(extractFunction).toEqual({ fetch: expect.any(Function) });
  });

  it("maps Web Request and injected environment to the existing service", async () => {
    const fetcher = vi.fn(async () => completedOpenAiResponse());
    const response = await createExtractFetchHandler({
      environment: {
        OPENAI_API_KEY: "server-only-test-key",
        OPENAI_MODEL: "gpt-5.6",
        LIVE_AI_ENABLED: "true",
      },
      fetcher,
    })(liveRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      schemaVersion: 1,
      candidateBundle: createLiveTestBundle(),
      meta: {
        model: "gpt-5.6-2026-07-01",
        promptVersion: "creative-knowledge-candidate-extraction-v1",
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not invoke OpenAI for unsupported methods", async () => {
    const fetcher = vi.fn(async () => completedOpenAiResponse());
    const response = await createExtractFetchHandler({
      environment: {
        OPENAI_API_KEY: "server-only-test-key",
        LIVE_AI_ENABLED: "true",
      },
      fetcher,
    })(new Request("https://example.test/api/extract"));

    expect(response.status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [{ LIVE_AI_ENABLED: "false", OPENAI_API_KEY: "server-only-test-key" }, 503, "LIVE_AI_DISABLED"],
    [{ LIVE_AI_ENABLED: "true" }, 500, "AI_CONFIGURATION_ERROR"],
  ] as const)("maps safe configuration state", async (environment, status, code) => {
    const fetcher = vi.fn(async () => completedOpenAiResponse());
    const response = await createExtractFetchHandler({ environment, fetcher })(
      liveRequest(),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code }),
      }),
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps malformed JSON through the existing request validation", async () => {
    const fetcher = vi.fn(async () => completedOpenAiResponse());
    const response = await createExtractFetchHandler({
      environment: {
        OPENAI_API_KEY: "server-only-test-key",
        LIVE_AI_ENABLED: "true",
      },
      fetcher,
    })(
      new Request("https://example.test/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
