import { z } from "zod";

import {
  knowledgeRevisionSchema,
  reviewApplicationRecordStorageSchema,
} from "../application/types";
import { importRegistrySchema } from "../import/importRegistry";
import { importedDocumentSchema } from "../import/importedDocument";
import {
  knowledgeStateSchema,
  type KnowledgeState,
} from "../knowledge/knowledgeState";
import { ReviewDomainError } from "../review/errors";
import { reviewSessionSchema, type ReviewSession } from "../review/types";
import { StorageDomainError, type StorageErrorCode } from "./errors";
import type { StorageSnapshot } from "./storageAdapter";

export const storageSnapshotSchema = z.strictObject({
  knowledge: knowledgeStateSchema,
  knowledgeRevision: knowledgeRevisionSchema,
  reviewSessions: z.array(reviewSessionSchema),
  reviewApplications: z.array(reviewApplicationRecordStorageSchema),
  importedDocuments: z.array(importedDocumentSchema),
  importRegistry: importRegistrySchema,
});

function requireUnique(
  values: readonly string[],
  code: StorageErrorCode,
): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new StorageDomainError(code);
    }
    seen.add(value);
  }
}

function validateKnowledgeIntegrity(knowledge: KnowledgeState): void {
  const entityIds = knowledge.entities.map((entity) => entity.id);
  const relationshipIds = knowledge.relationships.map(
    (relationship) => relationship.id,
  );

  if (new Set(entityIds).size !== entityIds.length) {
    throw new ReviewDomainError("DUPLICATE_ENTITY_ID");
  }
  if (new Set(relationshipIds).size !== relationshipIds.length) {
    throw new ReviewDomainError("DUPLICATE_RELATIONSHIP_ID");
  }

  const entityIdSet = new Set(entityIds);
  if (
    knowledge.relationships.some(
      (relationship) =>
        !entityIdSet.has(relationship.fromEntityId) ||
        !entityIdSet.has(relationship.toEntityId),
    )
  ) {
    throw new ReviewDomainError("DANGLING_RELATIONSHIP_ENDPOINT");
  }
}

function validateReviewSessionIntegrity(session: ReviewSession): void {
  validateKnowledgeIntegrity(session.knowledge);

  const candidateIds = [
    ...session.entityReviews.map((review) => review.candidateId),
    ...session.relationshipReviews.map((review) => review.candidateId),
  ];
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new ReviewDomainError("DUPLICATE_CANDIDATE_ID");
  }
}

export function parseStorageSnapshot(input: unknown): StorageSnapshot {
  const parsed = storageSnapshotSchema.safeParse(input);
  if (!parsed.success) {
    throw new StorageDomainError("INVALID_STORAGE_SNAPSHOT", {
      cause: parsed.error,
    });
  }

  const snapshot = parsed.data;
  requireUnique(
    snapshot.importedDocuments.map((document) => document.id),
    "DUPLICATE_IMPORTED_DOCUMENT_ID",
  );
  requireUnique(
    snapshot.reviewSessions.map((session) => session.id),
    "DUPLICATE_REVIEW_SESSION_ID",
  );
  requireUnique(
    snapshot.importRegistry.entries.map((entry) => entry.contentSha256),
    "DUPLICATE_IMPORT_HASH",
  );
  requireUnique(
    snapshot.reviewApplications.map((application) => application.reviewSessionId),
    "DUPLICATE_REVIEW_APPLICATION",
  );

  const documentsById = new Map(
    snapshot.importedDocuments.map((document) => [document.id, document]),
  );
  for (const entry of snapshot.importRegistry.entries) {
    const document = documentsById.get(entry.documentId);
    if (document === undefined) {
      throw new StorageDomainError("IMPORT_REGISTRY_DANGLING_DOCUMENT");
    }
    if (document.contentSha256 !== entry.contentSha256) {
      throw new StorageDomainError("INVALID_STORAGE_SNAPSHOT");
    }
  }

  if (
    snapshot.reviewSessions.some(
      (session) => !documentsById.has(session.documentId),
    )
  ) {
    throw new StorageDomainError("REVIEW_SESSION_DANGLING_DOCUMENT");
  }

  const reviewSessionIds = new Set(
    snapshot.reviewSessions.map((session) => session.id),
  );
  if (
    snapshot.reviewApplications.some(
      (application) => !reviewSessionIds.has(application.reviewSessionId),
    )
  ) {
    throw new StorageDomainError("REVIEW_APPLICATION_DANGLING_SESSION");
  }

  for (const application of snapshot.reviewApplications) {
    if (
      application.toKnowledgeRevision !==
      application.fromKnowledgeRevision + 1
    ) {
      throw new StorageDomainError("INVALID_REVIEW_APPLICATION_REVISION");
    }
  }

  for (let index = 1; index < snapshot.reviewApplications.length; index += 1) {
    const previous = snapshot.reviewApplications[index - 1];
    const current = snapshot.reviewApplications[index];
    if (
      previous === undefined ||
      current === undefined ||
      previous.toKnowledgeRevision !== current.fromKnowledgeRevision
    ) {
      throw new StorageDomainError("INVALID_REVIEW_APPLICATION_REVISION");
    }
  }

  const finalApplication = snapshot.reviewApplications.at(-1);
  if (finalApplication === undefined) {
    if (snapshot.knowledgeRevision !== 0) {
      throw new StorageDomainError("INVALID_REVIEW_APPLICATION_REVISION");
    }
  } else if (
    finalApplication.toKnowledgeRevision !== snapshot.knowledgeRevision
  ) {
    throw new StorageDomainError("INVALID_REVIEW_APPLICATION_REVISION");
  }

  validateKnowledgeIntegrity(snapshot.knowledge);
  for (const session of snapshot.reviewSessions) {
    validateReviewSessionIntegrity(session);
  }

  return snapshot;
}
