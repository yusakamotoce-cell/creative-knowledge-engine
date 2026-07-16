export interface IdGenerator {
  nextId(prefix: string): string;
}

type RandomUuid = () => string;

function defaultRandomUuid(): string {
  return globalThis.crypto.randomUUID();
}

export class CryptoIdGenerator implements IdGenerator {
  readonly #randomUuid: RandomUuid;

  constructor(randomUuid: RandomUuid = defaultRandomUuid) {
    this.#randomUuid = randomUuid;
  }

  nextId(prefix: string): string {
    const normalizedPrefix = prefix.trim();

    if (normalizedPrefix.length === 0) {
      throw new TypeError("ID_PREFIX_REQUIRED");
    }

    return `${normalizedPrefix}-${this.#randomUuid()}`;
  }
}

export class SequenceIdGenerator implements IdGenerator {
  readonly #ids: readonly string[];
  #index = 0;

  constructor(ids: readonly string[]) {
    this.#ids = [...ids];
  }

  get consumedCount(): number {
    return this.#index;
  }

  get remainingCount(): number {
    return this.#ids.length - this.#index;
  }

  nextId(prefix: string): string {
    void prefix;
    const id = this.#ids[this.#index];

    if (id === undefined) {
      throw new Error("ID_SEQUENCE_EXHAUSTED");
    }

    this.#index += 1;
    return id;
  }
}
