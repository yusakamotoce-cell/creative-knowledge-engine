import { describe, expect, it } from "vitest";

import { runProjectAstraFixture } from "../../data/demo/project-astra";
import { makeEntity, makeKnowledge, makeRelationship } from "../review/testSupport";
import {
  filterKnowledgeGraph,
  layoutKnowledgeGraph,
  projectKnowledgeGraph,
} from "./knowledgeGraph";

describe("projectKnowledgeGraph", () => {
  it("preserves Entity, Relationship, and relationType first-occurrence order", () => {
    const knowledge = makeKnowledge({
      relationships: [
        makeRelationship({ id: "rel-1", relationType: "member_of" }),
        makeRelationship({ id: "rel-2", relationType: "appears_in" }),
        makeRelationship({ id: "rel-3", relationType: "member_of" }),
      ],
    });
    const graph = projectKnowledgeGraph(knowledge);
    expect(graph.nodes.map((node) => node.entityId)).toEqual(["entity-existing", "entity-team"]);
    expect(graph.edges.map((edge) => edge.relationshipId)).toEqual(["rel-1", "rel-2", "rel-3"]);
    expect(graph.availableRelationTypes).toEqual(["member_of", "appears_in"]);
  });

  it("derives original orphan and relationship counts", () => {
    const graph = projectKnowledgeGraph(
      makeKnowledge({
        entities: [
          makeEntity({ id: "connected" }),
          makeEntity({ id: "target", name: "Target" }),
          makeEntity({ id: "orphan", name: "Orphan" }),
        ],
        relationships: [
          makeRelationship({ fromEntityId: "connected", toEntityId: "target" }),
        ],
      }),
    );
    expect(graph.nodes.map((node) => [node.entityId, node.isOrphan, node.relationshipCount])).toEqual([
      ["connected", false, 1],
      ["target", false, 1],
      ["orphan", true, 0],
    ]);
  });

  it("does not repair a dangling Relationship", () => {
    const graph = projectKnowledgeGraph(
      makeKnowledge({ relationships: [makeRelationship({ toEntityId: "missing" })] }),
    );
    expect(graph.edges[0]).toMatchObject({ targetNodeId: "node:missing" });
  });

  it("rejects duplicate graph identities with a typed error", () => {
    expect(() =>
      projectKnowledgeGraph(
        makeKnowledge({ entities: [makeEntity(), makeEntity()] }),
      ),
    ).toThrow(expect.objectContaining({ code: "GRAPH_PROJECTION_FAILED" }));
  });
});

describe("filterKnowledgeGraph", () => {
  const projection = projectKnowledgeGraph(
    makeKnowledge({
      entities: [
        makeEntity({ id: "character", entityType: "character" }),
        makeEntity({ id: "team", entityType: "organization", name: "Team" }),
        makeEntity({ id: "orphan", entityType: "item", name: "Orphan" }),
      ],
      relationships: [
        makeRelationship({ id: "member", fromEntityId: "character", toEntityId: "team", relationType: "member_of" }),
      ],
    }),
  );

  it("requires selected EntityTypes, relationTypes, and displayed endpoints", () => {
    const filtered = filterKnowledgeGraph(projection, {
      entityTypes: ["character"],
      relationTypes: ["member_of"],
      includeOrphans: true,
    });
    expect(filtered.nodes.map((node) => node.entityId)).toEqual(["character"]);
    expect(filtered.edges).toEqual([]);
  });

  it("removes original Orphans without removing temporarily isolated nodes", () => {
    const filtered = filterKnowledgeGraph(projection, {
      entityTypes: ["character", "organization", "item"],
      relationTypes: [],
      includeOrphans: false,
    });
    expect(filtered.nodes.map((node) => node.entityId)).toEqual(["character", "team"]);
    expect(filtered.edges).toEqual([]);
  });
});

describe("layoutKnowledgeGraph", () => {
  it("uses stable EntityType lanes and Knowledge order within lanes", () => {
    const graph = projectKnowledgeGraph(
      makeKnowledge({
        entities: [
          makeEntity({ id: "scene", entityType: "scene" }),
          makeEntity({ id: "character-1", entityType: "character" }),
          makeEntity({ id: "character-2", entityType: "character" }),
          makeEntity({ id: "organization", entityType: "organization" }),
        ],
        relationships: [],
      }),
    );
    const first = layoutKnowledgeGraph(graph);
    const second = layoutKnowledgeGraph(graph);
    expect(first).toEqual(second);
    const byId = Object.fromEntries(first.nodes.map((node) => [node.entityId, node]));
    expect(byId["character-1"]?.x).toBeLessThan(byId.organization?.x ?? 0);
    expect(byId.organization?.x).toBeLessThan(byId.scene?.x ?? 0);
    expect(byId["character-2"]?.y).toBeGreaterThan(byId["character-1"]?.y ?? 0);
  });

  it("expands canvas height for the largest lane", () => {
    const short = layoutKnowledgeGraph(projectKnowledgeGraph(makeKnowledge({ relationships: [] })));
    const tall = layoutKnowledgeGraph(
      projectKnowledgeGraph(
        makeKnowledge({
          entities: Array.from({ length: 6 }, (_, index) =>
            makeEntity({ id: `character-${index}`, entityType: "character" }),
          ),
          relationships: [],
        }),
      ),
    );
    expect(tall.height).toBeGreaterThan(short.height);
  });

  it("does not mutate its projection", () => {
    const projection = projectKnowledgeGraph(makeKnowledge());
    const original = structuredClone(projection);
    layoutKnowledgeGraph(projection);
    expect(projection).toEqual(original);
  });
});

describe("Project Astra graph", () => {
  it("projects the frozen 7 nodes and 5 directed edges", async () => {
    const completed = await runProjectAstraFixture();
    const graph = projectKnowledgeGraph(completed.snapshot.knowledge);
    expect(graph.nodes).toHaveLength(7);
    expect(graph.edges).toHaveLength(5);
    expect(graph.nodes.find((node) => node.entityId === "ent-astra-007")).toMatchObject({
      label: "Quiet Prism",
      isOrphan: true,
      relationshipCount: 0,
    });
    expect(graph.nodes.find((node) => node.entityId === "ent-astra-001")?.relationshipCount).toBe(3);
    expect(graph.nodes.find((node) => node.entityId === "ent-astra-004")?.relationshipCount).toBe(3);
    expect(graph.edges.filter((edge) => edge.sourceNodeId === "node:ent-astra-001")).toHaveLength(3);
    expect(graph.edges.filter((edge) => edge.sourceNodeId === "node:ent-astra-004")).toHaveLength(1);
    expect(graph.edges.filter((edge) => edge.targetNodeId === "node:ent-astra-004")).toHaveLength(2);
    expect(graph.edges[0]).toMatchObject({
      sourceNodeId: "node:ent-astra-001",
      targetNodeId: "node:ent-astra-002",
      relationType: "member_of",
    });
  });
});
