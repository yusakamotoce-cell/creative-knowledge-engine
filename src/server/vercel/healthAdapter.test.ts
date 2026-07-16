import { describe, expect, it } from "vitest";

import healthFunction, {
  createHealthFetchHandler,
} from "../../../api/health";

describe("Vercel health adapter", () => {
  it("exports the Web fetch contract", () => {
    expect(healthFunction).toEqual({ fetch: expect.any(Function) });
  });

  it("maps a Web Request to a no-store Web Response", async () => {
    const response = createHealthFetchHandler({
      OPENAI_API_KEY: "server-only-test-key",
      LIVE_AI_ENABLED: "true",
    })(new Request("https://example.test/api/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      schemaVersion: 1,
      service: "creative-knowledge-engine",
      liveAi: "enabled",
    });
  });

  it("rejects non-GET requests", async () => {
    const response = createHealthFetchHandler({})(
      new Request("https://example.test/api/health", { method: "POST" }),
    );
    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "METHOD_NOT_ALLOWED" }),
      }),
    );
  });
});
