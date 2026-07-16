import { describe, expect, it } from "vitest";

import { extractCandidateBundle, type ExtractionAdapter } from "./extractionAdapter";
import { FixtureExtractionAdapter } from "./fixtureExtractionAdapter";
import {
  expectAsyncErrorCode,
  expectErrorCode,
  hashA,
  makeCandidateBundle,
  makeImportedDocument,
} from "./testSupport";

class ValueAdapter implements ExtractionAdapter {
  readonly #value: unknown;

  constructor(value: unknown) {
    this.#value = value;
  }

  async extract(): Promise<unknown> {
    return this.#value;
  }
}

describe("Extraction Adapter boundary", () => {
  it("accepts a valid Candidate Bundle", async () => {
    const bundle = makeCandidateBundle();

    await expect(
      extractCandidateBundle(new ValueAdapter(bundle), makeImportedDocument()),
    ).resolves.toEqual(bundle);
  });

  it("rejects unknown fields and create-only contract violations", async () => {
    for (const output of [
      { ...makeCandidateBundle(), unknown: true },
      {
        ...makeCandidateBundle(),
        entities: [
          {
            candidateId: "candidate-1",
            entityType: "character",
            name: "Nova",
            aliases: [],
            description: "",
            attributes: {},
            tags: [],
            sourceRefs: [],
            confidence: 0.9,
            action: "merge",
            registeredEntityId: "entity-1",
            mergeTargetId: "entity-2",
          },
        ],
      },
    ]) {
      await expectAsyncErrorCode(
        () =>
          extractCandidateBundle(
            new ValueAdapter(output),
            makeImportedDocument(),
          ),
        "INVALID_CANDIDATE_BUNDLE",
      );
    }
  });

  it("rejects a Candidate Bundle for another document", async () => {
    await expectAsyncErrorCode(
      () =>
        extractCandidateBundle(
          new ValueAdapter(makeCandidateBundle("document-other")),
          makeImportedDocument(),
        ),
      "EXTRACTION_DOCUMENT_ID_MISMATCH",
    );
  });

  it("wraps Adapter exceptions and retains the cause", async () => {
    const cause = new Error("offline");
    const adapter: ExtractionAdapter = {
      async extract() {
        throw cause;
      },
    };

    try {
      await extractCandidateBundle(adapter, makeImportedDocument());
      throw new Error("expected failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "EXTRACTION_FAILED", cause });
    }
  });
});

describe("FixtureExtractionAdapter", () => {
  it("returns a registered synthetic Bundle by exact hash", async () => {
    const bundle = makeCandidateBundle();
    const adapter = new FixtureExtractionAdapter([
      { contentSha256: hashA, candidateBundle: bundle },
    ]);

    await expect(adapter.extract(makeImportedDocument())).resolves.toEqual(bundle);
  });

  it("rejects an unregistered hash", async () => {
    const adapter = new FixtureExtractionAdapter([]);

    await expectAsyncErrorCode(
      () => adapter.extract(makeImportedDocument()),
      "FIXTURE_NOT_FOUND",
    );
  });

  it("rejects duplicate Fixture hashes", () => {
    expectErrorCode(
      () =>
        new FixtureExtractionAdapter([
          { contentSha256: hashA, candidateBundle: makeCandidateBundle() },
          { contentSha256: hashA, candidateBundle: makeCandidateBundle() },
        ]),
      "DUPLICATE_FIXTURE_HASH",
    );
  });

  it("does not share constructor or return object references", async () => {
    const bundle = makeCandidateBundle();
    const adapter = new FixtureExtractionAdapter([
      { contentSha256: hashA, candidateBundle: bundle },
    ]);
    bundle.entities.push({
      candidateId: "mutated",
      entityType: "character",
      name: "Mutation",
      aliases: [],
      description: "",
      attributes: {},
      tags: [],
      sourceRefs: [],
    });
    const first = await adapter.extract(makeImportedDocument()) as ReturnType<
      typeof makeCandidateBundle
    >;
    first.entities.push(bundle.entities[0]!);
    const second = await adapter.extract(makeImportedDocument());

    expect(second).toEqual(makeCandidateBundle());
  });
});
