import { candidateBundleSchema } from "../../core/candidates/candidate";
import type { ExtractionAdapter } from "../../core/import/extractionAdapter";
import {
  CandidateBundleGroundingError,
  validateCandidateBundleGrounding,
} from "../../core/import/candidateBundleGrounding";
import type { ImportedDocument } from "../../core/import/importedDocument";
import {
  liveExtractionResponseSchema,
  LiveExtractionRequestError,
  type FetchLike,
  validateLiveExtractionRequest,
} from "./liveExtractionContracts";

export type LiveExtractionAdapterErrorCode =
  | "LIVE_AI_UNAVAILABLE"
  | "LIVE_AI_REQUEST_INVALID"
  | "LIVE_AI_RATE_LIMITED"
  | "LIVE_AI_TIMEOUT"
  | "LIVE_AI_REFUSED"
  | "LIVE_AI_OUTPUT_INCOMPLETE"
  | "LIVE_AI_INVALID_RESPONSE"
  | "LIVE_AI_EXTRACTION_FAILED";

export class LiveExtractionAdapterError extends Error {
  readonly code: LiveExtractionAdapterErrorCode;

  constructor(code: LiveExtractionAdapterErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "LiveExtractionAdapterError";
    this.code = code;
  }
}

export interface RemoteExtractionAdapterInput {
  endpoint?: string;
  fetcher: FetchLike;
  timeoutMs?: number;
}

function mapServerFailure(code: string): LiveExtractionAdapterErrorCode {
  switch (code) {
    case "AI_RATE_LIMITED":
      return "LIVE_AI_RATE_LIMITED";
    case "AI_TIMEOUT":
      return "LIVE_AI_TIMEOUT";
    case "AI_REFUSAL":
      return "LIVE_AI_REFUSED";
    case "AI_OUTPUT_INCOMPLETE":
    case "AI_CONTENT_FILTERED":
    case "AI_RESPONSE_INCOMPLETE":
      return "LIVE_AI_OUTPUT_INCOMPLETE";
    case "LIVE_REQUEST_INVALID":
    case "LIVE_REQUEST_TOO_LARGE":
      return "LIVE_AI_REQUEST_INVALID";
    case "AI_INVALID_UPSTREAM_RESPONSE":
    case "AI_DOCUMENT_ID_MISMATCH":
    case "AI_SOURCE_REF_MISMATCH":
    case "AI_UNGROUNDED_SOURCE_REF":
    case "AI_OUTPUT_LIMIT_EXCEEDED":
      return "LIVE_AI_INVALID_RESPONSE";
    case "LIVE_AI_DISABLED":
    case "AI_CONFIGURATION_ERROR":
    case "AI_UPSTREAM_UNAVAILABLE":
    case "AI_REQUEST_FAILED":
      return "LIVE_AI_UNAVAILABLE";
    default:
      return "LIVE_AI_EXTRACTION_FAILED";
  }
}

export class RemoteExtractionAdapter implements ExtractionAdapter {
  readonly #endpoint: string;
  readonly #fetcher: FetchLike;
  readonly #timeoutMs: number;

  constructor(input: RemoteExtractionAdapterInput) {
    this.#endpoint = input.endpoint ?? "/api/extract";
    this.#fetcher = input.fetcher;
    this.#timeoutMs = input.timeoutMs ?? 60_000;
  }

  async extract(document: ImportedDocument): Promise<unknown> {
    let request;
    try {
      request = validateLiveExtractionRequest({
        schemaVersion: 1,
        document: {
          id: document.id,
          fileName: document.fileName,
          format: document.format,
          mediaType: document.mediaType,
          content: document.content,
        },
      });
    } catch (cause) {
      if (cause instanceof LiveExtractionRequestError) {
        throw new LiveExtractionAdapterError("LIVE_AI_REQUEST_INVALID", {
          cause,
        });
      }
      throw cause;
    }

    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, this.#timeoutMs);

    let response: Response;
    try {
      response = await this.#fetcher(this.#endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (cause) {
      if (didTimeout) {
        throw new LiveExtractionAdapterError("LIVE_AI_TIMEOUT", { cause });
      }
      throw new LiveExtractionAdapterError("LIVE_AI_UNAVAILABLE", { cause });
    } finally {
      clearTimeout(timeoutId);
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch (cause) {
      throw new LiveExtractionAdapterError("LIVE_AI_INVALID_RESPONSE", {
        cause,
      });
    }

    const envelope = liveExtractionResponseSchema.safeParse(responseBody);
    if (!envelope.success || (response.ok && !envelope.data.ok)) {
      throw new LiveExtractionAdapterError("LIVE_AI_INVALID_RESPONSE", {
        cause: envelope.success ? undefined : envelope.error,
      });
    }
    if (!envelope.data.ok) {
      throw new LiveExtractionAdapterError(
        mapServerFailure(envelope.data.error.code),
      );
    }
    if (!response.ok) {
      throw new LiveExtractionAdapterError("LIVE_AI_INVALID_RESPONSE");
    }

    const candidateBundle = candidateBundleSchema.safeParse(
      envelope.data.candidateBundle,
    );
    if (!candidateBundle.success) {
      throw new LiveExtractionAdapterError("LIVE_AI_INVALID_RESPONSE", {
        cause: candidateBundle.error,
      });
    }

    try {
      return validateCandidateBundleGrounding(document, candidateBundle.data);
    } catch (cause) {
      if (cause instanceof CandidateBundleGroundingError) {
        throw new LiveExtractionAdapterError("LIVE_AI_INVALID_RESPONSE", {
          cause,
        });
      }
      throw cause;
    }
  }
}
