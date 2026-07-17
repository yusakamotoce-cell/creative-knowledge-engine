import { CandidateBundleGroundingError } from "../../core/import/candidateBundleGrounding.js";
import type { CandidateBundleGroundingErrorCode } from "../../core/import/candidateBundleGrounding.js";
import type { ImportedDocument } from "../../core/import/importedDocument.js";
import {
  LiveExtractionRequestError,
  validateLiveExtractionRequest,
} from "./contracts.js";
import { LiveExtractionServerError } from "./errors.js";
import type { LiveExtractionServerErrorCode } from "./errors.js";
import type { LiveExtractionService } from "./liveExtractionService.js";

export interface LiveExtractionHttpRequest {
  method: string | undefined;
  contentType: string | undefined;
  body: unknown;
}

export interface LiveExtractionHttpResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: unknown;
}

export interface LiveExtractionHttpHandlerInput {
  enabled: boolean;
  service?: LiveExtractionService;
}

const RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
});

const SAFE_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  METHOD_NOT_ALLOWED: "Method not allowed.",
  INVALID_CONTENT_TYPE: "A JSON request is required.",
  LIVE_AI_DISABLED: "Live AI extraction is unavailable.",
  AI_CONFIGURATION_ERROR: "Live AI extraction is not configured.",
  LIVE_REQUEST_INVALID: "The extraction request is invalid.",
  LIVE_REQUEST_TOO_LARGE: "The document exceeds the extraction limit.",
  AI_REFUSAL: "The model could not process this document.",
  AI_OUTPUT_INCOMPLETE: "The model output was incomplete.",
  AI_CONTENT_FILTERED: "The model output was blocked by a content filter.",
  AI_RESPONSE_INCOMPLETE: "The model response was incomplete.",
  AI_RATE_LIMITED: "Live AI extraction is temporarily rate limited.",
  AI_UPSTREAM_UNAVAILABLE: "Live AI extraction is temporarily unavailable.",
  AI_REQUEST_FAILED: "Live AI extraction failed.",
  AI_TIMEOUT: "Live AI extraction timed out.",
  AI_INVALID_UPSTREAM_RESPONSE: "The model returned an invalid result.",
  AI_DOCUMENT_ID_MISMATCH: "The model returned an invalid document reference.",
  AI_SOURCE_REF_MISMATCH: "The model returned an invalid source reference.",
  AI_UNGROUNDED_SOURCE_REF: "The model returned unsupported source evidence.",
  AI_OUTPUT_LIMIT_EXCEEDED: "The model output exceeded a safety limit.",
});

function failure(
  status: number,
  code: string,
  retryable = false,
): LiveExtractionHttpResponse {
  return {
    status,
    headers: RESPONSE_HEADERS,
    body: {
      ok: false,
      schemaVersion: 1,
      error: {
        code,
        message: SAFE_MESSAGES[code] ?? "Live AI extraction failed.",
        retryable,
      },
    },
  };
}

function mapServerError(
  code: LiveExtractionServerErrorCode,
): LiveExtractionHttpResponse {
  switch (code) {
    case "AI_CONFIGURATION_ERROR":
      return failure(500, code);
    case "AI_RATE_LIMITED":
      return failure(429, code, true);
    case "AI_UPSTREAM_UNAVAILABLE":
    case "AI_REQUEST_FAILED":
      return failure(502, code, true);
    case "AI_TIMEOUT":
      return failure(504, code, true);
    case "AI_REFUSAL":
    case "AI_OUTPUT_INCOMPLETE":
    case "AI_CONTENT_FILTERED":
    case "AI_RESPONSE_INCOMPLETE":
    case "AI_INVALID_UPSTREAM_RESPONSE":
      return failure(422, code);
  }
}

function mapGroundingError(
  code: CandidateBundleGroundingErrorCode,
): LiveExtractionHttpResponse {
  return failure(422, code);
}

function toImportedDocument(
  request: ReturnType<typeof validateLiveExtractionRequest>,
): ImportedDocument {
  return {
    ...request.document,
    sourceKind: "file",
    contentSha256: "0".repeat(64),
    importedAt: "1970-01-01T00:00:00.000Z",
  };
}

export function createLiveExtractionHttpHandler(
  input: LiveExtractionHttpHandlerInput,
): (request: LiveExtractionHttpRequest) => Promise<LiveExtractionHttpResponse> {
  return async (request) => {
    if (request.method?.toUpperCase() !== "POST") {
      return failure(405, "METHOD_NOT_ALLOWED");
    }
    if (!request.contentType?.toLowerCase().startsWith("application/json")) {
      return failure(400, "INVALID_CONTENT_TYPE");
    }
    if (!input.enabled) {
      return failure(503, "LIVE_AI_DISABLED", true);
    }
    if (input.service === undefined) {
      return failure(500, "AI_CONFIGURATION_ERROR");
    }

    let parsedRequest: ReturnType<typeof validateLiveExtractionRequest>;
    try {
      parsedRequest = validateLiveExtractionRequest(request.body);
    } catch (error) {
      if (error instanceof LiveExtractionRequestError) {
        return error.code === "LIVE_REQUEST_TOO_LARGE"
          ? failure(413, error.code)
          : failure(400, error.code);
      }
      return failure(400, "LIVE_REQUEST_INVALID");
    }

    try {
      const result = await input.service.extract(
        toImportedDocument(parsedRequest),
      );
      return {
        status: 200,
        headers: RESPONSE_HEADERS,
        body: {
          ok: true,
          schemaVersion: 1,
          candidateBundle: result.candidateBundle,
          meta: result.meta,
        },
      };
    } catch (error) {
      if (error instanceof LiveExtractionServerError) {
        return mapServerError(error.code);
      }
      if (error instanceof CandidateBundleGroundingError) {
        return mapGroundingError(error.code);
      }
      return failure(502, "AI_REQUEST_FAILED", true);
    }
  };
}
