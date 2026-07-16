import { describe, expect, it } from "vitest";

import type { EntityCandidate } from "../candidates/candidate";
import type { Entity } from "./entity";
import {
  buildEntityNameIndex,
  findDuplicateEntityIds,
} from "./entityNameIndex";

function entity(
  id: string,
  name: string,
  aliases: string[] = [],
): Entity {
  return {
    id,
    entityType: "character",
    name,
    aliases,
    description: "",
    attributes: {},
    tags: [],
    sourceRefs: [],
    createdAt: "2026-07-16T00:00:00Z",
    updatedAt: "2026-07-16T00:00:00Z",
  };
}

function candidate(name: string, aliases: string[] = []): EntityCandidate {
  return {
    candidateId: "candidate-1",
    entityType: "character",
    name,
    aliases,
    description: "",
    attributes: {},
    tags: [],
    sourceRefs: [],
  };
}

describe("Entity name index", () => {
  it("matches candidate name to existing name", () => {
    const index = buildEntityNameIndex([entity("entity-1", "Nova")]);

    expect(findDuplicateEntityIds(candidate("Nova"), index)).toEqual([
      "entity-1",
    ]);
  });

  it("matches candidate name to existing alias", () => {
    const index = buildEntityNameIndex([
      entity("entity-1", "Nova Arclight", ["Nova"]),
    ]);

    expect(findDuplicateEntityIds(candidate("Nova"), index)).toEqual([
      "entity-1",
    ]);
  });

  it("matches candidate alias to existing name", () => {
    const index = buildEntityNameIndex([entity("entity-1", "Nova")]);

    expect(
      findDuplicateEntityIds(candidate("Unknown", ["Nova"]), index),
    ).toEqual(["entity-1"]);
  });

  it("absorbs case, width, and whitespace differences", () => {
    const index = buildEntityNameIndex([
      entity("entity-1", "Nova Arclight", ["Nova"]),
    ]);

    expect(findDuplicateEntityIds(candidate("  ＮＯＶＡ  "), index)).toEqual([
      "entity-1",
    ]);
  });

  it("returns an empty array when no exact normalized name matches", () => {
    const index = buildEntityNameIndex([
      entity("entity-1", "Northstar Observatory"),
    ]);

    expect(
      findDuplicateEntityIds(candidate("North Star Observatory"), index),
    ).toEqual([]);
  });

  it("returns multiple matches in deterministic ID order", () => {
    const index = buildEntityNameIndex([
      entity("entity-z", "Nova"),
      entity("entity-a", "Other", ["Nova"]),
    ]);

    expect(findDuplicateEntityIds(candidate("Nova"), index)).toEqual([
      "entity-a",
      "entity-z",
    ]);
  });

  it("does not return the same ID twice", () => {
    const index = buildEntityNameIndex([
      entity("entity-1", "Nova", ["NOVA"]),
    ]);

    expect(
      findDuplicateEntityIds(candidate("Nova", ["ＮＯＶＡ"]), index),
    ).toEqual(["entity-1"]);
  });

  it("builds the same index regardless of Entity input order", () => {
    const first = entity("entity-z", "Nova");
    const second = entity("entity-a", "Other", ["Nova"]);

    expect([...buildEntityNameIndex([first, second])]).toEqual([
      ...buildEntityNameIndex([second, first]),
    ]);
  });
});
