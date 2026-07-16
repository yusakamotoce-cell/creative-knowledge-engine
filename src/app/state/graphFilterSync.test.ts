import { describe, expect, it } from "vitest";

import { runProjectAstraFixture } from "../../data/demo/project-astra";
import { graphEntityTypeLanes } from "../../core/graph";
import { graphFiltersForSnapshot } from "./useApplicationController";

describe("graphFiltersForSnapshot", () => {
  it("selects relationTypes added while the controller is following all", async () => {
    const completed = await runProjectAstraFixture();
    expect(
      graphFiltersForSnapshot(
        {
          graphFilters: {
            entityTypes: [...graphEntityTypeLanes],
            relationTypes: [],
            includeOrphans: true,
          },
          graphRelationTypesFollowAll: true,
        },
        completed.snapshot,
      ).relationTypes,
    ).toEqual(["member_of", "carries", "appears_in", "located_at"]);
  });

  it("preserves an explicit relationType subset when Knowledge changes", async () => {
    const completed = await runProjectAstraFixture();
    expect(
      graphFiltersForSnapshot(
        {
          graphFilters: {
            entityTypes: [...graphEntityTypeLanes],
            relationTypes: ["appears_in", "removed_type"],
            includeOrphans: false,
          },
          graphRelationTypesFollowAll: false,
        },
        completed.snapshot,
      ),
    ).toEqual({
      entityTypes: [...graphEntityTypeLanes],
      relationTypes: ["appears_in"],
      includeOrphans: false,
    });
  });
});

