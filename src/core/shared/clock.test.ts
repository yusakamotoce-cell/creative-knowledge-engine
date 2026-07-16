import { describe, expect, it } from "vitest";

import { SequenceClock, SystemClock } from "./clock";
import { ReviewDomainError } from "../review/errors";

describe("Clock", () => {
  it("returns SequenceClock values in order", () => {
    const clock = new SequenceClock([
      "2026-07-16T00:00:00.000Z",
      "2026-07-16T01:00:00.000Z",
    ]);

    expect(clock.now()).toBe("2026-07-16T00:00:00.000Z");
    expect(clock.now()).toBe("2026-07-16T01:00:00.000Z");
  });

  it("throws a typed exhaustion error", () => {
    const clock = new SequenceClock([]);

    try {
      clock.now();
      throw new Error("expected an error");
    } catch (error) {
      expect(error).toBeInstanceOf(ReviewDomainError);
      expect((error as ReviewDomainError).code).toBe("CLOCK_SEQUENCE_EXHAUSTED");
    }
  });

  it("returns a valid ISO timestamp from SystemClock", () => {
    expect(() => new Date(new SystemClock().now()).toISOString()).not.toThrow();
  });

  it("validates sequence values when constructed", () => {
    expect(() => new SequenceClock(["not-a-date"])).toThrow();
  });
});
