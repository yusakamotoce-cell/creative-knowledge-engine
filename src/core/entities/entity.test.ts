import { describe, expect, it } from "vitest";

import { entitySchema } from "./entity";
import { relationshipSchema } from "../relationships/relationship";

const validEntity = {
  id: "entity-nova",
  entityType: "character",
  name: "Nova",
  aliases: [],
  description: "A planner.",
  attributes: {},
  tags: ["planner"],
  sourceRefs: [],
  createdAt: "2026-07-16T09:00:00+09:00",
  updatedAt: "2026-07-16T09:00:00+09:00",
} as const;

describe("entitySchema", () => {
  it("accepts a registered Entity", () => {
    expect(entitySchema.parse(validEntity)).toEqual(validEntity);
  });

  it("rejects an invalid conflictResolvedAt", () => {
    const entity = structuredClone(validEntity) as unknown as Record<
      string,
      unknown
    >;
    entity.attributes = {
      age: {
        canonicalValue: 17,
        claims: [],
        conflictResolvedAt: "yesterday",
      },
    };

    expect(entitySchema.safeParse(entity).success).toBe(false);
  });

  it("rejects unknown Entity fields", () => {
    const entity = {
      ...validEntity,
      confidence: 0.9,
    };

    expect(entitySchema.safeParse(entity).success).toBe(false);
  });
});

describe("relationshipSchema", () => {
  const validRelationship = {
    id: "relationship-1",
    fromEntityId: "entity-a",
    toEntityId: "entity-b",
    relationType: "member_of",
    description: "",
    sourceRefs: [],
    createdAt: "2026-07-16T09:00:00+09:00",
    updatedAt: "2026-07-16T09:00:00+09:00",
  };

  it("accepts a directional registered Relationship", () => {
    expect(relationshipSchema.parse(validRelationship)).toEqual(
      validRelationship,
    );
  });

  it("rejects confidence on a registered Relationship", () => {
    expect(
      relationshipSchema.safeParse({
        ...validRelationship,
        confidence: 0.9,
      }).success,
    ).toBe(false);
  });
});
