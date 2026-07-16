import { describe, expect, it } from "vitest";

import {
  createAttributeRecord,
  resolveAttributeConflict,
} from "../entities/attributeRecord";
import { SequenceClock } from "../shared/clock";
import { SequenceIdGenerator } from "../shared/idGenerator";
import {
  acceptEntityCandidate,
  editEntityCandidate,
  mergeEntityCandidate,
  rejectEntityCandidate,
} from "./entityReview";
import {
  createTestReviewSession as createReviewSession,
  expectReviewError,
  makeBundle,
  makeEntity,
  makeEntityCandidate,
  makeKnowledge,
  sourceA,
  sourceB,
  timestampA,
  timestampB,
} from "./testSupport";

function createEntitySession(
  candidate = makeEntityCandidate(),
  entities = makeKnowledge().entities,
) {
  return createReviewSession({
    bundle: makeBundle({ entities: [candidate], relationships: [] }),
    initialKnowledge: makeKnowledge({ entities, relationships: [] }),
  });
}

describe("editEntityCandidate", () => {
  it("edits only allowed fields and retains candidateId and SourceRefs", () => {
    const session = createEntitySession();
    const edited = editEntityCandidate(session, "candidate-nova", {
      name: "Nova Prime",
      aliases: ["Prime"],
      attributes: { Rank: 2 },
    });

    expect(edited.entityReviews[0]?.candidate).toMatchObject({
      candidateId: "candidate-nova",
      name: "Nova Prime",
      aliases: ["Prime"],
      attributes: { Rank: 2 },
      sourceRefs: [sourceB],
    });
  });

  it("recomputes Duplicate candidates after a name edit", () => {
    const session = createEntitySession(
      makeEntityCandidate({ name: "Unknown" }),
    );
    const edited = editEntityCandidate(session, "candidate-nova", {
      name: "Nova",
    });

    expect(edited.entityReviews[0]?.duplicateEntityIds).toEqual([
      "entity-existing",
    ]);
  });

  it("does not allow runtime extras to edit candidateId or SourceRefs", () => {
    const session = createEntitySession();
    const edited = editEntityCandidate(session, "candidate-nova", {
      name: "Changed",
      candidateId: "replaced",
      sourceRefs: [sourceA],
    } as never);

    expect(edited.entityReviews[0]?.candidate).toMatchObject({
      candidateId: "candidate-nova",
      sourceRefs: [sourceB],
      name: "Changed",
    });
  });

  it("does not mutate the input session", () => {
    const session = createEntitySession();
    const original = structuredClone(session);

    editEntityCandidate(session, "candidate-nova", { name: "Changed" });

    expect(session).toEqual(original);
  });

  it("rejects editing an already reviewed Candidate", () => {
    const session = rejectEntityCandidate(
      createEntitySession(),
      "candidate-nova",
    );

    expectReviewError(
      () => editEntityCandidate(session, "candidate-nova", { name: "Changed" }),
      "CANDIDATE_ALREADY_REVIEWED",
    );
  });
});

