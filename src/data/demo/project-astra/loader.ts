import candidate01Json from "./candidates/01-astra-foundation.candidates.json";
import candidate02Json from "./candidates/02-nova-archive-revision.candidates.json";
import candidate03Json from "./candidates/03-unknown-nova-log.candidates.json";
import candidate04Json from "./candidates/04-quiet-prism-card.candidates.json";
import expectedInsightsJson from "./expected/expected-insights.json";
import finalKnowledgeJson from "./expected/final-knowledge.json";
import manifestJson from "./fixture-manifest.json";
import source01 from "./sources/01-astra-foundation.md?raw";
import source02 from "./sources/02-nova-archive-revision.md?raw";
import source03 from "./sources/03-unknown-nova-log.md?raw";
import source04 from "./sources/04-quiet-prism-card.md?raw";

import {
  candidateBundleSchema,
  type CandidateBundle,
} from "../../../core/candidates/candidate";
import {
  knowledgeInsightsSchema,
  type KnowledgeInsights,
} from "../../../core/insights/knowledgeInsights";
import {
  knowledgeStateSchema,
  type KnowledgeState,
} from "../../../core/knowledge/knowledgeState";
import type { Sha256Hasher } from "../../../core/shared/sha256";
import { ProjectAstraFixtureError } from "./errors";
import {
  parseProjectAstraFixtureManifest,
  type ProjectAstraFixtureManifest,
} from "./fixtureManifest";

export interface ProjectAstraSourceFixture {
  order: number;
  fileName: string;
  format: "markdown";
  mediaType: "text/markdown";
  contentSha256: string;
  documentId: string;
  reviewSessionId: string;
  content: string;
  candidateBundle: CandidateBundle;
}

export interface ProjectAstraFixture {
  manifest: ProjectAstraFixtureManifest;
  sources: ProjectAstraSourceFixture[];
  expectedKnowledge: KnowledgeState;
  expectedInsights: KnowledgeInsights;
}

const manifest = parseProjectAstraFixtureManifest(manifestJson);
const sourceContents = [source01, source02, source03, source04] as const;
const candidateBundles = [
  candidateBundleSchema.parse(candidate01Json),
  candidateBundleSchema.parse(candidate02Json),
  candidateBundleSchema.parse(candidate03Json),
  candidateBundleSchema.parse(candidate04Json),
] as const;
const expectedKnowledge = knowledgeStateSchema.parse(finalKnowledgeJson);
const expectedInsights = knowledgeInsightsSchema.parse(expectedInsightsJson);

const sources = manifest.sourceFiles.map((source, index) => {
  const content = sourceContents[index];
  const candidateBundle = candidateBundles[index];
  if (content === undefined || candidateBundle === undefined) {
    throw new ProjectAstraFixtureError("CANDIDATE_DOCUMENT_ID_MISMATCH");
  }
  if (candidateBundle.documentId !== source.documentId) {
    throw new ProjectAstraFixtureError("CANDIDATE_DOCUMENT_ID_MISMATCH");
  }

  return {
    ...source,
    content,
    candidateBundle,
  };
});

const fixture: ProjectAstraFixture = {
  manifest,
  sources,
  expectedKnowledge,
  expectedInsights,
};

export function loadProjectAstraFixture(): ProjectAstraFixture {
  return structuredClone(fixture);
}

export async function assertProjectAstraSourceHashes(
  input: ProjectAstraFixture,
  hasher: Sha256Hasher,
): Promise<void> {
  for (const source of input.sources) {
    const actual = await hasher.hashUtf8(source.content);
    if (actual !== source.contentSha256) {
      throw new ProjectAstraFixtureError("SOURCE_HASH_MISMATCH");
    }
  }
}
