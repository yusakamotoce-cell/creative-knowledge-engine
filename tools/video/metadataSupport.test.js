import { describe, expect, it } from "vitest";

import { parseVitestSummary, stripAnsi } from "./metadataSupport.mjs";

describe("video metadata test summary parser", () => {
  it("parses counts instead of relying on a hard-coded test total", () => {
    expect(
      parseVitestSummary(`
        Test Files  62 passed (62)
        Tests  611 passed (611)
      `),
    ).toEqual({ testFiles: 62, tests: 611 });
  });

  it("strips ANSI decoration before parsing", () => {
    expect(stripAnsi("\u001B[32mTests  7 passed\u001B[39m")).toBe(
      "Tests  7 passed",
    );
  });

  it("rejects incomplete output", () => {
    expect(() => parseVitestSummary("Tests failed")).toThrow(
      /Could not parse/u,
    );
  });
});
