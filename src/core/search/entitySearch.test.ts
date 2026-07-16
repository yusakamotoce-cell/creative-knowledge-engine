import { describe, expect, it } from "vitest";

import { makeEntity, makeKnowledge } from "../review/testSupport";
import { runProjectAstraFixture } from "../../data/demo/project-astra";
import { normalizeSearchText, searchEntities } from "./entitySearch";

describe("normalizeSearchText", () => {
  it.each([
    ["  Nova   Arclight ", "nova arclight"],
    ["ＮＯＶＡ", "nova"],
    ["North　Star", "north star"],
    ["\tQUIET\nPRISM\r", "quiet prism"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });
});

describe("searchEntities ranking", () => {
  const rankedKnowledge = makeKnowledge({
    entities: [
      makeEntity({ id: "name-exact", name: "Nova", aliases: [], tags: [] }),
      makeEntity({ id: "alias-exact", name: "One", aliases: ["Nova"], tags: [] }),
      makeEntity({ id: "name-prefix", name: "Nova Base", aliases: [], tags: [] }),
      makeEntity({ id: "alias-prefix", name: "Two", aliases: ["Nova Base"], tags: [] }),
      makeEntity({ id: "name-substring", name: "The Nova Log", aliases: [], tags: [] }),
      makeEntity({ id: "alias-substring", name: "Three", aliases: ["The Nova Log"], tags: [] }),
      makeEntity({ id: "tag-exact", name: "Four", aliases: [], tags: ["Nova"] }),
      makeEntity({ id: "tag-prefix", name: "Five", aliases: [], tags: ["Nova-log"] }),
      makeEntity({ id: "tag-substring", name: "Six", aliases: [], tags: ["old-nova-log"] }),
    ],
  });

  it("applies every field-weighted exact, prefix, and substring score", () => {
    const response = searchEntities(rankedKnowledge, "nova");
    expect(response.results.map((result) => [result.entity.id, result.score])).toEqual([
      ["name-exact", 900],
      ["alias-exact", 850],
      ["name-prefix", 800],
      ["alias-prefix", 750],
      ["name-substring", 700],
      ["alias-substring", 650],
      ["tag-exact", 600],
      ["tag-prefix", 550],
      ["tag-substring", 500],
    ]);
  });

  it("breaks equal scores by Knowledge order", () => {
    const knowledge = makeKnowledge({
      entities: [
        makeEntity({ id: "z-id", name: "Z", aliases: [], tags: ["signal"] }),
        makeEntity({ id: "a-id", name: "A", aliases: [], tags: ["signal"] }),
      ],
    });
    expect(searchEntities(knowledge, "signal").results.map((item) => item.entity.id)).toEqual([
      "z-id",
      "a-id",
    ]);
  });

  it("deduplicates repeated normalized matches within one field", () => {
    const knowledge = makeKnowledge({
      entities: [
        makeEntity({ name: "Other", aliases: ["NOVA", "ＮＯＶＡ"], tags: [] }),
      ],
    });
    expect(searchEntities(knowledge, "nova").results[0]?.matches).toHaveLength(1);
  });
});

describe("searchEntities filtering", () => {
  const knowledge = makeKnowledge({
    entities: [
      makeEntity({ id: "one", entityType: "character", name: "Nova", tags: ["Signal", "Archive"] }),
      makeEntity({ id: "two", entityType: "location", name: "Nova Base", aliases: [], tags: ["signal"] }),
      makeEntity({ id: "three", entityType: "item", name: "Compass", aliases: [], tags: ["Archive", "Silver"] }),
    ],
  });

  it("returns filter matches in Knowledge order for an empty query", () => {
    const response = searchEntities(knowledge, "  ", {
      entityTypes: ["character", "item"],
    });
    expect(response.normalizedQuery).toBe("");
    expect(response.results.map((item) => item.entity.id)).toEqual(["one", "three"]);
    expect(response.results.every((item) => item.score === 0 && item.matches.length === 0)).toBe(true);
  });

  it("uses OR for EntityType and AND for normalized tag filters", () => {
    expect(
      searchEntities(knowledge, "", {
        entityTypes: ["character", "location"],
        tags: ["ＳＩＧＮＡＬ", " archive "],
      }).results.map((item) => item.entity.id),
    ).toEqual(["one"]);
  });

  it("combines query matching with filters", () => {
    expect(
      searchEntities(knowledge, "nova", { entityTypes: ["location"] }).results.map(
        (item) => item.entity.id,
      ),
    ).toEqual(["two"]);
  });

  it("returns no result for descriptions, attributes, and SourceRefs", () => {
    const hidden = makeKnowledge({
      entities: [
        makeEntity({
          name: "Visible",
          aliases: [],
          tags: [],
          description: "unknown archive",
          attributes: { secret: { canonicalValue: "unknown", claims: [], conflictResolvedAt: null } },
        }),
      ],
    });
    expect(searchEntities(hidden, "unknown").results).toEqual([]);
  });

  it("keeps available tag display values in first occurrence order", () => {
    expect(searchEntities(knowledge, "").availableTags).toEqual([
      "Signal",
      "Archive",
      "Silver",
    ]);
  });

  it("does not mutate Knowledge", () => {
    const original = structuredClone(knowledge);
    searchEntities(knowledge, "nova", { tags: ["signal"] });
    expect(knowledge).toEqual(original);
  });
});

describe("Project Astra Search", () => {
  it.each([
    ["Nova Arclight", ["ent-astra-001"]],
    ["nova", ["ent-astra-006", "ent-astra-001"]],
    ["ＮＯＶＡ", ["ent-astra-006", "ent-astra-001"]],
    ["ASC", ["ent-astra-002"]],
    ["archive-revision", ["ent-astra-001", "ent-astra-003"]],
    ["Quiet", ["ent-astra-007"]],
    ["unknown", []],
  ])("returns the deterministic result for %s", async (query, expectedIds) => {
    const result = await runProjectAstraFixture();
    expect(searchEntities(result.snapshot.knowledge, query).results.map((item) => item.entity.id)).toEqual(expectedIds);
  });
});
