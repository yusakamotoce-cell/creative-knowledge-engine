import { describe, expect, it } from "vitest";

import { createCandidateAttributeRecords } from "./candidateAttributes";
import { expectReviewError, sourceA, sourceB } from "./testSupport";

describe("createCandidateAttributeRecords", () => {
  it("normalizes keys and creates canonical records", () => {
    const result = createCandidateAttributeRecords({ " Eye Color ": "Blue" }, [
      sourceA,
    ]);

    expect(result["eye color"]).toEqual({
      canonicalValue: "Blue",
      claims: [{ value: "Blue", sourceRef: sourceA }],
      conflictResolvedAt: null,
    });
  });

  it("uses every distinct Candidate SourceRef for every attribute", () => {
    const result = createCandidateAttributeRecords({ age: 17 }, [
      sourceA,
      sourceB,
      sourceA,
    ]);

    expect(result.age?.claims).toEqual([
      { value: 17, sourceRef: sourceA },
      { value: 17, sourceRef: sourceB },
    ]);
  });

  it("does not create a conflict for equal values from different sources", () => {
    const result = createCandidateAttributeRecords({ age: 17 }, [sourceA, sourceB]);

    expect(result.age?.conflictResolvedAt).toBeNull();
    expect(new Set(result.age?.claims.map(({ value }) => value))).toEqual(
      new Set([17]),
    );
  });

  it("allows empty attributes and empty SourceRefs", () => {
    expect(createCandidateAttributeRecords({}, [])).toEqual({});
  });

  it("rejects attributes without a SourceRef", () => {
    expectReviewError(
      () => createCandidateAttributeRecords({ age: 17 }, []),
      "ATTRIBUTE_SOURCE_REF_REQUIRED",
    );
  });

  it("rejects raw keys that collide after normalization", () => {
    expectReviewError(
      () =>
        createCandidateAttributeRecords(
          { "Eye Color": "blue", " eye  color ": "green" },
          [sourceA],
        ),
      "ATTRIBUTE_KEY_COLLISION",
    );
  });

  it("sorts normalized attribute keys deterministically", () => {
    expect(
      Object.keys(createCandidateAttributeRecords({ Zeta: 1, Alpha: 2 }, [sourceA])),
    ).toEqual(["alpha", "zeta"]);
  });
});
