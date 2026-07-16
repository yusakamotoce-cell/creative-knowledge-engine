import { describe, expect, it } from "vitest";

import { SequenceClock } from "../shared/clock";
import { SequenceIdGenerator } from "../shared/idGenerator";
import {
  acceptRelationshipCandidate,
  rejectRelationshipCandidate,
  setRelationshipManualResolution,
} from "./relationshipReview";
import {
  advanceToRelationshipReview,
  completeReviewSession,
} from "./reviewSession";
import {
  createTestReviewSession as createReviewSession,
  expectReviewError,
  makeBundle,
  makeEntity,
  makeKnowledge,
  makeRelationship,
  makeRelationshipCandidate,
  sourceA,
  sourceB,
  timestampA,
  timestampB,
} from "./testSupport";

function createRelationshipSession(
  candidate = makeRelationshipCandidate({
    fromRef: { name: "Nova", entityType: "character" },
    toRef: { name: "Team", entityType: "organization" },
  }),
  knowledge = makeKnowledge(),
) {
  return advanceToRelationshipReview(
    createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [candidate] }),
      initialKnowledge: knowledge,
    }),
  );
}

describe("Relationship blocked evaluation", () => {
  it.each([
    [
      { fromRef: { name: "Unknown" }, toRef: { name: "Team" } },
      "unresolved_from",
    ],
    [
      { fromRef: { name: "Nova" }, toRef: { name: "Unknown" } },
      "unresolved_to",
    ],
    [
      { fromRef: { name: "Unknown A" }, toRef: { name: "Unknown B" } },
      "unresolved_both",
    ],
  ] as const)("sets %s to %s", (refs, reason) => {
    const session = createRelationshipSession(
      makeRelationshipCandidate(refs),
    );

    expect(session.relationshipReviews[0]).toMatchObject({
      status: "blocked",
      blockedReason: reason,
      recommendation: null,
    });
  });

  it.each([
    [{ fromRef: { name: "Nova" }, toRef: { name: "Team" } }, "ambiguous_from"],
    [{ fromRef: { name: "Team" }, toRef: { name: "Nova" } }, "ambiguous_to"],
    [{ fromRef: { name: "Nova" }, toRef: { name: "Nova" } }, "ambiguous_both"],
  ] as const)("sets ambiguous endpoints to %s", (refs, reason) => {
    const knowledge = makeKnowledge({
      entities: [
        makeEntity({ id: "nova-1" }),
        makeEntity({ id: "nova-2" }),
        makeEntity({
          id: "entity-team",
          entityType: "organization",
          name: "Team",
          aliases: [],
        }),
      ],
    });
    const session = createRelationshipSession(
      makeRelationshipCandidate(refs),
      knowledge,
    );

    expect(session.relationshipReviews[0]).toMatchObject({
      status: "blocked",
      blockedReason: reason,
    });
  });

  it("does not automatically reject a Relationship with a reject recommendation", () => {
    const base = createReviewSession({
      bundle: makeBundle({
        entities: [],
        relationships: [
          makeRelationshipCandidate({
            fromRef: { candidateId: "rejected" },
            toRef: { name: "Team" },
          }),
        ],
      }),
      initialKnowledge: makeKnowledge(),
    });
    const session = {
      ...base,
      entityReviews: [
        {
          candidateId: "rejected",
          candidate: {
            candidateId: "rejected",
            entityType: "character" as const,
            name: "Missing",
            aliases: [],
            description: "",
            attributes: {},
            tags: [],
            sourceRefs: [],
          },
          status: "rejected" as const,
          registeredEntityId: null,
          duplicateEntityIds: [],
        },
      ],
    };
    const relationshipSession = advanceToRelationshipReview(session);

    expect(relationshipSession.relationshipReviews[0]).toMatchObject({
      status: "blocked",
      blockedReason: "references_rejected_entity",
      recommendation: "reject",
    });
  });

  it("rejects Accept while blocked", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({ fromRef: { name: "Unknown" } }),
    );

    expectReviewError(
      () =>
        acceptRelationshipCandidate(session, "candidate-relationship", {
          idGenerator: new SequenceIdGenerator(["relationship-new"]),
          clock: new SequenceClock([timestampB]),
        }),
      "RELATIONSHIP_BLOCKED",
    );
  });
});

