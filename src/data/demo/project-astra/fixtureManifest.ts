import { z } from "zod";

import { nonEmptyTrimmedStringSchema } from "../../../core/shared/schemas";
import { sha256HexSchema } from "../../../core/shared/sha256";

const sourceFileSchema = z.strictObject({
  order: z.number().int().min(1).max(4),
  fileName: nonEmptyTrimmedStringSchema,
  format: z.literal("markdown"),
  mediaType: z.literal("text/markdown"),
  contentSha256: sha256HexSchema,
  documentId: nonEmptyTrimmedStringSchema,
  reviewSessionId: nonEmptyTrimmedStringSchema,
});

export const projectAstraFixtureManifestSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    sourceFiles: z.array(sourceFileSchema).length(4),
    expected: z.strictObject({
      finalKnowledgeFile: z.literal("expected/final-knowledge.json"),
      expectedInsightsFile: z.literal("expected/expected-insights.json"),
      finalKnowledgeRevision: z.literal(4),
    }),
  })
  .superRefine((manifest, context) => {
    const uniqueFields = [
      "order",
      "fileName",
      "documentId",
      "reviewSessionId",
    ] as const;

    for (const field of uniqueFields) {
      const values = manifest.sourceFiles.map((source) => String(source[field]));
      if (new Set(values).size !== values.length) {
        context.addIssue({
          code: "custom",
          message: `${field} must be unique`,
          path: ["sourceFiles"],
        });
      }
    }

    manifest.sourceFiles.forEach((source, index) => {
      if (source.order !== index + 1) {
        context.addIssue({
          code: "custom",
          message: "sourceFiles must be ordered from 1 through 4",
          path: ["sourceFiles", index, "order"],
        });
      }
    });
  });

export type ProjectAstraFixtureManifest = z.infer<
  typeof projectAstraFixtureManifestSchema
>;

export function parseProjectAstraFixtureManifest(
  input: unknown,
): ProjectAstraFixtureManifest {
  return projectAstraFixtureManifestSchema.parse(input);
}
