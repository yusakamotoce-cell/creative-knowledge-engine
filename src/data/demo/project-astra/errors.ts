export const projectAstraFixtureErrorCodes = [
  "CANDIDATE_DOCUMENT_ID_MISMATCH",
  "SOURCE_HASH_MISMATCH",
  "IMPORT_DID_NOT_CREATE_SESSION",
  "EXPECTED_DUPLICATE_NOT_FOUND",
  "EXPECTED_BLOCKED_RELATIONSHIP_NOT_FOUND",
  "BLOCKED_RELATIONSHIP_ACCEPTED",
  "FIXED_SEQUENCE_NOT_EXHAUSTED",
] as const;

export type ProjectAstraFixtureErrorCode =
  (typeof projectAstraFixtureErrorCodes)[number];

export class ProjectAstraFixtureError extends Error {
  readonly code: ProjectAstraFixtureErrorCode;

  constructor(code: ProjectAstraFixtureErrorCode) {
    super(code);
    this.name = "ProjectAstraFixtureError";
    this.code = code;
  }
}
