import { describe, expect, it } from "vitest";

import { SequenceIdGenerator } from "../shared/idGenerator";
import { rejectEntityCandidate } from "./entityReview";
import {
  advanceToRelationshipReview,
  completeReviewSession,
  createReviewSession as createReviewSessionWithId,
} from "./reviewSession";
import {
  expectReviewError,
  makeBundle,
  makeEntity,
  makeEntityCandidate,
  makeKnowledge,
  makeRelationship,
  makeRelationshipCandidate,
  makeReviewSessionDependencies,
} from "./testSupport";
import { reviewSessionSchema } from "./types";

function createReviewSession(
  input: Parameters<typeof createReviewSessionWithId>[0],
) {
  return createReviewSessionWithId(input, makeReviewSessionDependencies());
}

describe("createReviewSession", () => {
  it("creates ordered pending reviews in the entity phase", () => {
    const bundle = makeBundle({
      entities: [
        makeEntityCandidate({ candidateId: "candidate-2", name: "Two" }),
        makeEntityCandidate({ candidateId: "candidate-1", name: "One" }),
      ],
      relationships: [
        makeRelationshipCandidate({ candidateId: "relationship-2" }),
        makeRelationshipCandidate({ candidateId: "relationship-1" }),
      ],
    });
    const session = createReviewSession({ bundle, initialKnowledge: makeKnowledge() });

    expect(session.phase).toBe("entities");
    expect(session.id).toBe("review-session-1");
    expect(session.entityReviews.map(({ candidateId }) => candidateId)).toEqual([
      "candidate-2",
      "candidate-1",
    ]);
    expect(session.relationshipReviews.map(({ candidateId }) => candidateId)).toEqual([
      "relationship-2",
      "relationship-1",
    ]);
    expect(session.candidateIdToRegisteredEntityId).toEqual({});
  });

  it("computes initial duplicate candidates from Knowledge", () => {
    const session = createReviewSession({
      bundle: makeBundle({
        entities: [makeEntityCandidate({ aliases: ["N"] })],
      }),
      initialKnowledge: makeKnowledge(),
    });

    expect(session.entityReviews[0]?.duplicateEntityIds).toEqual([
      "entity-existing",
    ]);
  });

  it("rejects duplicate Candidate IDs across entity and relationship arrays", () => {
    expectReviewError(
      () =>
        createReviewSession({
          bundle: makeBundle({
            relationships: [
              makeRelationshipCandidate({ candidateId: "candidate-nova" }),
            ],
          }),
          initialKnowledge: makeKnowledge(),
        }),
      "DUPLICATE_CANDIDATE_ID",
    );
  });

  it("rejects duplicate Entity IDs", () => {
    expectReviewError(
      () =>
        createReviewSession({
          bundle: makeBundle(),
          initialKnowledge: makeKnowledge({
            entities: [makeEntity(), makeEntity()],
          }),
        }),
      "DUPLICATE_ENTITY_ID",
    );
  });

  it("rejects duplicate Relationship IDs", () => {
    expectReviewError(
      () =>
        createReviewSession({
          bundle: makeBundle(),
          initialKnowledge: makeKnowledge({
            relationships: [makeRelationship(), makeRelationship()],
          }),
        }),
      "DUPLICATE_RELATIONSHIP_ID",
    );
  });

  it("rejects dangling Knowledge Relationship endpoints", () => {
    expectReviewError(
      () =>
        createReviewSession({
          bundle: makeBundle(),
          initialKnowledge: makeKnowledge({
            relationships: [makeRelationship({ toEntityId: "missing" })],
          }),
        }),
      "DANGLING_RELATIONSHIP_ENDPOINT",
    );
  });

  it("does not mutate Bundle or initial Knowledge", () => {
    const bundle = makeBundle();
    const knowledge = makeKnowledge();
    const originalBundle = structuredClone(bundle);
    const originalKnowledge = structuredClone(knowledge);

    createReviewSession({ bundle, initialKnowledge: knowledge });

    expect(bundle).toEqual(originalBundle);
    expect(knowledge).toEqual(originalKnowledge);
  });

  it("issues a first-class Review Session ID with the required prefix", () => {
    const calls: string[] = [];
    const session = createReviewSessionWithId(
      {
        bundle: makeBundle({ entities: [], relationships: [] }),
        initialKnowledge: makeKnowledge(),
      },
      {
        idGenerator: {
          nextId(prefix) {
            calls.push(prefix);
            return "review-session-persistent";
          },
        },
      },
    );

    expect(session.id).toBe("review-session-persistent");
    expect(calls).toEqual(["review-session"]);
  });

  it("propagates the existing fixed ID exhaustion error", () => {
    expect(() =>
      createReviewSessionWithId(
        {
          bundle: makeBundle({ entities: [], relationships: [] }),
          initialKnowledge: makeKnowledge(),
        },
        { idGenerator: new SequenceIdGenerator([]) },
      ),
    ).toThrow("ID_SEQUENCE_EXHAUSTED");
  });

  it("requires ID in the strict Review Session Schema", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [] }),
      initialKnowledge: makeKnowledge(),
    });
    const withoutId: Partial<typeof session> = { ...session };
    delete withoutId.id;

    expect(reviewSessionSchema.safeParse(withoutId).success).toBe(false);
  });
});

describe("Review phase transitions", () => {
  it("rejects advancing while an Entity remains pending", () => {
    const session = createReviewSession({
      bundle: makeBundle(),
      initialKnowledge: makeKnowledge(),
    });

    expectReviewError(
      () => advanceToRelationshipReview(session),
      "ENTITY_REVIEW_INCOMPLETE",
    );
  });

  it("advances after all Entities finish and resolves Relationships", () => {
    const session = createReviewSession({
      bundle: makeBundle(),
      initialKnowledge: makeKnowledge(),
    });
    const rejected = rejectEntityCandidate(session, "candidate-nova");
    const relationshipSession = advanceToRelationshipReview(rejected);

    expect(relationshipSession.phase).toBe("relationships");
    expect(relationshipSession.relationshipReviews[0]).toMatchObject({
      status: "blocked",
      blockedReason: "references_rejected_entity",
      resolvedToEntityId: "entity-team",
      recommendation: "reject",
    });
  });

  it("completes an empty Relationship review", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [] }),
      initialKnowledge: makeKnowledge(),
    });

    expect(completeReviewSession(advanceToRelationshipReview(session)).phase).toBe(
      "complete",
    );
  });

  it("rejects completion while a Relationship is pending", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [makeRelationshipCandidate()] }),
      initialKnowledge: makeKnowledge(),
    });
    const relationshipSession = advanceToRelationshipReview(session);

    expectReviewError(
      () => completeReviewSession(relationshipSession),
      "RELATIONSHIP_REVIEW_INCOMPLETE",
    );
  });

  it("rejects repeated phase transitions", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [] }),
      initialKnowledge: makeKnowledge(),
    });
    const relationshipSession = advanceToRelationshipReview(session);

    expectReviewError(
      () => advanceToRelationshipReview(relationshipSession),
      "INVALID_REVIEW_PHASE",
    );
  });
});
