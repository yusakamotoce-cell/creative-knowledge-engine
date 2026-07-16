import { isoDateTimeSchema } from "./schemas";
import { ReviewDomainError } from "../review/errors";

export interface Clock {
  now(): string;
}

export class SystemClock implements Clock {
  now(): string {
    return new Date().toISOString();
  }
}

export class SequenceClock implements Clock {
  private nextIndex = 0;
  private readonly values: readonly string[];

  constructor(values: readonly string[]) {
    this.values = values.map((value) => isoDateTimeSchema.parse(value));
  }

  now(): string {
    const value = this.values[this.nextIndex];

    if (value === undefined) {
      throw new ReviewDomainError("CLOCK_SEQUENCE_EXHAUSTED");
    }

    this.nextIndex += 1;
    return value;
  }
}
