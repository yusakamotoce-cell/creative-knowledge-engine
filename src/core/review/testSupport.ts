import type {
  CandidateBundle,
  EntityCandidate,
  RelationshipCandidate,
} from "../candidates/candidate";
import type { Entity } from "../entities/entity";
import type { KnowledgeState } from "../knowledge/knowledgeState";
import type { Relationship } from "../relationships/relationship";
import { SequenceIdGenerator } from "../shared/idGenerator";
import type { SourceRef } from "../shared/sourceRef";
import { ReviewDomainError, type ReviewErrorCode } from "./errors";
import { createReviewSession } from "./reviewSession";
import type { ReviewSession } from "./types";

export const timestampA = "2026-07-16T00:00:00.000Z";
export const timestampB = "2026-07-16T01:00:00.000Z";

export const sourceA: SourceRef = {
  documentId: "doc-1",
  fileName: "one.md",
  excerpt: "source one",
};

export const sourceB: SourceRef = {
  documentId: "doc-2",
  fileName: "two.md",
  excerpt: "source two",
};

export function makeReviewSessionDependencies(
  id = "review-session-1",
): { idGenerator: SequenceIdGenerator } {
  return { idGenerator: new SequenceIdGenerator([id]) };
}

export function createTestReviewSession(input: {
  bundle: CandidateBundle;
  initialKnowledge: KnowledgeState;
}, id = "review-session-1"): ReviewSession {
  return createReviewSession(input, makeReviewSessionDependencies(id));
}

export function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: "entity-existing",
    entityType: "character",
    name: "Nova",
    aliases: ["N"],
    description: "Existing description",
    attributes: {},
    tags: ["existing"],
    sourceRefs: [sourceA],
    createdAt: timestampA,
    updatedAt: timestampA,
    ...overrides,
  };
}

export function makeRelationship(
  overrides: Partial<Relationship> = {},
): Relationship {
  return {
    id: "relationship-existing",
    fromEntityId: "entity-existing",
    toEntityId: "entity-team",
    relationType: "member_of",
    description: "Existing relationship",
    sourceRefs: [sourceA],
    createdAt: timestampA,
    updatedAt: timestampA,
    ...overrides,
  };
}

export function makeEntityCandidate(
  overrides: Partial<EntityCandidate> = {},
): EntityCandidate {
  return {
    candidateId: "candidate-nova",
    entityType: "character",
    name: "Nova",
    aliases: [],
    description: "Candidate description",
    attributes: {},
    tags: [],
    sourceRefs: [sourceB],
    ...overrides,
  };
}

export function makeRelationshipCandidate(
  overrides: Partial<RelationshipCandidate> = {},
): RelationshipCandidate {
  return {
    candidateId: "candidate-relationship",
    fromRef: { candidateId: "candidate-nova" },
    toRef: { name: "Team", entityType: "organization" },
    relationType: "member_of",
    description: "Candidate relationship",
    sourceRefs: [sourceB],
    ...overrides,
  };
}

export function makeBundle(
  overrides: Partial<CandidateBundle> = {},
): CandidateBundle {
  return {
    schemaVersion: 1,
    documentId: "bundle-doc",
    entities: [makeEntityCandidate()],
    relationships: [makeRelationshipCandidate()],
    ...overrides,
  };
}

export function makeKnowledge(
  overrides: Partial<KnowledgeState> = {},
): KnowledgeState {
  return {
    entities: [
      makeEntity(),
      makeEntity({
        id: "entity-team",
        entityType: "organization",
        name: "Team",
        aliases: [],
      }),
    ],
    relationships: [],
    ...overrides,
  };
}

export function expectReviewError(
  action: () => unknown,
  code: ReviewErrorCode,
): void {
  try {
    action();
  } catch (error) {
    if (!(error instanceof ReviewDomainError)) {
      throw error;
    }

    if (error.code !== code) {
      throw new Error(`Expected ${code}, received ${error.code}`, {
        cause: error,
      });
    }
    return;
  }

  throw new Error(`Expected ${code} to be thrown`);
}
