import { describe, expect, it } from "vitest";

import { makeEntity, makeRelationship } from "../review/testSupport";
import { knowledgeStateSchema } from "./knowledgeState";

describe("knowledgeStateSchema", () => {
  it("accepts Entity and Relationship arrays without reordering", () => {
    const state = {
      entities: [makeEntity({ id: "entity-2" }), makeEntity({ id: "entity-1" })],
      relationships: [makeRelationship()],
    };

    expect(knowledgeStateSchema.parse(state).entities.map(({ id }) => id)).toEqual([
      "entity-2",
      "entity-1",
    ]);
  });

  it("returns a parsed copy instead of the input arrays", () => {
    const state = { entities: [makeEntity()], relationships: [] };
    const parsed = knowledgeStateSchema.parse(state);

    expect(parsed).not.toBe(state);
    expect(parsed.entities).not.toBe(state.entities);
  });

  it("rejects unknown fields", () => {
    expect(
      knowledgeStateSchema.safeParse({
        entities: [],
        relationships: [],
        version: 1,
      }).success,
    ).toBe(false);
  });
});
