export const applicationErrorCodes = [
  "REVIEW_SESSION_NOT_FOUND",
  "REVIEW_SESSION_NOT_COMPLETE",
  "REVIEW_SESSION_ALREADY_APPLIED",
  "KNOWLEDGE_REVISION_CONFLICT",
] as const;

export type ApplicationErrorCode = (typeof applicationErrorCodes)[number];

export interface ApplicationErrorDetails {
  reviewSessionId?: string;
  expectedRevision?: number;
  actualRevision?: number;
}

export class ApplicationDomainError extends Error {
  readonly code: ApplicationErrorCode;
  readonly details: ApplicationErrorDetails;
  readonly reviewSessionId: string | undefined;
  readonly expectedRevision: number | undefined;
  readonly actualRevision: number | undefined;

  constructor(
    code: ApplicationErrorCode,
    details: ApplicationErrorDetails = {},
  ) {
    super(code);
    this.name = "ApplicationDomainError";
    this.code = code;
    this.details = { ...details };
    this.reviewSessionId = details.reviewSessionId;
    this.expectedRevision = details.expectedRevision;
    this.actualRevision = details.actualRevision;
  }
}
