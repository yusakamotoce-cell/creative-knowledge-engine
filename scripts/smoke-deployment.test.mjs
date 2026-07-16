/* global Response, URL */

import { describe, expect, it, vi } from "vitest";

import {
  DEPLOYMENT_SMOKE_DOCUMENT,
  deploymentSmokeMain,
  runDeploymentSmoke,
} from "./smoke-deployment.mjs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function liveSuccessBody() {
  return {
    ok: true,
    schemaVersion: 1,
    candidateBundle: {
      schemaVersion: 1,
      documentId: DEPLOYMENT_SMOKE_DOCUMENT.id,
      entities: [
        {
          candidateId: "candidate-mira",
          entityType: "character",
          name: "Mira Vale",
          aliases: [],
          description: "A navigator.",
          attributes: {
            role: "navigator",
            rank: 1,
            active: true,
          },
          tags: ["navigator"],
          sourceRefs: [
            {
              documentId: DEPLOYMENT_SMOKE_DOCUMENT.id,
              fileName: DEPLOYMENT_SMOKE_DOCUMENT.fileName,
              excerpt: "Mira Vale is a navigator in the Dawn Survey Team.",
            },
          ],
        },
      ],
      relationships: [],
    },
    meta: {
      model: "gpt-5.6-test",
      promptVersion: "creative-knowledge-candidate-extraction-v1",
    },
  };
}

function routeFetcher({ healthLiveAi = "disabled", liveBody = liveSuccessBody() } = {}) {
  return vi.fn(async (input, init = {}) => {
    const url = new URL(input);
    if (url.pathname === "/") {
      return new Response(
        '<!doctype html><title>Creative Knowledge Engine</title><div id="root"></div>',
        { status: 200 },
      );
    }
    if (url.pathname === "/api/health") {
      return Response.json(
        {
          ok: true,
          schemaVersion: 1,
          service: "creative-knowledge-engine",
          liveAi: healthLiveAi,
        },
        { status: 200, headers: NO_STORE_HEADERS },
      );
    }
    if (url.pathname === "/api/extract" && init.method === "GET") {
      return Response.json(
        {
          ok: false,
          schemaVersion: 1,
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Method not allowed.",
            retryable: false,
          },
        },
        { status: 405, headers: NO_STORE_HEADERS },
      );
    }
    if (url.pathname === "/api/extract" && init.method === "POST") {
      return Response.json(liveBody, {
        status: 200,
        headers: NO_STORE_HEADERS,
      });
    }
    return new Response(null, { status: 404 });
  });
}

describe("deployment smoke", () => {
  it("checks root, health, and extract method without opting into Live AI", async () => {
    const fetcher = routeFetcher();
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        fetcher,
      }),
    ).resolves.toEqual({
      root: "PASS",
      health: "PASS",
      extractMethod: "PASS",
      liveAi: "NOT_RUN",
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("makes exactly one synthetic POST when Live AI is explicitly enabled", async () => {
    const fetcher = routeFetcher({ healthLiveAi: "enabled" });
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        runLiveAi: true,
        fetcher,
      }),
    ).resolves.toEqual(
      expect.objectContaining({ liveAi: "PASS" }),
    );

    const postCalls = fetcher.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(postCalls).toHaveLength(1);
    const requestBody = JSON.parse(postCalls[0][1].body);
    expect(requestBody).toEqual({
      schemaVersion: 1,
      document: DEPLOYMENT_SMOKE_DOCUMENT,
    });
  });

  it("blocks an opted-in Live AI smoke when health reports disabled", async () => {
    const fetcher = routeFetcher({ healthLiveAi: "disabled" });
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        runLiveAi: true,
        fetcher,
      }),
    ).rejects.toMatchObject({ code: "LIVE_AI_DISABLED" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("rejects an invalid success envelope", async () => {
    const fetcher = routeFetcher({
      healthLiveAi: "enabled",
      liveBody: { ...liveSuccessBody(), unexpected: true },
    });
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        runLiveAi: true,
        fetcher,
      }),
    ).rejects.toMatchObject({ code: "LIVE_SUCCESS_ENVELOPE_INVALID" });
  });

  it("rejects ungrounded SourceRef evidence", async () => {
    const body = liveSuccessBody();
    body.candidateBundle.entities[0].sourceRefs[0].excerpt = "invented evidence";
    const fetcher = routeFetcher({ healthLiveAi: "enabled", liveBody: body });
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        runLiveAi: true,
        fetcher,
      }),
    ).rejects.toMatchObject({ code: "SOURCE_REF_UNGROUNDED" });
  });

  it("rejects unsafe response metadata without echoing its value", async () => {
    const fetcher = vi.fn(async (input) => {
      const url = new URL(input);
      if (url.pathname === "/") {
        return new Response(
          '<title>Creative Knowledge Engine</title><div id="root"></div>',
          { status: 200 },
        );
      }
      return Response.json(
        { ok: false, stack: "private-test-marker" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    });
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        fetcher,
      }),
    ).rejects.toMatchObject({ code: "UNSAFE_RESPONSE_METADATA" });
  });

  it("times out once without retrying", async () => {
    const fetcher = vi.fn((_input, init = {}) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      }),
    );
    await expect(
      runDeploymentSmoke({
        deploymentUrl: "https://preview.example.test",
        fetcher,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{}, 2, "BLOCKED: DEPLOYMENT_URL_NOT_SET"],
    [{ DEPLOYMENT_URL: "not-a-url" }, 2, "BLOCKED: DEPLOYMENT_URL_INVALID"],
  ])("returns a non-success exit for missing deployment configuration", async (env, exitCode, message) => {
    await expect(deploymentSmokeMain(env, { fetcher: routeFetcher() })).resolves.toEqual({
      exitCode,
      message,
    });
  });

  it("maps a validation failure to exit code 1", async () => {
    const result = await deploymentSmokeMain(
      { DEPLOYMENT_URL: "https://preview.example.test" },
      {
        fetcher: vi.fn(async () => new Response("not the app", { status: 200 })),
      },
    );
    expect(result).toEqual({ exitCode: 1, message: "FAIL: APP_ROOT_INVALID" });
  });
});
