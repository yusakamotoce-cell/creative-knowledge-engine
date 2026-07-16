export const reviewErrorCodes = [
  "INVALID_REVIEW_PHASE",
  "CANDIDATE_NOT_FOUND",
  "CANDIDATE_ALREADY_REVIEWED",
  "ENTITY_NOT_FOUND",
  "ENTITY_TYPE_MISMATCH",
  "ENTITY_REVIEW_INCOMPLETE",
  "RELATIONSHIP_REVIEW_INCOMPLETE",
  "ATTRIBUTE_SOURCE_REF_REQUIRED",
  "ATTRIBUTE_KEY_COLLISION",
  "MANUAL_ENTITY_NOT_FOUND",
  "RELATIONSHIP_BLOCKED",
  "RELATIONSHIP_ENDPOINT_UNRESOLVED",
  "DUPLICATE_CANDIDATE_ID",
  "DUPLICATE_ENTITY_ID",
  "DUPLICATE_RELATIONSHIP_ID",
  "DANGLING_RELATIONSHIP_ENDPOINT",
  "DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE",
  "CLOCK_SEQUENCE_EXHAUSTED",
] as const;

export type ReviewErrorCode = (typeof reviewErrorCodes)[number];

export class ReviewDomainError extends Error {
  readonly code: ReviewErrorCode;

  constructor(code: ReviewErrorCode, message = code) {
    super(message);
    this.name = "ReviewDomainError";
    this.code = code;
  }
}

export function throwReviewError(code: ReviewErrorCode): never {
  throw new ReviewDomainError(code);
}
