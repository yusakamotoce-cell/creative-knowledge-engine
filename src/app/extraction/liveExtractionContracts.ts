import { z } from "zod";

import { importFormatSchema } from "../../core/import/importedDocument.js";

export const LIVE_EXTRACTION_REQUEST_SCHEMA_VERSION = 1 as const;
export const LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS = 20_000;
export const LIVE_EXTRACTION_MAX_CONTENT_BYTES = 80 * 1024;
export const LIVE_EXTRACTION_MAX_FILE_NAME_CHARACTERS = 255;
export const LIVE_EXTRACTION_MAX_MEDIA_TYPE_CHARACTERS = 100;

const nonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, "must not be blank");

const liveExtractionDocumentSchema = z.strictObject({
  id: nonBlankStringSchema,
  fileName: nonBlankStringSchema.max(
    LIVE_EXTRACTION_MAX_FILE_NAME_CHARACTERS,
  ),
  format: importFormatSchema,
  mediaType: nonBlankStringSchema.max(
    LIVE_EXTRACTION_MAX_MEDIA_TYPE_CHARACTERS,
  ),
  content: nonBlankStringSchema,
});

export const liveExtractionRequestSchema = z.strictObject({
  schemaVersion: z.literal(LIVE_EXTRACTION_REQUEST_SCHEMA_VERSION),
  document: liveExtractionDocumentSchema,
});

export type LiveExtractionRequest = z.infer<
  typeof liveExtractionRequestSchema
>;

export type LiveExtractionRequestErrorCode =
  | "LIVE_REQUEST_INVALID"
  | "LIVE_REQUEST_TOO_LARGE";

export class LiveExtractionRequestError extends Error {
  readonly code: LiveExtractionRequestErrorCode;

  constructor(code: LiveExtractionRequestErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = "LiveExtractionRequestError";
    this.code = code;
  }
}

function containsNul(value: string): boolean {
  return value.includes("\0");
}

export function validateLiveExtractionRequest(
  input: unknown,
): LiveExtractionRequest {
  const parsed = liveExtractionRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new LiveExtractionRequestError("LIVE_REQUEST_INVALID", {
      cause: parsed.error,
    });
  }

  const { document } = parsed.data;
  if (
    containsNul(document.id) ||
    containsNul(document.fileName) ||
    containsNul(document.mediaType) ||
    containsNul(document.content)
  ) {
    throw new LiveExtractionRequestError("LIVE_REQUEST_INVALID");
  }

  const contentBytes = new TextEncoder().encode(document.content).byteLength;
  if (
    document.content.length > LIVE_EXTRACTION_MAX_CONTENT_CHARACTERS ||
    contentBytes > LIVE_EXTRACTION_MAX_CONTENT_BYTES
  ) {
    throw new LiveExtractionRequestError("LIVE_REQUEST_TOO_LARGE");
  }

  return parsed.data;
}

const liveExtractionMetaSchema = z.strictObject({
  model: nonBlankStringSchema,
  promptVersion: nonBlankStringSchema,
});

export const liveExtractionSuccessSchema = z
  .strictObject({
    ok: z.literal(true),
    schemaVersion: z.literal(LIVE_EXTRACTION_REQUEST_SCHEMA_VERSION),
    candidateBundle: z.unknown(),
    meta: liveExtractionMetaSchema,
  })
  .refine(
    (value) => Object.hasOwn(value, "candidateBundle"),
    "candidateBundle is required",
  );

export const liveExtractionFailureSchema = z.strictObject({
  ok: z.literal(false),
  schemaVersion: z.literal(LIVE_EXTRACTION_REQUEST_SCHEMA_VERSION),
  error: z.strictObject({
    code: nonBlankStringSchema,
    message: nonBlankStringSchema,
    retryable: z.boolean(),
  }),
});

export const liveExtractionResponseSchema = z.discriminatedUnion("ok", [
  liveExtractionSuccessSchema,
  liveExtractionFailureSchema,
]);

export type LiveExtractionSuccess = z.infer<
  typeof liveExtractionSuccessSchema
>;
export type LiveExtractionFailure = z.infer<
  typeof liveExtractionFailureSchema
>;
export type LiveExtractionResponse = z.infer<
  typeof liveExtractionResponseSchema
>;

export type FetchLike = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;
