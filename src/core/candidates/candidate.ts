import { z } from "zod";

import { entityTypeSchema } from "../entities/entity";
import {
  nonEmptyTrimmedStringSchema,
  scalarValueSchema,
} from "../shared/schemas";
import { sourceRefSchema } from "../shared/sourceRef";

export const entityCandidateSchema = z.strictObject({
  candidateId: nonEmptyTrimmedStringSchema,
  entityType: entityTypeSchema,
  name: nonEmptyTrimmedStringSchema,
  aliases: z.array(nonEmptyTrimmedStringSchema),
  description: z.string(),
  attributes: z.record(z.string(), scalarValueSchema),
  tags: z.array(z.string()),
  sourceRefs: z.array(sourceRefSchema),
});

export type EntityCandidate = z.infer<typeof entityCandidateSchema>;

export const entityReferenceSchema = z
  .strictObject({
    candidateId: nonEmptyTrimmedStringSchema.optional(),
    name: nonEmptyTrimmedStringSchema.optional(),
    entityType: entityTypeSchema.optional(),
  })
  .superRefine((reference, context) => {
    if (reference.candidateId === undefined && reference.name === undefined) {
      context.addIssue({
        code: "custom",
        message: "candidateId or name is required",
      });
    }
  });

export type EntityReference = z.infer<typeof entityReferenceSchema>;

export const relationshipCandidateSchema = z.strictObject({
  candidateId: nonEmptyTrimmedStringSchema,
  fromRef: entityReferenceSchema,
  toRef: entityReferenceSchema,
  relationType: nonEmptyTrimmedStringSchema,
  description: z.string(),
  sourceRefs: z.array(sourceRefSchema),
});

export type RelationshipCandidate = z.infer<
  typeof relationshipCandidateSchema
>;

export const candidateBundleSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documentId: nonEmptyTrimmedStringSchema,
  entities: z.array(entityCandidateSchema),
  relationships: z.array(relationshipCandidateSchema),
});

export type CandidateBundle = z.infer<typeof candidateBundleSchema>;
