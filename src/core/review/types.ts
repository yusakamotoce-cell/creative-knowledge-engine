import type {
  EntityCandidate,
  RelationshipCandidate,
} from "../candidates/candidate";
import type { KnowledgeState } from "../knowledge/knowledgeState";

export type ReviewPhase = "entities" | "relationships" | "complete";

export type EntityReviewStatus =
  | "pending"
  | "accepted"
  | "merged"
  | "rejected";

export type RelationshipReviewStatus =
  | "pending"
  | "accepted"
  | "merged"
  | "blocked"
  | "rejected";

export interface EntityReviewRecord {
  candidateId: string;
  candidate: EntityCandidate;
  status: EntityReviewStatus;
  registeredEntityId: string | null;
  duplicateEntityIds: string[];
}

export type RelationshipBlockedReason =
  | "unresolved_from"
  | "unresolved_to"
  | "unresolved_both"
  | "ambiguous_from"
  | "ambiguous_to"
  | "ambiguous_both"
  | "references_rejected_entity";

export type RelationshipReviewRecommendation = "reject" | null;

export interface RelationshipReviewRecord {
  candidateId: string;
  candidate: RelationshipCandidate;
  status: RelationshipReviewStatus;
  resolvedFromEntityId: string | null;
  resolvedToEntityId: string | null;
  blockedReason: RelationshipBlockedReason | null;
  recommendation: RelationshipReviewRecommendation;
  registeredRelationshipId: string | null;
}

export interface ReviewSession {
  schemaVersion: 1;
  documentId: string;
  phase: ReviewPhase;
  knowledge: KnowledgeState;
  entityReviews: EntityReviewRecord[];
  relationshipReviews: RelationshipReviewRecord[];
  candidateIdToRegisteredEntityId: Record<string, string>;
}
