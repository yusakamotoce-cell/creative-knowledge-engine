import { describe, expect, it } from "vitest";

import { unionSourceRefs, unionStrings } from "./deterministicUnion";

const sourceA = {
  documentId: "doc-a",
  fileName: "a.md",
  excerpt: "A",
};

const sourceB = {
  documentId: "doc-b",
  fileName: "b.md",
  excerpt: "B",
};

describe("deterministic unions", () => {
  it("deduplicates strings while preserving first occurrence", () => {
    expect(unionStrings(["zeta", "alpha"], ["beta", "alpha"])).toEqual([
      "zeta",
      "alpha",
      "beta",
    ]);
  });

  it("uses exact string identity rather than name normalization", () => {
    expect(unionStrings(["Nova"], ["NOVA"])).toEqual(["Nova", "NOVA"]);
  });

  it("keeps existing values before incoming values", () => {
    expect(unionStrings(["existing"], ["incoming"])).toEqual([
      "existing",
      "incoming",
    ]);
  });

  it("deduplicates SourceRefs by the complete triple", () => {
    expect(unionSourceRefs([sourceA], [sourceA])).toEqual([sourceA]);
  });

  it("keeps SourceRefs with different excerpts", () => {
    const revisedSourceA = { ...sourceA, excerpt: "A revised" };

    expect(unionSourceRefs([sourceA], [revisedSourceA])).toHaveLength(2);
  });

  it("does not collide when SourceRef fields contain delimiter-like text", () => {
    const first = {
      documentId: "doc|file",
      fileName: "excerpt",
      excerpt: "value",
    };
    const second = {
      documentId: "doc",
      fileName: "file|excerpt",
      excerpt: "value",
    };

    expect(unionSourceRefs([first], [second])).toEqual([first, second]);
  });

  it("preserves first occurrence for SourceRefs", () => {
    expect(unionSourceRefs([sourceB], [sourceA])).toEqual([sourceB, sourceA]);
    expect(unionSourceRefs([sourceA], [sourceB])).toEqual([sourceA, sourceB]);
  });
});