describe("setRelationshipManualResolution", () => {
  it("returns a blocked Relationship to pending when both endpoints resolve", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Unknown", entityType: "character" },
        toRef: { name: "Team", entityType: "organization" },
      }),
    );
    const resolved = setRelationshipManualResolution(
      session,
      "candidate-relationship",
      { fromEntityId: "entity-existing" },
    );

    expect(resolved.relationshipReviews[0]).toMatchObject({
      status: "pending",
      resolvedFromEntityId: "entity-existing",
      resolvedToEntityId: "entity-team",
      blockedReason: null,
    });
  });

  it("keeps the unresolved side blocked and leaves Candidate refs unchanged", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Unknown A" },
        toRef: { name: "Unknown B" },
      }),
    );
    const originalCandidate = session.relationshipReviews[0]?.candidate;
    const resolved = setRelationshipManualResolution(
      session,
      "candidate-relationship",
      { fromEntityId: "entity-existing" },
    );

    expect(resolved.relationshipReviews[0]).toMatchObject({
      status: "blocked",
      blockedReason: "unresolved_to",
    });
    expect(resolved.relationshipReviews[0]?.candidate).toEqual(originalCandidate);
  });

  it("rejects an invalid manual Entity ID", () => {
    expectReviewError(
      () =>
        setRelationshipManualResolution(
          createRelationshipSession(),
          "candidate-relationship",
          { fromEntityId: "missing" },
        ),
      "MANUAL_ENTITY_NOT_FOUND",
    );
  });
});

