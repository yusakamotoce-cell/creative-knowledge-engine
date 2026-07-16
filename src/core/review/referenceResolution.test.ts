import { describe, expect, it } from "vitest";

import { SequenceClock } from "../shared/clock";
import { mergeEntityCandidate, rejectEntityCandidate } from "./entityReview";
import { resolveEntityReference } from "./referenceResolution";
import {
  createTestReviewSession as createReviewSession,
  expectReviewError,
  makeBundle,
  makeEntity,
  makeEntityCandidate,
  makeKnowledge,
  timestampB,
} from "./testSupport";

function referenceSession() {
  return createReviewSession({
    bundle: makeBundle({ entities: [], relationships: [] }),
    initialKnowledge: makeKnowledge(),
  });
}

describe("resolveEntityReference", () => {
  it("resolves a registered candidateId mapping before name", () => {
    const session = {
      ...referenceSession(),
      candidateIdToRegisteredEntityId: {
        "candidate-known": "entity-existing",
      },
    };

    expect(
      resolveEntityReference({
        reference: { candidateId: "candidate-known", name: "Team" },
        session,
      }),
    ).toEqual({
      entityId: "entity-existing",
      reason: "resolved_by_candidate_id",
    });
  });

  it("resolves a merged Candidate through the immediate mapping", () => {
    const initial = createReviewSession({
      bundle: makeBundle({
        entities: [makeEntityCandidate()],
        relationships: [],
      }),
      initialKnowledge: makeKnowledge(),
    });
    const merged = mergeEntityCandidate(
      initial,
      "candidate-nova",
      "entity-existing",
      {},
      { clock: new SequenceClock([timestampB]) },
    );

    expect(
      resolveEntityReference({
        reference: { candidateId: "candidate-nova" },
        session: merged,
      }),
    ).toEqual({
      entityId: "entity-existing",
      reason: "resolved_by_candidate_id",
    });
  });

  it("resolves an exact normalized name", () => {
    expect(
      resolveEntityReference({
        reference: { name: "  NOVA " },
        session: referenceSession(),
      }),
    ).toEqual({ entityId: "entity-existing", reason: "resolved_by_name" });
  });

  it("resolves an exact normalized alias", () => {
    expect(
      resolveEntityReference({
        reference: { name: "n" },
        session: referenceSession(),
      }),
    ).toEqual({ entityId: "entity-existing", reason: "resolved_by_name" });
  });

  it("filters name matches by EntityType", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [] }),
      initialKnowledge: makeKnowledge({
        entities: [
          makeEntity({ id: "character-nova" }),
          makeEntity({ id: "organization-nova", entityType: "organization" }),
        ],
      }),
    });

    expect(
      resolveEntityReference({
        reference: { name: "Nova", entityType: "organization" },
        session,
      }),
    ).toEqual({ entityId: "organization-nova", reason: "resolved_by_name" });
  });

  it("returns unresolved for no exact match", () => {
    expect(
      resolveEntityReference({
        reference: { name: "Unknown" },
        session: referenceSession(),
      }),
    ).toEqual({ entityId: null, reason: "unresolved" });
  });

  it("returns ambiguous without choosing among multiple matches", () => {
    const session = createReviewSession({
      bundle: makeBundle({ entities: [], relationships: [] }),
      initialKnowledge: makeKnowledge({
        entities: [
          makeEntity({ id: "nova-1" }),
          makeEntity({ id: "nova-2" }),
        ],
      }),
    });

    expect(
      resolveEntityReference({ reference: { name: "Nova" }, session }),
    ).toEqual({ entityId: null, reason: "ambiguous" });
  });

  it("reports a rejected referenced Candidate when name cannot resolve", () => {
    const initial = createReviewSession({
      bundle: makeBundle({
        entities: [makeEntityCandidate({ name: "Unknown" })],
        relationships: [],
      }),
      initialKnowledge: makeKnowledge(),
    });
    const rejected = rejectEntityCandidate(initial, "candidate-nova");

    expect(
      resolveEntityReference({
        reference: { candidateId: "candidate-nova" },
        session: rejected,
      }),
    ).toEqual({ entityId: null, reason: "references_rejected_entity" });
  });

  it("allows name fallback for a rejected referenced Candidate", () => {
    const initial = createReviewSession({
      bundle: makeBundle({ entities: [makeEntityCandidate()], relationships: [] }),
      initialKnowledge: makeKnowledge(),
    });
    const rejected = rejectEntityCandidate(initial, "candidate-nova");

    expect(
      resolveEntityReference({
        reference: { candidateId: "candidate-nova", name: "Team" },
        session: rejected,
      }),
    ).toEqual({ entityId: "entity-team", reason: "resolved_by_name" });
  });

  it("gives a valid manual Entity priority over every automatic rule", () => {
    expect(
      resolveEntityReference({
        reference: { name: "Nova", entityType: "organization" },
        session: referenceSession(),
        manualEntityId: "entity-team",
      }),
    ).toEqual({ entityId: "entity-team", reason: "resolved_manually" });
  });

  it("rejects a missing manual Entity", () => {
    expectReviewError(
      () =>
        resolveEntityReference({
          reference: { name: "Nova" },
          session: referenceSession(),
          manualEntityId: "missing",
        }),
      "MANUAL_ENTITY_NOT_FOUND",
    );
  });

  it("rejects a manual EntityType mismatch", () => {
    expectReviewError(
      () =>
        resolveEntityReference({
          reference: { name: "Nova", entityType: "character" },
          session: referenceSession(),
          manualEntityId: "entity-team",
        }),
      "ENTITY_TYPE_MISMATCH",
    );
  });
});