describe("acceptEntityCandidate", () => {
  it("registers a new Entity immediately with one timestamp", () => {
    const session = createEntitySession(
      makeEntityCandidate({
        name: "Lumen",
        aliases: ["Light", "Light"],
        attributes: { Rank: 2 },
        tags: ["pilot", "pilot"],
        sourceRefs: [sourceA, sourceB, sourceA],
      }),
    );
    const accepted = acceptEntityCandidate(session, "candidate-nova", {
      idGenerator: new SequenceIdGenerator(["entity-lumen"]),
      clock: new SequenceClock([timestampB]),
    });
    const entity = accepted.knowledge.entities.at(-1);

    expect(entity).toMatchObject({
      id: "entity-lumen",
      name: "Lumen",
      aliases: ["Light"],
      tags: ["pilot"],
      sourceRefs: [sourceA, sourceB],
      createdAt: timestampB,
      updatedAt: timestampB,
    });
    expect(entity?.attributes.rank?.claims).toHaveLength(2);
    expect(accepted.entityReviews[0]).toMatchObject({
      status: "accepted",
      registeredEntityId: "entity-lumen",
    });
    expect(accepted.candidateIdToRegisteredEntityId).toEqual({
      "candidate-nova": "entity-lumen",
    });
  });

  it("allows explicit Accept even when Duplicate candidates exist", () => {
    const accepted = acceptEntityCandidate(
      createEntitySession(),
      "candidate-nova",
      {
        idGenerator: new SequenceIdGenerator(["entity-new-nova"]),
        clock: new SequenceClock([timestampB]),
      },
    );

    expect(accepted.knowledge.entities.at(-1)?.id).toBe("entity-new-nova");
  });

  it("recomputes later pending Duplicate candidates", () => {
    const session = createReviewSession({
      bundle: makeBundle({
        entities: [
          makeEntityCandidate({ candidateId: "first", name: "Lumen" }),
          makeEntityCandidate({ candidateId: "second", name: "Lumen" }),
        ],
        relationships: [],
      }),
      initialKnowledge: makeKnowledge({ entities: [], relationships: [] }),
    });
    const accepted = acceptEntityCandidate(session, "first", {
      idGenerator: new SequenceIdGenerator(["entity-lumen"]),
      clock: new SequenceClock([timestampB]),
    });

    expect(accepted.entityReviews[1]?.duplicateEntityIds).toEqual([
      "entity-lumen",
    ]);
  });

  it("rejects Candidate attributes without SourceRefs before issuing an ID", () => {
    const session = createEntitySession(
      makeEntityCandidate({ attributes: { age: 17 }, sourceRefs: [] }),
    );
    const ids = new SequenceIdGenerator(["entity-unused"]);

    expectReviewError(
      () =>
        acceptEntityCandidate(session, "candidate-nova", {
          idGenerator: ids,
          clock: new SequenceClock([timestampB]),
        }),
      "ATTRIBUTE_SOURCE_REF_REQUIRED",
    );
    expect(ids.nextId("entity")).toBe("entity-unused");
  });

  it("rejects a generated Entity ID already in Knowledge", () => {
    expectReviewError(
      () =>
        acceptEntityCandidate(createEntitySession(), "candidate-nova", {
          idGenerator: new SequenceIdGenerator(["entity-existing"]),
          clock: new SequenceClock([timestampB]),
        }),
      "DUPLICATE_ENTITY_ID",
    );
  });

  it("does not mutate the input session", () => {
    const session = createEntitySession(
      makeEntityCandidate({ name: "New Entity" }),
    );
    const original = structuredClone(session);

    acceptEntityCandidate(session, "candidate-nova", {
      idGenerator: new SequenceIdGenerator(["entity-new"]),
      clock: new SequenceClock([timestampB]),
    });

    expect(session).toEqual(original);
  });
});

