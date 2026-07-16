import { describe, expect, it } from "vitest";

import {
  CANDIDATE_BUNDLE_LIMITS,
  CandidateBundleGroundingError,
  validateCandidateBundleGrounding,
} from "./candidateBundleGrounding";
import {
  createLiveTestBundle,
  createLiveTestDocument,
} from "../../test/liveExtractionTestSupport";

function expectGroundingError(
  operation: () => unknown,
  code: CandidateBundleGroundingError["code"],
): void {
  expect(operation).toThrowError(
    expect.objectContaining({
      name: "CandidateBundleGroundingError",
      code,
    }),
  );
}

describe("Candidate Bundle grounding", () => {
  it("accepts exact evidence and does not mutate either input", () => {
    const document = createLiveTestDocument();
    const bundle = createLiveTestBundle();
    const beforeDocument = structuredClone(document);
    const beforeBundle = structuredClone(bundle);

    expect(validateCandidateBundleGrounding(document, bundle)).toEqual(bundle);
    expect(document).toEqual(beforeDocument);
    expect(bundle).toEqual(beforeBundle);
  });

  it("rejects a Candidate Bundle document mismatch", () => {
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(
          createLiveTestDocument(),
          createLiveTestBundle({ documentId: "other" }),
        ),
      "AI_DOCUMENT_ID_MISMATCH",
    );
  });

  it.each([
    ["documentId", "other"],
    ["fileName", "other.md"],
  ] as const)("rejects SourceRef %s mismatch", (field, value) => {
    const bundle = createLiveTestBundle();
    const sourceRef = bundle.entities[0]?.sourceRefs[0];
    if (sourceRef === undefined) throw new Error("missing test SourceRef");
    sourceRef[field] = value;
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(createLiveTestDocument(), bundle),
      "AI_SOURCE_REF_MISMATCH",
    );
  });

  it.each([
    ["empty", ""],
    ["not present", "Mira is a pilot."],
    ["Unicode-normalized but not exact", "Cafe\u0301 Lantern"],
    ["LF where raw content uses CRLF", "Harbor.\nCafé"],
  ])("rejects %s evidence", (_name, excerpt) => {
    const bundle = createLiveTestBundle();
    const sourceRef = bundle.entities[0]?.sourceRefs[0];
    if (sourceRef === undefined) throw new Error("missing test SourceRef");
    sourceRef.excerpt = excerpt;
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(createLiveTestDocument(), bundle),
      "AI_UNGROUNDED_SOURCE_REF",
    );
  });

  it("rejects duplicate IDs across Entity and Relationship candidates", () => {
    const bundle = createLiveTestBundle({
      relationships: [
        {
          candidateId: "candidate-mira",
          fromRef: { candidateId: "candidate-mira" },
          toRef: { name: "North Harbor", entityType: "location" },
          relationType: "maps",
          description: "",
          sourceRefs: [],
        },
      ],
    });
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(createLiveTestDocument(), bundle),
      "AI_OUTPUT_LIMIT_EXCEEDED",
    );
  });

  it("rejects Entity and Relationship count limits", () => {
    const entity = createLiveTestBundle().entities[0];
    if (entity === undefined) throw new Error("missing test Entity");
    const tooManyEntities = Array.from(
      { length: CANDIDATE_BUNDLE_LIMITS.entities + 1 },
      (_, index) => ({ ...structuredClone(entity), candidateId: `entity-${index}` }),
    );
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(
          createLiveTestDocument(),
          createLiveTestBundle({ entities: tooManyEntities }),
        ),
      "AI_OUTPUT_LIMIT_EXCEEDED",
    );

    const relationship = {
      candidateId: "relationship-0",
      fromRef: { candidateId: "candidate-mira" },
      toRef: { name: "North Harbor", entityType: "location" as const },
      relationType: "maps",
      description: "",
      sourceRefs: [],
    };
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(
          createLiveTestDocument(),
          createLiveTestBundle({
            relationships: Array.from(
              { length: CANDIDATE_BUNDLE_LIMITS.relationships + 1 },
              (_, index) => ({
                ...relationship,
                candidateId: `relationship-${index}`,
              }),
            ),
          }),
        ),
      "AI_OUTPUT_LIMIT_EXCEEDED",
    );
  });

  it.each([
    ["aliases", CANDIDATE_BUNDLE_LIMITS.aliasesPerEntity + 1],
    ["tags", CANDIDATE_BUNDLE_LIMITS.tagsPerEntity + 1],
    ["sourceRefs", CANDIDATE_BUNDLE_LIMITS.sourceRefsPerCandidate + 1],
  ] as const)("rejects an Entity %s limit", (field, length) => {
    const bundle = createLiveTestBundle();
    const entity = bundle.entities[0];
    if (entity === undefined) throw new Error("missing test Entity");
    if (field === "sourceRefs") {
      entity.sourceRefs = Array.from(
        { length },
        () => structuredClone(entity.sourceRefs[0]!),
      );
    } else {
      entity[field] = Array.from({ length }, (_, index) => `value-${index}`);
    }
    expectGroundingError(
      () =>
        validateCandidateBundleGrounding(createLiveTestDocument(), bundle),
      "AI_OUTPUT_LIMIT_EXCEEDED",
    );
  });

  it("rejects overlong descriptions, excerpts, keys, and scalar strings", () => {
    const mutations = [
      (bundle: ReturnType<typeof createLiveTestBundle>) => {
        bundle.entities[0]!.description = "x".repeat(
          CANDIDATE_BUNDLE_LIMITS.descriptionCharacters + 1,
        );
      },
      (bundle: ReturnType<typeof createLiveTestBundle>) => {
        bundle.entities[0]!.sourceRefs[0]!.excerpt = "M".repeat(
          CANDIDATE_BUNDLE_LIMITS.excerptCharacters + 1,
        );
      },
      (bundle: ReturnType<typeof createLiveTestBundle>) => {
        bundle.entities[0]!.attributes = {
          ["k".repeat(CANDIDATE_BUNDLE_LIMITS.identifierCharacters + 1)]: true,
        };
      },
      (bundle: ReturnType<typeof createLiveTestBundle>) => {
        bundle.entities[0]!.attributes = {
          note: "x".repeat(CANDIDATE_BUNDLE_LIMITS.scalarStringCharacters + 1),
        };
      },
    ];

    for (const mutate of mutations) {
      const bundle = createLiveTestBundle();
      mutate(bundle);
      expectGroundingError(
        () =>
          validateCandidateBundleGrounding(createLiveTestDocument(), bundle),
        "AI_OUTPUT_LIMIT_EXCEEDED",
      );
    }
  });
});
