import { describe, expect, it } from "vitest";

import {
  handleHealthRequest,
  isLiveAiConfigured,
} from "./healthHandler";

describe("health handler", () => {
  it("reports enabled only when Live AI is not disabled and a key exists", () => {
    expect(
      isLiveAiConfigured({
        LIVE_AI_ENABLED: "true",
        OPENAI_API_KEY: "server-only-test-key",
      }),
    ).toBe(true);
    expect(
      isLiveAiConfigured({
        LIVE_AI_ENABLED: "false",
        OPENAI_API_KEY: "server-only-test-key",
      }),
    ).toBe(false);
    expect(isLiveAiConfigured({ LIVE_AI_ENABLED: "true" })).toBe(false);
    expect(
      isLiveAiConfigured({
        LIVE_AI_ENABLED: "true",
        OPENAI_API_KEY: "   ",
      }),
    ).toBe(false);
  });

  it.each([
    [{ LIVE_AI_ENABLED: "true", OPENAI_API_KEY: "server-only-test-key" }, "enabled"],
    [{ LIVE_AI_ENABLED: "false", OPENAI_API_KEY: "server-only-test-key" }, "disabled"],
    [{ LIVE_AI_ENABLED: "true" }, "disabled"],
  ] as const)("returns the strict GET envelope for %s", (environment, liveAi) => {
    const result = handleHealthRequest("GET", environment);

    expect(result).toEqual({
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: {
        ok: true,
        schemaVersion: 1,
        service: "creative-knowledge-engine",
        liveAi,
      },
    });
    expect(result.headers).not.toHaveProperty("Access-Control-Allow-Origin");
  });

  it("returns a safe 405 without environment metadata", () => {
    const marker = "private-health-test-marker";
    const result = handleHealthRequest("POST", {
      OPENAI_API_KEY: marker,
      LIVE_AI_ENABLED: "true",
    });

    expect(result.status).toBe(405);
    expect(result.headers["Cache-Control"]).toBe("no-store");
    expect(result.body).toEqual({
      ok: false,
      schemaVersion: 1,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed.",
      },
    });
    expect(JSON.stringify(result.body)).not.toContain(marker);
  });
});
