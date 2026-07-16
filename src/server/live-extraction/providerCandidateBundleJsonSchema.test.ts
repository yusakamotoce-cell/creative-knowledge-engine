import { describe, expect, it } from "vitest";

import { providerCandidateBundleJsonSchema } from "./providerCandidateBundleJsonSchema";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("expected record");
  }
  return value as Record<string, unknown>;
}

function visitSchema(
  value: unknown,
  visitor: (schema: Record<string, unknown>) => void,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }
  const schema = value as Record<string, unknown>;
  visitor(schema);
  if (schema.properties !== undefined) {
    for (const property of Object.values(record(schema.properties))) {
      visitSchema(property, visitor);
    }
  }
  if (schema.items !== undefined) {
    visitSchema(schema.items, visitor);
  }
  if (Array.isArray(schema.anyOf)) {
    for (const branch of schema.anyOf) {
      visitSchema(branch, visitor);
    }
  }
}

describe("OpenAI provider Candidate Bundle JSON Schema", () => {
  it("sets additionalProperties false on every object", () => {
    let objectCount = 0;
    visitSchema(providerCandidateBundleJsonSchema, (schema) => {
      if (schema.type === "object") {
        objectCount += 1;
        expect(schema.additionalProperties).toBe(false);
      }
    });
    expect(objectCount).toBeGreaterThan(0);
  });

  it("contains no schema-valued additionalProperties", () => {
    visitSchema(providerCandidateBundleJsonSchema, (schema) => {
      if (Object.hasOwn(schema, "additionalProperties")) {
        expect(schema.additionalProperties).toBe(false);
      }
    });
    expect(JSON.stringify(providerCandidateBundleJsonSchema)).not.toMatch(
      /"additionalProperties":\s*\{/u,
    );
  });

  it("requires every property on every object variant", () => {
    visitSchema(providerCandidateBundleJsonSchema, (schema) => {
      if (schema.type !== "object") return;
      const propertyNames = Object.keys(record(schema.properties)).sort();
      const required = [...(schema.required as string[])].sort();
      expect(required).toEqual(propertyNames);
    });
  });

  it("represents attributes as a strict key/value array", () => {
    const rootProperties = record(providerCandidateBundleJsonSchema.properties);
    const entities = record(rootProperties.entities);
    const entity = record(entities.items);
    const entityProperties = record(entity.properties);
    const attributes = record(entityProperties.attributes);
    const attribute = record(attributes.items);

    expect(attributes.type).toBe("array");
    expect(attribute).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["key", "value"],
    });
    expect(record(attribute.properties).value).toEqual({
      anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    });
  });

  it("uses the five domain EntityType values and safety maxima", () => {
    const properties = record(providerCandidateBundleJsonSchema.properties);
    const entities = record(properties.entities);
    const entity = record(entities.items);
    const entityProperties = record(entity.properties);

    expect(record(entityProperties.entityType).enum).toEqual([
      "character",
      "scene",
      "location",
      "item",
      "organization",
    ]);
    expect(entities.maxItems).toBe(40);
    expect(record(properties.relationships).maxItems).toBe(80);
    const sourceRefs = record(entityProperties.sourceRefs);
    const sourceRef = record(sourceRefs.items);
    expect(record(record(sourceRef.properties).excerpt).maxLength).toBe(500);
  });

  it("does not expose domain review result fields", () => {
    const serialized = JSON.stringify(providerCandidateBundleJsonSchema);
    for (const forbidden of [
      "action",
      "registeredEntityId",
      "mergeTarget",
      "canonicalValue",
      "confidence",
    ]) {
      expect(serialized).not.toContain(`"${forbidden}"`);
    }
  });
});
