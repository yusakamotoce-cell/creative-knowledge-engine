import { z } from "zod";

import { sha256HexSchema } from "../shared/sha256";
import {
  isoDateTimeSchema,
  nonEmptyTrimmedStringSchema,
} from "../shared/schemas";
import { ImportDomainError } from "./errors";

export const importSourceKindSchema = z.enum(["file", "pasted_text"]);
export type ImportSourceKind = z.infer<typeof importSourceKindSchema>;

export const importFormatSchema = z.enum([
  "plain_text",
  "markdown",
  "json",
]);
export type ImportFormat = z.infer<typeof importFormatSchema>;

export const importDocumentInputSchema = z.strictObject({
  sourceKind: importSourceKindSchema,
  format: importFormatSchema,
  fileName: nonEmptyTrimmedStringSchema,
  mediaType: nonEmptyTrimmedStringSchema,
  content: z.string().min(1),
});

export type ImportDocumentInput = z.infer<typeof importDocumentInputSchema>;

export const importedDocumentSchema = z.strictObject({
  id: nonEmptyTrimmedStringSchema,
  sourceKind: importSourceKindSchema,
  format: importFormatSchema,
  fileName: nonEmptyTrimmedStringSchema,
  mediaType: nonEmptyTrimmedStringSchema,
  content: z.string().min(1),
  contentSha256: sha256HexSchema,
  importedAt: isoDateTimeSchema,
});

export type ImportedDocument = z.infer<typeof importedDocumentSchema>;

export function validateImportDocumentInput(input: unknown): ImportDocumentInput {
  if (
    typeof input === "object" &&
    input !== null &&
    "content" in input &&
    input.content === ""
  ) {
    throw new ImportDomainError("EMPTY_DOCUMENT_CONTENT");
  }

  const parsed = importDocumentInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ImportDomainError("INVALID_IMPORT_INPUT", {
      cause: parsed.error,
    });
  }

  if (parsed.data.format === "json") {
    try {
      JSON.parse(parsed.data.content);
    } catch (cause) {
      throw new ImportDomainError("INVALID_JSON_DOCUMENT", { cause });
    }
  }

  return parsed.data;
}

export function validateImportedDocument(input: unknown): ImportedDocument {
  const parsed = importedDocumentSchema.safeParse(input);

  if (!parsed.success) {
    throw new ImportDomainError("INVALID_IMPORTED_DOCUMENT", {
      cause: parsed.error,
    });
  }

  return parsed.data;
}
