export type LiveExtractionServerErrorCode =
  | "AI_REFUSAL"
  | "AI_OUTPUT_INCOMPLETE"
  | "AI_CONTENT_FILTERED"
  | "AI_RESPONSE_INCOMPLETE"
  | "AI_CONFIGURATION_ERROR"
  | "AI_RATE_LIMITED"
  | "AI_UPSTREAM_UNAVAILABLE"
  | "AI_REQUEST_FAILED"
  | "AI_TIMEOUT"
  | "AI_INVALID_UPSTREAM_RESPONSE";

export class LiveExtractionServerError extends Error {
  readonly code: LiveExtractionServerErrorCode;

  constructor(code: LiveExtractionServerErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "LiveExtractionServerError";
    this.code = code;
  }
}