describe("mergeEntityCandidate", () => {
  it("preserves ID, createdAt and position while updating unions", () => {
    const other = makeEntity({ id: "entity-before", name: "Before" });
    const target = makeEntity({ aliases: ["N"], tags: ["old"], sourceRefs: [sourceA] });
    const session = createEntitySession(
      makeEntityCandidate({
        name: "Nova Candidate",
        aliases: ["N", "Star"],
        tags: ["old", "new"],
        sourceRefs: [sourceB],
      }),
      [other, target],
    );
    const merged = mergeEntityCandidate(
      session,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );
    const entity = merged.knowledge.entities[1];

    expect(merged.knowledge.entities[0]?.id).toBe("entity-before");
    expect(entity).toMatchObject({
      id: "entity-existing",
      name: "Nova",
      description: "Existing description",
      aliases: ["N", "Star", "Nova Candidate"],
      tags: ["old", "new"],
      sourceRefs: [sourceA, sourceB],
      createdAt: timestampA,
      updatedAt: timestampB,
    });
    expect(merged.entityReviews[0]).toMatchObject({
      status: "merged",
      registeredEntityId: "entity-existing",
    });
    expect(merged.candidateIdToRegisteredEntityId["candidate-nova"]).toBe(
      "entity-existing",
    );
  });

  it("changes name and description only with explicit resolution", () => {
    const merged = mergeEntityCandidate(
      createEntitySession(),
      "candidate-nova",
      "entity-existing",
      { name: "Nova Prime", description: "Resolved" },
      { clock: new SequenceClock([timestampB]) },
    );

    expect(merged.knowledge.entities[0]).toMatchObject({
      name: "Nova Prime",
      description: "Resolved",
      aliases: ["N", "Nova"],
    });
  });

  it("adds claims without overwriting the canonical value", () => {
    const existingRecord = createAttributeRecord({ value: 17, sourceRef: sourceA });
    const target = makeEntity({ attributes: { age: existingRecord } });
    const session = createEntitySession(
      makeEntityCandidate({ attributes: { AGE: 18 }, sourceRefs: [sourceB] }),
      [target],
    );
    const merged = mergeEntityCandidate(
      session,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );
    const age = merged.knowledge.entities[0]?.attributes.age;

    expect(age?.canonicalValue).toBe(17);
    expect(age?.claims.map(({ value }) => value)).toEqual([17, 18]);
    expect(age?.conflictResolvedAt).toBeNull();
  });

  it("reopens a resolved Conflict for a different incoming value", () => {
    const resolved = resolveAttributeConflict(
      createAttributeRecord({ value: 17, sourceRef: sourceA }),
      17,
      timestampA,
    );
    const session = createEntitySession(
      makeEntityCandidate({ attributes: { age: 18 }, sourceRefs: [sourceB] }),
      [makeEntity({ attributes: { age: resolved } })],
    );
    const merged = mergeEntityCandidate(
      session,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );

    expect(merged.knowledge.entities[0]?.attributes.age?.conflictResolvedAt).toBeNull();
  });

  it("keeps a resolved Conflict resolved for an equal value from a new source", () => {
    const resolved = resolveAttributeConflict(
      createAttributeRecord({ value: 17, sourceRef: sourceA }),
      17,
      timestampA,
    );
    const session = createEntitySession(
      makeEntityCandidate({ attributes: { age: 17 }, sourceRefs: [sourceB] }),
      [makeEntity({ attributes: { age: resolved } })],
    );
    const merged = mergeEntityCandidate(
      session,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );

    expect(merged.knowledge.entities[0]?.attributes.age?.conflictResolvedAt).toBe(
      timestampA,
    );
    expect(merged.knowledge.entities[0]?.attributes.age?.claims).toHaveLength(2);
  });

  it("creates a new AttributeRecord when the target has no matching key", () => {
    const merged = mergeEntityCandidate(
      createEntitySession(makeEntityCandidate({ attributes: { Rank: 2 } })),
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );

    expect(merged.knowledge.entities[0]?.attributes.rank?.canonicalValue).toBe(2);
  });

  it("rejects a missing merge target", () => {
    expectReviewError(
      () =>
        mergeEntityCandidate(
          createEntitySession(),
          "candidate-nova",
          "missing",
          {},
          { clock: new SequenceClock([timestampB]) },
        ),
      "ENTITY_NOT_FOUND",
    );
  });

  it("rejects merging into a different EntityType", () => {
    expectReviewError(
      () =>
        mergeEntityCandidate(
          createEntitySession(
            makeEntityCandidate({ entityType: "character" }),
            [makeEntity({ entityType: "organization" })],
          ),
          "candidate-nova",
          "entity-existing",
          {},
          { clock: new SequenceClock([timestampB]) },
        ),
      "ENTITY_TYPE_MISMATCH",
    );
  });

  it("does not mutate the target Entity or session", () => {
    const session = createEntitySession();
    const original = structuredClone(session);

    mergeEntityCandidate(
      session,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );

    expect(session).toEqual(original);
  });
});

describe("rejectEntityCandidate", () => {
  it("changes only review status without registration or mapping", () => {
    const session = createEntitySession();
    const rejected = rejectEntityCandidate(session, "candidate-nova");

    expect(rejected.knowledge).toEqual(session.knowledge);
    expect(rejected.entityReviews[0]).toMatchObject({
      status: "rejected",
      registeredEntityId: null,
    });
    expect(rejected.candidateIdToRegisteredEntityId).toEqual({});
  });

  it("rejects a second review action", () => {
    const rejected = rejectEntityCandidate(
      createEntitySession(),
      "candidate-nova",
    );

    expectReviewError(
      () => rejectEntityCandidate(rejected, "candidate-nova"),
      "CANDIDATE_ALREADY_REVIEWED",
    );
  });
});
