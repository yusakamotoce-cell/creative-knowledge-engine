import { z } from "zod";

import {
  entityCandidateSchema,
  relationshipCandidateSchema,
} from "../candidates/candidate";
import { knowledgeStateSchema } from "../knowledge/knowledgeState";
import { knowledgeRevisionSchema } from "../application/types";
import { nonEmptyTrimmedStringSchema } from "../shared/schemas";

export const reviewPhaseSchema = z.enum([
  "entities",
  "relationships",
  "complete",
]);

export type ReviewPhase = z.infer<typeof reviewPhaseSchema>;

export const entityReviewStatusSchema = z.enum([
  "pending",
  "accepted",
  "merged",
  "rejected",
]);

export type EntityReviewStatus = z.infer<typeof entityReviewStatusSchema>;

export const relationshipReviewStatusSchema = z.enum([
  "pending",
  "accepted",
  "merged",
  "blocked",
  "rejected",
]);

export type RelationshipReviewStatus = z.infer<
  typeof relationshipReviewStatusSchema
>;

export const entityReviewRecordSchema = z.strictObject({
  candidateId: nonEmptyTrimmedStringSchema,
  candidate: entityCandidateSchema,
  status: entityReviewStatusSchema,
  registeredEntityId: nonEmptyTrimmedStringSchema.nullable(),
  duplicateEntityIds: z.array(nonEmptyTrimmedStringSchema),
});

export type EntityReviewRecord = z.infer<typeof entityReviewRecordSchema>;

export const relationshipBlockedReasonSchema = z.enum([
  "unresolved_from",
  "unresolved_to",
  "unresolved_both",
  "ambiguous_from",
  "ambiguous_to",
  "ambiguous_both",
  "references_rejected_entity",
]);

export type RelationshipBlockedReason = z.infer<
  typeof relationshipBlockedReasonSchema
>;

export type RelationshipReviewRecommendation = "reject" | null;

export const relationshipReviewRecordSchema = z.strictObject({
  candidateId: nonEmptyTrimmedStringSchema,
  candidate: relationshipCandidateSchema,
  status: relationshipReviewStatusSchema,
  resolvedFromEntityId: nonEmptyTrimmedStringSchema.nullable(),
  resolvedToEntityId: nonEmptyTrimmedStringSchema.nullable(),
  blockedReason: relationshipBlockedReasonSchema.nullable(),
  recommendation: z.literal("reject").nullable(),
  registeredRelationshipId: nonEmptyTrimmedStringSchema.nullable(),
});

export type RelationshipReviewRecord = z.infer<
  typeof relationshipReviewRecordSchema
>;

export const reviewSessionSchema = z.strictObject({
  id: nonEmptyTrimmedStringSchema,
  schemaVersion: z.literal(1),
  documentId: nonEmptyTrimmedStringSchema,
  baseKnowledgeRevision: knowledgeRevisionSchema,
  phase: reviewPhaseSchema,
  knowledge: knowledgeStateSchema,
  entityReviews: z.array(entityReviewRecordSchema),
  relationshipReviews: z.array(relationshipReviewRecordSchema),
  candidateIdToRegisteredEntityId: z.record(
    z.string(),
    nonEmptyTrimmedStringSchema,
  ),
});

export type ReviewSession = z.infer<typeof reviewSessionSchema>;
