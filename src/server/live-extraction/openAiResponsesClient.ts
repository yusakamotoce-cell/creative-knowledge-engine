import type { ImportedDocument } from "../../core/import/importedDocument.js";
import type { FetchLike } from "./contracts.js";
import { providerCandidateBundleJsonSchema } from "./providerCandidateBundleJsonSchema.js";
import { LiveExtractionServerError } from "./errors.js";
import {
  buildLiveExtractionUserContent,
  LIVE_EXTRACTION_DEVELOPER_PROMPT,
} from "./prompt.js";

export const OPENAI_RESPONSES_API_URL =
  "https://api.openai.com/v1/responses";
export const DEFAULT_OPENAI_MODEL = "gpt-5.6";
export const LIVE_EXTRACTION_MAX_OUTPUT_TOKENS = 12_000;
export const LIVE_EXTRACTION_DEFAULT_TIMEOUT_MS = 55_000;

export interface OpenAiResponsesClientInput {
  apiKey: string;
  model?: string;
  fetcher: FetchLike;
  timeoutMs?: number;
}

export interface OpenAiProviderOutput {
  model: string;
  providerCandidateBundle: unknown;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapHttpFailure(status: number): LiveExtractionServerError {
  if (status === 401 || status === 403) {
    return new LiveExtractionServerError("AI_CONFIGURATION_ERROR");
  }
  if (status === 429) {
    return new LiveExtractionServerError("AI_RATE_LIMITED");
  }
  if (status >= 500) {
    return new LiveExtractionServerError("AI_UPSTREAM_UNAVAILABLE");
  }
  return new LiveExtractionServerError("AI_REQUEST_FAILED");
}

function extractOutputText(response: UnknownRecord): string {
  const output = response.output;
  if (!Array.isArray(output)) {
    throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
  }

  const textParts: string[] = [];
  for (const outputItem of output) {
    if (!isRecord(outputItem) || outputItem.type !== "message") {
      continue;
    }
    if (!Array.isArray(outputItem.content)) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
    }
    for (const contentItem of outputItem.content) {
      if (!isRecord(contentItem)) {
        throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
      }
      if (contentItem.type === "refusal") {
        throw new LiveExtractionServerError("AI_REFUSAL");
      }
      if (contentItem.type === "output_text") {
        if (typeof contentItem.text !== "string") {
          throw new LiveExtractionServerError(
            "AI_INVALID_UPSTREAM_RESPONSE",
          );
        }
        textParts.push(contentItem.text);
      }
    }
  }

  const outputText = textParts.join("");
  if (outputText.length === 0) {
    throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
  }
  return outputText;
}

function assertCompletedResponse(response: UnknownRecord): void {
  if (response.status === "completed") {
    return;
  }
  if (response.status !== "incomplete") {
    throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
  }

  const details = response.incomplete_details;
  if (isRecord(details) && details.reason === "max_output_tokens") {
    throw new LiveExtractionServerError("AI_OUTPUT_INCOMPLETE");
  }
  if (isRecord(details) && details.reason === "content_filter") {
    throw new LiveExtractionServerError("AI_CONTENT_FILTERED");
  }
  throw new LiveExtractionServerError("AI_RESPONSE_INCOMPLETE");
}

export class OpenAiResponsesClient {
  readonly #apiKey: string;
  readonly #model: string;
  readonly #fetcher: FetchLike;
  readonly #timeoutMs: number;

  constructor(input: OpenAiResponsesClientInput) {
    if (input.apiKey.trim().length === 0) {
      throw new LiveExtractionServerError("AI_CONFIGURATION_ERROR");
    }
    this.#apiKey = input.apiKey;
    this.#model = input.model?.trim() || DEFAULT_OPENAI_MODEL;
    this.#fetcher = input.fetcher;
    this.#timeoutMs = input.timeoutMs ?? LIVE_EXTRACTION_DEFAULT_TIMEOUT_MS;
  }

  async extract(document: ImportedDocument): Promise<OpenAiProviderOutput> {
    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, this.#timeoutMs);

    let response: Response;
    try {
      response = await this.#fetcher(OPENAI_RESPONSES_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.#model,
          store: false,
          reasoning: { effort: "low" },
          input: [
            {
              role: "developer",
              content: LIVE_EXTRACTION_DEVELOPER_PROMPT,
            },
            {
              role: "user",
              content: buildLiveExtractionUserContent(document),
            },
          ],
          max_output_tokens: LIVE_EXTRACTION_MAX_OUTPUT_TOKENS,
          text: {
            format: {
              type: "json_schema",
              name: "creative_knowledge_candidate_bundle",
              strict: true,
              schema: providerCandidateBundleJsonSchema,
            },
          },
        }),
        signal: controller.signal,
      });
    } catch (cause) {
      if (didTimeout) {
        throw new LiveExtractionServerError("AI_TIMEOUT", { cause });
      }
      throw new LiveExtractionServerError("AI_REQUEST_FAILED", { cause });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw mapHttpFailure(response.status);
    }

    let rawResponse: unknown;
    try {
      rawResponse = await response.json();
    } catch (cause) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE", {
        cause,
      });
    }
    if (!isRecord(rawResponse)) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
    }

    assertCompletedResponse(rawResponse);
    const outputText = extractOutputText(rawResponse);
    let providerCandidateBundle: unknown;
    try {
      providerCandidateBundle = JSON.parse(outputText);
    } catch (cause) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE", {
        cause,
      });
    }

    const responseModel = rawResponse.model;
    if (typeof responseModel !== "string" || responseModel.trim().length === 0) {
      throw new LiveExtractionServerError("AI_INVALID_UPSTREAM_RESPONSE");
    }

    return { model: responseModel, providerCandidateBundle };
  }
}