describe("acceptRelationshipCandidate", () => {
  it("appends a new Relationship with immediate registration", () => {
    const session = createRelationshipSession();
    const accepted = acceptRelationshipCandidate(
      session,
      "candidate-relationship",
      {
        idGenerator: new SequenceIdGenerator(["relationship-new"]),
        clock: new SequenceClock([timestampB]),
      },
    );

    expect(accepted.knowledge.relationships).toEqual([
      {
        id: "relationship-new",
        fromEntityId: "entity-existing",
        toEntityId: "entity-team",
        relationType: "member_of",
        description: "Candidate relationship",
        sourceRefs: [sourceB],
        createdAt: timestampB,
        updatedAt: timestampB,
      },
    ]);
    expect(accepted.relationshipReviews[0]).toMatchObject({
      status: "accepted",
      registeredRelationshipId: "relationship-new",
    });
  });

  it("merges a duplicate key without issuing an ID", () => {
    const existing = makeRelationship();
    const session = createRelationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Nova", entityType: "character" },
        toRef: { name: "Team", entityType: "organization" },
        sourceRefs: [sourceB, sourceA],
      }),
      makeKnowledge({ relationships: [existing] }),
    );
    const ids = new SequenceIdGenerator(["unused"]);
    const merged = acceptRelationshipCandidate(
      session,
      "candidate-relationship",
      { idGenerator: ids, clock: new SequenceClock([timestampB]) },
    );
    const relationship = merged.knowledge.relationships[0];

    expect(relationship).toEqual({
      ...existing,
      sourceRefs: [sourceA, sourceB],
      updatedAt: timestampB,
    });
    expect(merged.relationshipReviews[0]).toMatchObject({
      status: "merged",
      registeredRelationshipId: "relationship-existing",
    });
    expect(ids.nextId("relationship")).toBe("unused");
  });

  it("matches duplicate keys using normalized relationType", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Nova", entityType: "character" },
        toRef: { name: "Team", entityType: "organization" },
        relationType: " MEMBER_OF ",
      }),
      makeKnowledge({ relationships: [makeRelationship()] }),
    );
    const merged = acceptRelationshipCandidate(
      session,
      "candidate-relationship",
      {
        idGenerator: new SequenceIdGenerator(["unused"]),
        clock: new SequenceClock([timestampB]),
      },
    );

    expect(merged.relationshipReviews[0]?.status).toBe("merged");
    expect(merged.knowledge.relationships[0]?.relationType).toBe("member_of");
  });

  it("rejects Knowledge containing multiple Relationships with one key", () => {
    const session = createRelationshipSession(
      undefined,
      makeKnowledge({
        relationships: [
          makeRelationship({ id: "relationship-1" }),
          makeRelationship({ id: "relationship-2" }),
        ],
      }),
    );

    expectReviewError(
      () =>
        acceptRelationshipCandidate(session, "candidate-relationship", {
          idGenerator: new SequenceIdGenerator(["unused"]),
          clock: new SequenceClock([timestampB]),
        }),
      "DUPLICATE_RELATIONSHIP_KEY_IN_KNOWLEDGE",
    );
  });

  it("rejects a generated Relationship ID already in Knowledge", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Nova", entityType: "character" },
        toRef: { name: "Team", entityType: "organization" },
        relationType: "knows",
      }),
      makeKnowledge({ relationships: [makeRelationship()] }),
    );

    expectReviewError(
      () =>
        acceptRelationshipCandidate(session, "candidate-relationship", {
          idGenerator: new SequenceIdGenerator(["relationship-existing"]),
          clock: new SequenceClock([timestampB]),
        }),
      "DUPLICATE_RELATIONSHIP_ID",
    );
  });

  it("does not mutate the input session or existing Relationship", () => {
    const session = createRelationshipSession(
      undefined,
      makeKnowledge({ relationships: [makeRelationship()] }),
    );
    const original = structuredClone(session);

    acceptRelationshipCandidate(session, "candidate-relationship", {
      idGenerator: new SequenceIdGenerator(["unused"]),
      clock: new SequenceClock([timestampB]),
    });

    expect(session).toEqual(original);
  });
});

describe("Relationship Reject and completion", () => {
  it("rejects a blocked Relationship without changing Knowledge or issuing IDs", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({ fromRef: { name: "Unknown" } }),
    );
    const rejected = rejectRelationshipCandidate(
      session,
      "candidate-relationship",
    );

    expect(rejected.knowledge).toEqual(session.knowledge);
    expect(rejected.relationshipReviews[0]).toMatchObject({
      status: "rejected",
      registeredRelationshipId: null,
    });
  });

  it("completes after every Relationship is terminal", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({ fromRef: { name: "Unknown" } }),
    );
    const rejected = rejectRelationshipCandidate(
      session,
      "candidate-relationship",
    );

    expect(completeReviewSession(rejected).phase).toBe("complete");
  });

  it("forbids review actions after completion", () => {
    const session = createRelationshipSession(
      makeRelationshipCandidate({ fromRef: { name: "Unknown" } }),
    );
    const complete = completeReviewSession(
      rejectRelationshipCandidate(session, "candidate-relationship"),
    );

    expectReviewError(
      () => rejectRelationshipCandidate(complete, "candidate-relationship"),
      "INVALID_REVIEW_PHASE",
    );
  });

  it("preserves the existing Relationship createdAt during duplicate merge", () => {
    const existing = makeRelationship({ createdAt: timestampA });
    const merged = acceptRelationshipCandidate(
      createRelationshipSession(
        undefined,
        makeKnowledge({ relationships: [existing] }),
      ),
      "candidate-relationship",
      {
        idGenerator: new SequenceIdGenerator(["unused"]),
        clock: new SequenceClock([timestampB]),
      },
    );

    expect(merged.knowledge.relationships[0]?.createdAt).toBe(timestampA);
  });
});
