import { describe, expect, it, vi } from "vitest";

import { CandidateBundleGroundingError } from "../../core/import";
import { LiveExtractionServerError } from "./errors";
import {
  LiveExtractionService,
  type LiveExtractionModelClient,
} from "./liveExtractionService";
import { LIVE_EXTRACTION_PROMPT_VERSION } from "./prompt";
import {
  createLiveTestBundle,
  createLiveTestDocument,
  createLiveTestProviderBundle,
} from "../../test/liveExtractionTestSupport";

describe("LiveExtractionService", () => {
  it("runtime-validates and grounds a Candidate Bundle after model output", async () => {
    const bundle = createLiveTestBundle();
    const providerBundle = createLiveTestProviderBundle();
    const modelClient: LiveExtractionModelClient = {
      extract: vi.fn(async () => ({
        model: "gpt-5.6-fixed",
        providerCandidateBundle: providerBundle,
      })),
    };

    await expect(
      new LiveExtractionService(modelClient).extract(createLiveTestDocument()),
    ).resolves.toEqual({
      candidateBundle: bundle,
      meta: {
        model: "gpt-5.6-fixed",
        promptVersion: LIVE_EXTRACTION_PROMPT_VERSION,
      },
    });
  });

  it("rejects Structured Output that fails the existing Candidate Bundle Zod Schema", async () => {
    const modelClient: LiveExtractionModelClient = {
      extract: vi.fn(async () => ({
        model: "gpt-5.6",
        providerCandidateBundle: { schemaVersion: 1 },
      })),
    };

    await expect(
      new LiveExtractionService(modelClient).extract(createLiveTestDocument()),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "LiveExtractionServerError",
        code: "AI_INVALID_UPSTREAM_RESPONSE",
      } satisfies Partial<LiveExtractionServerError>),
    );
  });

  it("rejects Zod-valid but ungrounded SourceRef evidence", async () => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.sourceRefs[0]!.excerpt = "Not present";
    const modelClient: LiveExtractionModelClient = {
      extract: vi.fn(async () => ({
        model: "gpt-5.6",
        providerCandidateBundle: providerBundle,
      })),
    };

    await expect(
      new LiveExtractionService(modelClient).extract(createLiveTestDocument()),
    ).rejects.toEqual(
      expect.objectContaining({
        name: "CandidateBundleGroundingError",
        code: "AI_UNGROUNDED_SOURCE_REF",
      } satisfies Partial<CandidateBundleGroundingError>),
    );
  });
});
