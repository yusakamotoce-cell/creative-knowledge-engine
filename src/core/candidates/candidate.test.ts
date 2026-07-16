import { describe, expect, it } from "vitest";

import { candidateBundleSchema } from "./candidate";

const validBundle = {
  schemaVersion: 1,
  documentId: "doc-001",
  entities: [
    {
      candidateId: "candidate-nova",
      entityType: "character",
      name: "Nova",
      aliases: ["The Architect"],
      description: "A planner.",
      attributes: { age: 17, active: true },
      tags: ["planner"],
      sourceRefs: [
        {
          documentId: "doc-001",
          fileName: "nova.md",
          excerpt: "Nova is a planner.",
        },
      ],
    },
  ],
  relationships: [
    {
      candidateId: "relationship-nova-team",
      fromRef: { candidateId: "candidate-nova" },
      toRef: { name: "Astra Survey Corps", entityType: "organization" },
      relationType: "member_of",
      description: "",
      sourceRefs: [],
    },
  ],
} as const;

function cloneBundle(): Record<string, unknown> {
  return structuredClone(validBundle) as unknown as Record<string, unknown>;
}

describe("candidateBundleSchema", () => {
  it("accepts a valid Candidate Bundle", () => {
    expect(candidateBundleSchema.parse(validBundle)).toEqual(validBundle);
  });

  it("rejects an unknown EntityType", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    entities[0]!.entityType = "project";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects a missing entity name", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    delete entities[0]!.name;

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects an empty candidateId", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    entities[0]!.candidateId = "   ";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects an EntityReference without candidateId or name", () => {
    const bundle = cloneBundle();
    const relationships = bundle.relationships as Array<Record<string, unknown>>;
    relationships[0]!.fromRef = { entityType: "character" };

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it.each([null, [17], { value: 17 }])(
    "rejects a non-scalar candidate attribute: %j",
    (invalidValue) => {
      const bundle = cloneBundle();
      const entities = bundle.entities as Array<Record<string, unknown>>;
      const attributes = entities[0]!.attributes as Record<string, unknown>;
      attributes.age = invalidValue;

      expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
    },
  );

  it("rejects a schemaVersion other than 1", () => {
    const bundle = cloneBundle();
    bundle.schemaVersion = 2;

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it.each(["entities", "relationships"])(
    "rejects %s when it is not an array",
    (field) => {
      const bundle = cloneBundle();
      bundle[field] = {};

      expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
    },
  );

  it("rejects an empty relationType", () => {
    const bundle = cloneBundle();
    const relationships = bundle.relationships as Array<Record<string, unknown>>;
    relationships[0]!.relationType = "   ";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects Relationship confidence", () => {
    const bundle = cloneBundle();
    const relationships = bundle.relationships as Array<Record<string, unknown>>;
    relationships[0]!.confidence = 0.9;

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects unknown fields at every strict schema boundary", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    entities[0]!.action = "accept";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects an invalid SourceRef", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    const sourceRefs = entities[0]!.sourceRefs as Array<Record<string, unknown>>;
    sourceRefs[0]!.documentId = "   ";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("rejects an unknown SourceRef field", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    const sourceRefs = entities[0]!.sourceRefs as Array<Record<string, unknown>>;
    sourceRefs[0]!.page = 1;

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(false);
  });

  it("accepts an empty SourceRef excerpt", () => {
    const bundle = cloneBundle();
    const entities = bundle.entities as Array<Record<string, unknown>>;
    const sourceRefs = entities[0]!.sourceRefs as Array<Record<string, unknown>>;
    sourceRefs[0]!.excerpt = "";

    expect(candidateBundleSchema.safeParse(bundle).success).toBe(true);
  });

  it("trims non-empty identifiers without changing excerpts", () => {
    const bundle = cloneBundle();
    bundle.documentId = "  doc-001  ";
    const entities = bundle.entities as Array<Record<string, unknown>>;
    const sourceRefs = entities[0]!.sourceRefs as Array<Record<string, unknown>>;
    sourceRefs[0]!.excerpt = "  exact excerpt  ";

    const parsed = candidateBundleSchema.parse(bundle);

    expect(parsed.documentId).toBe("doc-001");
    expect(parsed.entities[0]?.sourceRefs[0]?.excerpt).toBe("  exact excerpt  ");
  });
});
