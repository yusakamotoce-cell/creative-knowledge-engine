import { candidateBundleSchema, type CandidateBundle } from "../../core/candidates/candidate.js";
import { validateCandidateBundleGrounding } from "../../core/import/candidateBundleGrounding.js";
import type { ImportedDocument } from "../../core/import/importedDocument";
import { LiveExtractionServerError } from "./errors.js";
import type { OpenAiProviderOutput } from "./openAiResponsesClient";
import { LIVE_EXTRACTION_PROMPT_VERSION } from "./prompt.js";
import { convertProviderCandidateBundle } from "./providerCandidateBundle.js";

export interface LiveExtractionModelClient {
  extract(document: ImportedDocument): Promise<OpenAiProviderOutput>;
}

export interface LiveExtractionResult {
  candidateBundle: CandidateBundle;
  meta: {
    model: string;
    promptVersion: string;
  };
}

export class LiveExtractionService {
  readonly #modelClient: LiveExtractionModelClient;

  constructor(modelClient: LiveExtractionModelClient) {
    this.#modelClient = modelClient;
  }

  async extract(document: ImportedDocument): Promise<LiveExtractionResult> {
    const modelOutput = await this.#modelClient.extract(document);
    let converted: CandidateBundle;
    try {
      converted = convertProviderCandidateBundle(
        modelOutput.providerCandidateBundle,
      );
    } catch (cause) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE", {
        cause,
      });
    }

    const parsed = candidateBundleSchema.safeParse(converted);
    if (!parsed.success) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE", {
        cause: parsed.error,
      });
    }

    const candidateBundle = validateCandidateBundleGrounding(
      document,
      parsed.data,
    );
    return {
      candidateBundle,
      meta: {
        model: modelOutput.model,
        promptVersion: LIVE_EXTRACTION_PROMPT_VERSION,
      },
    };
  }
}
