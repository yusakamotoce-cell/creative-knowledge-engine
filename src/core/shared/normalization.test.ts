import { describe, expect, it } from "vitest";

import {
  normalizeAttributeKey,
  normalizeEntityName,
  normalizeRelationType,
  normalizeScalarValue,
} from "./normalization";

describe("normalization", () => {
  it("normalizes full-width Latin characters with NFKC", () => {
    expect(normalizeEntityName("ＮＯＶＡ")) .toBe("nova");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeEntityName("  Nova  ")).toBe("nova");
  });

  it("collapses consecutive whitespace", () => {
    expect(normalizeEntityName("Northstar\n\t  Observatory")).toBe(
      "northstar observatory",
    );
  });

  it("lowercases English letters for entity matching", () => {
    expect(normalizeEntityName("Nova Arclight")).toBe("nova arclight");
  });

  it("normalizes attribute keys deterministically", () => {
    expect(normalizeAttributeKey("  ROLE　TYPE ")).toBe("role type");
  });

  it("keeps number 17 distinct from string 17", () => {
    expect(normalizeScalarValue(17)).toBe("number:17");
    expect(normalizeScalarValue("17")).toBe("string:17");
  });

  it("keeps boolean true distinct from string true", () => {
    expect(normalizeScalarValue(true)).toBe("boolean:true");
    expect(normalizeScalarValue("true")).toBe("string:true");
  });

  it("normalizes relationType with the same deterministic text rules", () => {
    expect(normalizeRelationType("  ＭＥＭＢＥＲ＿ＯＦ  ")).toBe("member_of");
  });

  it("normalizes negative zero to the stable number representation", () => {
    expect(normalizeScalarValue(-0)).toBe("number:0");
  });

  it("rejects non-finite numbers", () => {
    expect(() => normalizeScalarValue(Number.POSITIVE_INFINITY)).toThrow(
      "SCALAR_NUMBER_MUST_BE_FINITE",
    );
  });
});
