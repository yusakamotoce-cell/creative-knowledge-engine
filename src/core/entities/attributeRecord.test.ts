import { describe, expect, it } from "vitest";

import type { SourceRef } from "../shared/sourceRef";
import {
  addAttributeClaim,
  createAttributeRecord,
  hasUnresolvedAttributeConflict,
  resolveAttributeConflict,
  type AttributeClaim,
} from "./attributeRecord";

const sourceA: SourceRef = {
  documentId: "doc-a",
  fileName: "a.md",
  excerpt: "Nova is 17.",
};

const sourceB: SourceRef = {
  documentId: "doc-b",
  fileName: "b.md",
  excerpt: "Nova is 18.",
};

function claim(value: AttributeClaim["value"], sourceRef = sourceA): AttributeClaim {
  return { value, sourceRef };
}

describe("AttributeRecord pure functions", () => {
  it("uses the first claim as canonicalValue", () => {
    expect(createAttributeRecord(claim(17)).canonicalValue).toBe(17);
  });

  it("initializes claims with the first claim", () => {
    expect(createAttributeRecord(claim(17)).claims).toEqual([claim(17)]);
  });

  it("initializes conflictResolvedAt to null", () => {
    expect(createAttributeRecord(claim(17)).conflictResolvedAt).toBeNull();
  });

  it("does not change canonicalValue when a claim is added", () => {
    const record = createAttributeRecord(claim(17));

    expect(addAttributeClaim(record, claim(18, sourceB)).canonicalValue).toBe(17);
  });

  it("does not create a Conflict for equal normalized values", () => {
    const record = createAttributeRecord(claim(" Nova "));
    const updated = addAttributeClaim(record, claim("Ｎｏｖａ", sourceB));

    expect(hasUnresolvedAttributeConflict(updated)).toBe(false);
  });

  it("detects an unresolved Conflict for different values", () => {
    const record = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim(18, sourceB),
    );

    expect(hasUnresolvedAttributeConflict(record)).toBe(true);
  });

  it("does not report a resolved Conflict as unresolved", () => {
    const conflicted = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim(18, sourceB),
    );
    const resolved = resolveAttributeConflict(
      conflicted,
      18,
      "2026-07-16T12:00:00+09:00",
    );

    expect(hasUnresolvedAttributeConflict(resolved)).toBe(false);
  });

  it("reopens a resolved Conflict when a new different value arrives", () => {
    const record = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim(18, sourceB),
    );
    const resolved = resolveAttributeConflict(
      record,
      17,
      "2026-07-16T12:00:00+09:00",
    );
    const reopened = addAttributeClaim(
      resolved,
      claim(19, { ...sourceB, excerpt: "Nova is 19." }),
    );

    expect(reopened.conflictResolvedAt).toBeNull();
    expect(hasUnresolvedAttributeConflict(reopened)).toBe(true);
  });

  it("keeps all claims when a Conflict is resolved", () => {
    const record = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim(18, sourceB),
    );
    const resolved = resolveAttributeConflict(
      record,
      17,
      "2026-07-16T12:00:00Z",
    );

    expect(resolved.claims).toHaveLength(2);
  });

  it("does not add the same normalized claim from the same SourceRef twice", () => {
    const record = createAttributeRecord(claim(" 17 "));
    const updated = addAttributeClaim(record, claim("１７"));

    expect(updated.claims).toHaveLength(1);
  });

  it("keeps equal values from different SourceRefs as separate claims", () => {
    const record = createAttributeRecord(claim(17));
    const updated = addAttributeClaim(record, claim(17, sourceB));

    expect(updated.claims).toHaveLength(2);
    expect(hasUnresolvedAttributeConflict(updated)).toBe(false);
  });

  it("treats number 17 and string 17 as different values", () => {
    const record = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim("17", sourceB),
    );

    expect(hasUnresolvedAttributeConflict(record)).toBe(true);
  });

  it("does not mutate the input record", () => {
    const original = createAttributeRecord(claim(17));
    const snapshot = structuredClone(original);

    addAttributeClaim(original, claim(18, sourceB));
    resolveAttributeConflict(original, 17, "2026-07-16T12:00:00Z");

    expect(original).toEqual(snapshot);
  });

  it("rejects an invalid resolvedAt value", () => {
    const record = createAttributeRecord(claim(17));

    expect(() => resolveAttributeConflict(record, 17, "not-a-date")).toThrow();
  });

  it("preserves a resolution when a known value arrives from a new source", () => {
    const conflicted = addAttributeClaim(
      createAttributeRecord(claim(17)),
      claim(18, sourceB),
    );
    const resolved = resolveAttributeConflict(
      conflicted,
      17,
      "2026-07-16T12:00:00Z",
    );
    const updated = addAttributeClaim(
      resolved,
      claim(18, { ...sourceB, documentId: "doc-c" }),
    );

    expect(updated.conflictResolvedAt).toBe("2026-07-16T12:00:00Z");
    expect(hasUnresolvedAttributeConflict(updated)).toBe(false);
  });
});
