import { describe, expect, it } from "vitest";

import {
  addAttributeClaim,
  createAttributeRecord,
  resolveAttributeConflict,
  type AttributeRecord,
} from "../entities/attributeRecord";
import type { Entity, EntityType } from "../entities/entity";
import type { KnowledgeState } from "../knowledge/knowledgeState";
import type { Relationship } from "../relationships/relationship";
import type { ScalarValue } from "../shared/schemas";
import { calculateKnowledgeInsights } from "./knowledgeInsights";

const timestamp = "2026-07-16T00:00:00.000Z";
const source = {
  documentId: "doc-1",
  fileName: "source.md",
  excerpt: "source",
};

function makeEntity(input: {
  id: string;
  name: string;
  entityType?: EntityType;
  aliases?: string[];
  attributes?: Record<string, AttributeRecord>;
}): Entity {
  return {
    id: input.id,
    entityType: input.entityType ?? "character",
    name: input.name,
    aliases: input.aliases ?? [],
    description: "",
    attributes: input.attributes ?? {},
    tags: [],
    sourceRefs: [source],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function makeRelationship(fromEntityId: string, toEntityId: string): Relationship {
  return {
    id: `rel-${fromEntityId}-${toEntityId}`,
    fromEntityId,
    toEntityId,
    relationType: "knows",
    description: "",
    sourceRefs: [source],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function unresolvedRecord(
  first: ScalarValue,
  second: ScalarValue,
): AttributeRecord {
  return addAttributeClaim(createAttributeRecord({ value: first, sourceRef: source }), {
    value: second,
    sourceRef: { ...source, excerpt: "second" },
  });
}

describe("calculateKnowledgeInsights", () => {
  it("returns no duplicate for distinct names", () => {
    const result = calculateKnowledgeInsights({
      entities: [makeEntity({ id: "one", name: "One" }), makeEntity({ id: "two", name: "Two" })],
      relationships: [],
    });

    expect(result.duplicateGroups).toEqual([]);
  });

  it("ignores duplicate name and alias values within one Entity", () => {
    const result = calculateKnowledgeInsights({
      entities: [makeEntity({ id: "one", name: "Nova", aliases: ["ＮＯＶＡ", "Nova"] })],
      relationships: [],
    });

    expect(result.duplicateGroups).toEqual([]);
  });

  it("reports a three-Entity duplicate group in Knowledge order", () => {
    const result = calculateKnowledgeInsights({
      entities: [
        makeEntity({ id: "third", name: "NOVA" }),
        makeEntity({ id: "first", name: "Someone", aliases: ["Nova"] }),
        makeEntity({ id: "second", name: "ＮＯＶＡ" }),
      ],
      relationships: [],
    });

    expect(result.duplicateGroups).toEqual([
      { normalizedKey: "nova", entityIds: ["third", "first", "second"] },
    ]);
  });

  it("sorts duplicate groups by normalized key", () => {
    const result = calculateKnowledgeInsights({
      entities: [
        makeEntity({ id: "z1", name: "Zulu" }),
        makeEntity({ id: "a1", name: "Alpha" }),
        makeEntity({ id: "z2", name: "ＺＵＬＵ" }),
        makeEntity({ id: "a2", name: "ALPHA" }),
      ],
      relationships: [],
    });

    expect(result.duplicateGroups.map((group) => group.normalizedKey)).toEqual([
      "alpha",
      "zulu",
    ]);
  });

  it("reports unresolved conflicts in Entity and attribute insertion order", () => {
    const knowledge: KnowledgeState = {
      entities: [
        makeEntity({
          id: "one",
          name: "One",
          attributes: {
            zeta: unresolvedRecord(1, 2),
            alpha: unresolvedRecord("old", "new"),
          },
        }),
        makeEntity({
          id: "two",
          name: "Two",
          attributes: { beta: unresolvedRecord(true, false) },
        }),
      ],
      relationships: [],
    };

    const result = calculateKnowledgeInsights(knowledge);
    expect(result.conflicts.map(({ entityId, attributeKey }) => ({ entityId, attributeKey }))).toEqual([
      { entityId: "one", attributeKey: "zeta" },
      { entityId: "one", attributeKey: "alpha" },
      { entityId: "two", attributeKey: "beta" },
    ]);
  });

  it("excludes resolved conflicts", () => {
    const record = resolveAttributeConflict(
      unresolvedRecord(17, 18),
      17,
      timestamp,
    );
    const result = calculateKnowledgeInsights({
      entities: [makeEntity({ id: "nova", name: "Nova", attributes: { age: record } })],
      relationships: [],
    });

    expect(result.conflicts).toEqual([]);
  });

  it("preserves the number/string type distinction in conflicts", () => {
    const result = calculateKnowledgeInsights({
      entities: [
        makeEntity({
          id: "one",
          name: "One",
          attributes: { value: unresolvedRecord(1, "1") },
        }),
      ],
      relationships: [],
    });

    expect(result.conflicts[0]?.claimValues).toEqual([1, "1"]);
  });

  it("treats every Entity as orphan when there are no Relationships", () => {
    const result = calculateKnowledgeInsights({
      entities: [makeEntity({ id: "one", name: "One" }), makeEntity({ id: "two", name: "Two" })],
      relationships: [],
    });

    expect(result.orphanEntityIds).toEqual(["one", "two"]);
  });

  it("counts both Relationship endpoints as connected", () => {
    const result = calculateKnowledgeInsights({
      entities: [
        makeEntity({ id: "one", name: "One" }),
        makeEntity({ id: "two", name: "Two" }),
        makeEntity({ id: "three", name: "Three" }),
      ],
      relationships: [makeRelationship("one", "two")],
    });

    expect(result.orphanEntityIds).toEqual(["three"]);
  });

  it("always includes all five EntityType counters", () => {
    const result = calculateKnowledgeInsights({
      entities: [makeEntity({ id: "one", name: "One", entityType: "item" })],
      relationships: [],
    });

    expect(result.statistics.entityCountByType).toEqual({
      character: 0,
      scene: 0,
      location: 0,
      item: 1,
      organization: 0,
    });
  });

  it("does not mutate its input and returns detached arrays", () => {
    const knowledge: KnowledgeState = {
      entities: [makeEntity({ id: "one", name: "Nova" }), makeEntity({ id: "two", name: "ＮＯＶＡ" })],
      relationships: [],
    };
    const before = structuredClone(knowledge);
    const result = calculateKnowledgeInsights(knowledge);

    result.duplicateGroups[0]?.entityIds.push("changed");
    expect(knowledge).toEqual(before);
  });
});
