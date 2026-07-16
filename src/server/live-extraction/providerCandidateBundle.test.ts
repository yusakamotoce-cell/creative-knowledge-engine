import { describe, expect, it } from "vitest";

import { candidateBundleSchema } from "../../core/candidates/candidate";
import { createLiveTestProviderBundle } from "../../test/liveExtractionTestSupport";
import {
  convertProviderCandidateBundle,
  ProviderCandidateBundleConversionError,
  providerCandidateBundleSchema,
} from "./providerCandidateBundle";

function expectConversionError(
  input: unknown,
  code: ProviderCandidateBundleConversionError["code"],
): void {
  expect(() => convertProviderCandidateBundle(input)).toThrowError(
    expect.objectContaining({
      name: "ProviderCandidateBundleConversionError",
      code,
    }),
  );
}

describe("OpenAI provider Candidate Bundle conversion", () => {
  it("converts attribute arrays to the existing domain Record", () => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [
      { key: "role", value: "cartographer" },
      { key: "age", value: 31 },
      { key: "active", value: true },
    ];

    const converted = convertProviderCandidateBundle(providerBundle);

    expect(converted.entities[0]!.attributes).toEqual({
      role: "cartographer",
      age: 31,
      active: true,
    });
    expect(candidateBundleSchema.safeParse(converted).success).toBe(true);
  });

  it.each([
    ["string", "cartographer"],
    ["number", 31],
    ["boolean", false],
  ] as const)("preserves a %s ScalarValue", (_name, value) => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [{ key: "value", value }];

    expect(
      convertProviderCandidateBundle(providerBundle).entities[0]!.attributes,
    ).toEqual({ value });
  });

  it("rejects duplicate raw attribute keys", () => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [
      { key: "Role", value: "cartographer" },
      { key: "Role", value: "navigator" },
    ];

    expectConversionError(providerBundle, "DUPLICATE_RAW_ATTRIBUTE_KEY");
  });

  it.each([
    ["case", "Display Name", "display name"],
    ["NFKC", "ｒｏｌｅ", "role"],
    ["whitespace", "display   name", "display name"],
  ])("rejects a %s collision after normalizeAttributeKey", (_name, a, b) => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [
      { key: a, value: "first" },
      { key: b, value: "second" },
    ];

    expectConversionError(
      providerBundle,
      "NORMALIZED_ATTRIBUTE_KEY_COLLISION",
    );
  });

  it.each(["", "   ", "　"])("rejects an empty normalized key %j", (key) => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [{ key, value: true }];

    expectConversionError(providerBundle, "EMPTY_ATTRIBUTE_KEY");
  });

  it.each([null, { nested: true }, ["not", "scalar"], Number.NaN])(
    "rejects non-ScalarValue %j",
    (value) => {
      const providerBundle = createLiveTestProviderBundle() as unknown as {
        entities: Array<{ attributes: Array<{ key: string; value: unknown }> }>;
      };
      providerBundle.entities[0]!.attributes = [{ key: "invalid", value }];

      expectConversionError(
        providerBundle,
        "INVALID_PROVIDER_CANDIDATE_BUNDLE",
      );
    },
  );

  it("keeps raw keys in the domain Candidate while using normalization only for collision checks", () => {
    const providerBundle = createLiveTestProviderBundle();
    providerBundle.entities[0]!.attributes = [
      { key: "Display Name", value: "Mira" },
    ];

    expect(
      convertProviderCandidateBundle(providerBundle).entities[0]!.attributes,
    ).toEqual({ "Display Name": "Mira" });
  });

  it("strictly rejects unknown provider DTO fields", () => {
    const providerBundle = {
      ...createLiveTestProviderBundle(),
      unexpected: true,
    };

    expect(providerCandidateBundleSchema.safeParse(providerBundle).success).toBe(
      false,
    );
    expectConversionError(
      providerBundle,
      "INVALID_PROVIDER_CANDIDATE_BUNDLE",
    );
  });

  it("does not mutate the provider DTO", () => {
    const providerBundle = createLiveTestProviderBundle();
    const before = structuredClone(providerBundle);

    convertProviderCandidateBundle(providerBundle);

    expect(providerBundle).toEqual(before);
  });
});
