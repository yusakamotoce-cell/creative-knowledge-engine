import { describe, expect, it } from "vitest";

import { candidateBundleSchema } from "../../../core/candidates/candidate";
import { knowledgeInsightsSchema } from "../../../core/insights";
import { knowledgeStateSchema } from "../../../core/knowledge";
import { WebCryptoSha256Hasher } from "../../../core/shared/sha256";
import { parseProjectAstraFixtureManifest } from "./fixtureManifest";
import {
  assertProjectAstraSourceHashes,
  loadProjectAstraFixture,
} from "./loader";

const expectedSourceContents = [
  "# Astra Survey Corps Foundation Briefing\n\nNova Arclight, known as Nova, is a 17-year-old celestial cartographer and a member of the Astra Survey Corps.\n\nNova carries the silver Aster Compass.\n\nAt the First Light Briefing, Nova reports a repeating signal detected at Northstar Observatory.\n",
  "# Nova Archive Revision\n\nA later archive lists Nova as 18 years old and confirms that Nova remains a member of the Astra Survey Corps.\n\nThe archive spells the observation site as “North Star Observatory.” The creator's canon name is “Northstar Observatory.”\n",
  "# Unknown NOVA Field Log\n\nA masked operator signed the field log as “ＮＯＶＡ.”\n\nThe operator was present at the First Light Briefing.\n\nThe archive cannot confirm that this operator is Nova Arclight.\n",
  "# Quiet Prism Inventory Card\n\nThe inventory lists an item named Quiet Prism.\n\nNo owner, location, or known use is recorded.\n\nA penciled margin says “Royal Key?”, but this is only a guess.\n\nA second note claims that the Quiet Prism points toward an Outer Gate, but no such location has been established in the archive.\n",
] as const;

describe("Project Astra fixture loader", () => {
  it("loads the four fixed source Markdown documents verbatim", () => {
    const fixture = loadProjectAstraFixture();

    expect(fixture.sources.map((source) => source.content)).toEqual(
      expectedSourceContents,
    );
  });

  it("keeps every source BOM-free, LF-only and with one final newline", () => {
    const fixture = loadProjectAstraFixture();

    for (const source of fixture.sources) {
      expect(source.content.startsWith("\uFEFF")).toBe(false);
      expect(source.content).not.toContain("\r");
      expect(source.content.endsWith("\n")).toBe(true);
      expect(source.content.endsWith("\n\n")).toBe(false);
    }
  });

  it("loads four Schema-valid Candidate Bundles with matching document IDs", () => {
    const fixture = loadProjectAstraFixture();

    expect(fixture.sources).toHaveLength(4);
    for (const source of fixture.sources) {
      expect(candidateBundleSchema.parse(source.candidateBundle)).toEqual(
        source.candidateBundle,
      );
      expect(source.candidateBundle.documentId).toBe(source.documentId);
    }
  });

  it("gives every Relationship Candidate exactly one in-source SourceRef", () => {
    const fixture = loadProjectAstraFixture();

    for (const source of fixture.sources) {
      for (const relationship of source.candidateBundle.relationships) {
        expect(relationship.sourceRefs).toHaveLength(1);
        expect(relationship.sourceRefs[0]?.documentId).toBe(source.documentId);
        expect(source.content).toContain(
          relationship.sourceRefs[0]?.excerpt ?? "missing excerpt",
        );
      }
    }
  });

  it("uses an empty aliases array for cand-astra-002-nova", () => {
    const fixture = loadProjectAstraFixture();
    const nova = fixture.sources[1]?.candidateBundle.entities.find(
      (candidate) => candidate.candidateId === "cand-astra-002-nova",
    );

    expect(nova?.aliases).toEqual([]);
  });

  it("matches every manifest hash against the raw source content", async () => {
    const fixture = loadProjectAstraFixture();

    await expect(
      assertProjectAstraSourceHashes(fixture, new WebCryptoSha256Hasher()),
    ).resolves.toBeUndefined();
  });

  it("rejects a source hash mismatch", async () => {
    const fixture = loadProjectAstraFixture();
    const source = fixture.sources[0];
    if (source === undefined) throw new Error("missing source");
    source.content += "changed";

    await expect(
      assertProjectAstraSourceHashes(fixture, new WebCryptoSha256Hasher()),
    ).rejects.toMatchObject({ code: "SOURCE_HASH_MISMATCH" });
  });

  it("validates both golden files with strict Schemas", () => {
    const fixture = loadProjectAstraFixture();

    expect(knowledgeStateSchema.parse(fixture.expectedKnowledge)).toEqual(
      fixture.expectedKnowledge,
    );
    expect(knowledgeInsightsSchema.parse(fixture.expectedInsights)).toEqual(
      fixture.expectedInsights,
    );
  });

  it("returns detached data on every load", () => {
    const first = loadProjectAstraFixture();
    const second = loadProjectAstraFixture();
    const firstSource = first.sources[0];
    const firstEntity = firstSource?.candidateBundle.entities[0];
    if (firstSource === undefined || firstEntity === undefined) {
      throw new Error("missing fixture data");
    }
    firstSource.fileName = "changed.md";
    firstEntity.aliases.push("Changed");

    expect(second.sources[0]?.fileName).toBe("01-astra-foundation.md");
    expect(second.sources[0]?.candidateBundle.entities[0]?.aliases).toEqual([
      "Nova",
    ]);
  });

  it("rejects unknown manifest fields", () => {
    const manifest = loadProjectAstraFixture().manifest;

    expect(() =>
      parseProjectAstraFixtureManifest({ ...manifest, unknown: true }),
    ).toThrow();
  });

  it("rejects duplicate manifest identifiers", () => {
    const manifest = loadProjectAstraFixture().manifest;
    const sourceFiles = structuredClone(manifest.sourceFiles);
    const first = sourceFiles[0];
    const second = sourceFiles[1];
    if (first === undefined || second === undefined) {
      throw new Error("missing fixture data");
    }
    second.documentId = first.documentId;

    expect(() =>
      parseProjectAstraFixtureManifest({ ...manifest, sourceFiles }),
    ).toThrow();
  });

  it("rejects manifest files outside fixed 1-through-4 order", () => {
    const manifest = loadProjectAstraFixture().manifest;
    const sourceFiles = structuredClone(manifest.sourceFiles);
    const first = sourceFiles[0];
    const second = sourceFiles[1];
    if (first === undefined || second === undefined) {
      throw new Error("missing fixture data");
    }
    first.order = 2;
    second.order = 1;

    expect(() =>
      parseProjectAstraFixtureManifest({ ...manifest, sourceFiles }),
    ).toThrow();
  });
});
