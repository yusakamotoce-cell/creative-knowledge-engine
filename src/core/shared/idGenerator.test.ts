import { describe, expect, it } from "vitest";

import { CryptoIdGenerator, SequenceIdGenerator } from "./idGenerator";

describe("IdGenerator", () => {
  it("returns test IDs in the supplied order", () => {
    const generator = new SequenceIdGenerator(["entity-1", "entity-2"]);

    expect(generator.nextId("entity")).toBe("entity-1");
    expect(generator.nextId("entity")).toBe("entity-2");
  });

  it("throws a stable error when the test sequence is exhausted", () => {
    const generator = new SequenceIdGenerator([]);

    expect(() => generator.nextId("entity")).toThrow("ID_SEQUENCE_EXHAUSTED");
  });

  it("injects UUID generation at the domain boundary", () => {
    const generator = new CryptoIdGenerator(
      () => "00000000-0000-4000-8000-000000000001",
    );

    expect(generator.nextId("entity")).toBe(
      "entity-00000000-0000-4000-8000-000000000001",
    );
  });

  it("rejects an empty production ID prefix", () => {
    const generator = new CryptoIdGenerator(() => "uuid");

    expect(() => generator.nextId("   ")).toThrow("ID_PREFIX_REQUIRED");
  });
});
