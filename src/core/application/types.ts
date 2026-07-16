import { z } from "zod";

import type { KnowledgeState } from "../knowledge/knowledgeState";
import { isoDateTimeSchema, nonEmptyTrimmedStringSchema } from "../shared/schemas";
import type { StorageSnapshot } from "../storage/storageAdapter";

export const knowledgeRevisionSchema = z.number().int().nonnegative();

export const reviewApplicationRecordStorageSchema = z.strictObject({
  reviewSessionId: nonEmptyTrimmedStringSchema,
  appliedAt: isoDateTimeSchema,
  fromKnowledgeRevision: knowledgeRevisionSchema,
  toKnowledgeRevision: knowledgeRevisionSchema,
});

export const reviewApplicationRecordSchema =
  reviewApplicationRecordStorageSchema.superRefine((record, context) => {
    if (
      record.toKnowledgeRevision !==
      record.fromKnowledgeRevision + 1
    ) {
      context.addIssue({
        code: "custom",
        message: "toKnowledgeRevision must equal fromKnowledgeRevision + 1",
        path: ["toKnowledgeRevision"],
      });
    }
  });

export type ReviewApplicationRecord = z.infer<
  typeof reviewApplicationRecordSchema
>;

export type ApplyReviewSessionResult =
  | {
      status: "applied";
      reviewSessionId: string;
      knowledge: KnowledgeState;
      knowledgeRevision: number;
      application: ReviewApplicationRecord;
      snapshot: StorageSnapshot;
    }
  | {
      status: "already_applied";
      reviewSessionId: string;
      application: ReviewApplicationRecord;
      snapshot: StorageSnapshot;
    };

export interface ApplicationState {
  snapshot: StorageSnapshot;
}
