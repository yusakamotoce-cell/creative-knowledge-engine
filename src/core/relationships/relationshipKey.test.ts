import { describe, expect, it } from "vitest";

import { buildRelationshipKey } from "./relationshipKey";

describe("buildRelationshipKey", () => {
  it("returns the same key for the same input", () => {
    const input = {
      fromEntityId: "entity-a",
      toEntityId: "entity-b",
      relationType: "member_of",
    };

    expect(buildRelationshipKey(input)).toBe(buildRelationshipKey(input));
  });

  it("normalizes relationType spelling differences", () => {
    expect(
      buildRelationshipKey({
        fromEntityId: "entity-a",
        toEntityId: "entity-b",
        relationType: " ＭＥＭＢＥＲ＿ＯＦ ",
      }),
    ).toBe(
      buildRelationshipKey({
        fromEntityId: "entity-a",
        toEntityId: "entity-b",
        relationType: "member_of",
      }),
    );
  });

  it("keeps direction in the key", () => {
    const forward = buildRelationshipKey({
      fromEntityId: "entity-a",
      toEntityId: "entity-b",
      relationType: "knows",
    });
    const reverse = buildRelationshipKey({
      fromEntityId: "entity-b",
      toEntityId: "entity-a",
      relationType: "knows",
    });

    expect(forward).not.toBe(reverse);
  });

  it("does not collide when IDs contain delimiter-like text", () => {
    const first = buildRelationshipKey({
      fromEntityId: "a|b",
      toEntityId: "c",
      relationType: "d",
    });
    const second = buildRelationshipKey({
      fromEntityId: "a",
      toEntityId: "b|c",
      relationType: "d",
    });

    expect(first).not.toBe(second);
  });

  it("rejects an empty endpoint or relationType", () => {
    expect(() =>
      buildRelationshipKey({
        fromEntityId: "",
        toEntityId: "entity-b",
        relationType: "knows",
      }),
    ).toThrow("RELATIONSHIP_ENDPOINT_REQUIRED");
    expect(() =>
      buildRelationshipKey({
        fromEntityId: "entity-a",
        toEntityId: "entity-b",
        relationType: "   ",
      }),
    ).toThrow("RELATION_TYPE_REQUIRED");
  });
});
