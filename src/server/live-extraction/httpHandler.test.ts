import { describe, expect, it, vi } from "vitest";

import { LiveExtractionServerError } from "./errors";
import {
  createLiveExtractionHttpHandler,
  type LiveExtractionHttpRequest,
} from "./httpHandler";
import {
  LiveExtractionService,
  type LiveExtractionModelClient,
} from "./liveExtractionService";
import {
  createLiveTestBundle,
  createLiveTestDocument,
  createLiveTestProviderBundle,
} from "../../test/liveExtractionTestSupport";

function request(overrides: Partial<LiveExtractionHttpRequest> = {}): LiveExtractionHttpRequest {
  const document = createLiveTestDocument();
  return {
    method: "POST",
    contentType: "application/json; charset=utf-8",
    body: {
      schemaVersion: 1,
      document: {
        id: document.id,
        fileName: document.fileName,
        format: document.format,
        mediaType: document.mediaType,
        content: document.content,
      },
    },
    ...overrides,
  };
}

function serviceFor(
  implementation: LiveExtractionModelClient["extract"] = vi.fn(async () => ({
    model: "gpt-5.6-fixed",
    providerCandidateBundle: createLiveTestProviderBundle(),
  })),
): LiveExtractionService {
  return new LiveExtractionService({ extract: implementation });
}

describe("Live extraction HTTP handler", () => {
  it("returns a strict success envelope with no-store headers", async () => {
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(),
    })(request());

    expect(result.status).toBe(200);
    expect(result.headers).toEqual({
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    });
    expect(result.headers).not.toHaveProperty("Access-Control-Allow-Origin");
    expect(result.body).toEqual({
      ok: true,
      schemaVersion: 1,
      candidateBundle: createLiveTestBundle(),
      meta: {
        model: "gpt-5.6-fixed",
        promptVersion: "creative-knowledge-candidate-extraction-v1",
      },
    });
  });

  it.each(["GET", "PUT", undefined])("rejects non-POST method %s", async (method) => {
    const model = vi.fn<LiveExtractionModelClient["extract"]>();
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(model),
    })(request({ method }));

    expect(result.status).toBe(405);
    expect(result.body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "METHOD_NOT_ALLOWED" }),
      }),
    );
    expect(model).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON content type", async () => {
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(),
    })(request({ contentType: "text/plain" }));
    expect(result.status).toBe(400);
    expect(result.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "INVALID_CONTENT_TYPE" }),
      }),
    );
  });

  it("can be disabled without invoking the model", async () => {
    const model = vi.fn<LiveExtractionModelClient["extract"]>();
    const result = await createLiveExtractionHttpHandler({
      enabled: false,
      service: serviceFor(model),
    })(request());
    expect(result.status).toBe(503);
    expect(result.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "LIVE_AI_DISABLED",
          retryable: true,
        }),
      }),
    );
    expect(model).not.toHaveBeenCalled();
  });

  it("returns a safe configuration error when no server service exists", async () => {
    const result = await createLiveExtractionHttpHandler({ enabled: true })(
      request(),
    );
    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      ok: false,
      schemaVersion: 1,
      error: {
        code: "AI_CONFIGURATION_ERROR",
        message: "Live AI extraction is not configured.",
        retryable: false,
      },
    });
  });

  it.each([
    [
      "invalid body",
      { ...request(), body: { schemaVersion: 1, document: { content: "x" } } },
      400,
      "LIVE_REQUEST_INVALID",
    ],
    [
      "oversized body",
      {
        ...request(),
        body: {
          ...(request().body as Record<string, unknown>),
          document: {
            ...((request().body as { document: Record<string, unknown> }).document),
            content: "x".repeat(20_001),
          },
        },
      },
      413,
      "LIVE_REQUEST_TOO_LARGE",
    ],
  ] as const)("maps %s", async (_name, input, status, code) => {
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(),
    })(input);
    expect(result.status).toBe(status);
    expect(result.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code }),
      }),
    );
  });

  it.each([
    ["AI_REFUSAL", 422, false],
    ["AI_OUTPUT_INCOMPLETE", 422, false],
    ["AI_CONTENT_FILTERED", 422, false],
    ["AI_RESPONSE_INCOMPLETE", 422, false],
    ["AI_CONFIGURATION_ERROR", 500, false],
    ["AI_RATE_LIMITED", 429, true],
    ["AI_UPSTREAM_UNAVAILABLE", 502, true],
    ["AI_REQUEST_FAILED", 502, true],
    ["AI_TIMEOUT", 504, true],
    ["AI_INVALID_UPSTREAM_RESPONSE", 422, false],
  ] as const)("maps %s to safe HTTP status", async (code, status, retryable) => {
    const rawDetail = "raw upstream secret and document text";
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(async () => {
        throw new LiveExtractionServerError(code, {
          cause: new Error(rawDetail),
        });
      }),
    })(request());

    expect(result.status).toBe(status);
    expect(result.body).toEqual(
      expect.objectContaining({
        ok: false,
        schemaVersion: 1,
        error: expect.objectContaining({ code, retryable }),
      }),
    );
    expect(JSON.stringify(result.body)).not.toContain(rawDetail);
    expect(result.headers["Cache-Control"]).toBe("no-store");
  });

  it("maps grounding failures to 422 without evidence content", async () => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.sourceRefs[0]!.excerpt =
      "unsupported raw evidence";
    const result = await createLiveExtractionHttpHandler({
      enabled: true,
      service: serviceFor(async () => ({
        model: "gpt-5.6",
        providerCandidateBundle: providerBundle,
      })),
    })(request());

    expect(result.status).toBe(422);
    expect(result.body).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ code: "AI_UNGROUNDED_SOURCE_REF" }),
      }),
    );
    expect(JSON.stringify(result.body)).not.toContain("unsupported raw evidence");
  });
});
