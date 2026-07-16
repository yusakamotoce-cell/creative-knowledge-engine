import { z } from "zod";

import { sha256HexSchema } from "../shared/sha256";
import {
  isoDateTimeSchema,
  nonEmptyTrimmedStringSchema,
} from "../shared/schemas";
import {
  importedDocumentSchema,
  type ImportedDocument,
} from "./importedDocument";

export const importRegistryEntrySchema = z.strictObject({
  contentSha256: sha256HexSchema,
  documentId: nonEmptyTrimmedStringSchema,
  firstImportedAt: isoDateTimeSchema,
});

export type ImportRegistryEntry = z.infer<typeof importRegistryEntrySchema>;

export const importRegistrySchema = z.strictObject({
  entries: z.array(importRegistryEntrySchema),
});

export type ImportRegistry = z.infer<typeof importRegistrySchema>;

export function findImportRegistryEntry(
  registry: ImportRegistry,
  contentSha256: string,
): ImportRegistryEntry | null {
  const parsedRegistry = importRegistrySchema.parse(registry);
  const parsedHash = sha256HexSchema.parse(contentSha256);

  return (
    parsedRegistry.entries.find(
      (entry) => entry.contentSha256 === parsedHash,
    ) ?? null
  );
}

export function registerImportedDocument(
  registry: ImportRegistry,
  document: ImportedDocument,
): ImportRegistry {
  const parsedRegistry = importRegistrySchema.parse(registry);
  const parsedDocument = importedDocumentSchema.parse(document);

  if (
    parsedRegistry.entries.some(
      (entry) => entry.contentSha256 === parsedDocument.contentSha256,
    )
  ) {
    return parsedRegistry;
  }

  return {
    entries: [
      ...parsedRegistry.entries,
      {
        contentSha256: parsedDocument.contentSha256,
        documentId: parsedDocument.id,
        firstImportedAt: parsedDocument.importedAt,
      },
    ],
  };
}
