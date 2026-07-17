import { z } from "zod";

import { nonEmptyTrimmedStringSchema } from "./schemas.js";

export const sourceRefSchema = z.strictObject({
  documentId: nonEmptyTrimmedStringSchema,
  fileName: nonEmptyTrimmedStringSchema,
  excerpt: z.string(),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;

export function buildSourceRefKey(sourceRef: SourceRef): string {
  const parsed = sourceRefSchema.parse(sourceRef);

  return JSON.stringify([
    parsed.documentId,
    parsed.fileName,
    parsed.excerpt,
  ]);
}
