import { describe, expect, it } from "vitest";

import { createReviewSession } from "../../core/review";
import type { ReviewSession } from "../../core/review";
import { SequenceIdGenerator } from "../../core/shared/idGenerator";
import { createEmptyStorageSnapshot, type StorageSnapshot } from "../../core/storage";
import { loadProjectAstraFixture, runProjectAstraFixture } from "../../data/demo/project-astra";
import {
  deriveProjectAstraProgress,
  getNextProjectAstraStep,
  hasNonProjectAstraData,
  isEmptyWorkspace,
} from "./projectAstraProgress";

const fixture = loadProjectAstraFixture();

function snapshotWithFirstSession(
  phase: ReviewSession["phase"],
  applied = false,
): StorageSnapshot {
  const source = fixture.sources[0];
  if (source === undefined) throw new Error("missing fixture source");
  const session = createReviewSession(
    {
      bundle: source.candidateBundle,
      initialKnowledge: { entities: [], relationships: [] },
      baseKnowledgeRevision: 0,
    },
    { idGenerator: new SequenceIdGenerator([source.reviewSessionId]) },
  );
  const phasedSession: ReviewSession = { ...session, phase };
  const snapshot = createEmptyStorageSnapshot();
  return {
    ...snapshot,
    knowledgeRevision: applied ? 1 : 0,
    importedDocuments: [
      {
        id: source.documentId,
        sourceKind: "file",
        format: "markdown",
        fileName: source.fileName,
        mediaType: source.mediaType,
        content: source.content,
        contentSha256: source.contentSha256,
        importedAt: "2026-07-16T00:00:00.000Z",
      },
    ],
    importRegistry: {
      entries: [
        {
          contentSha256: source.contentSha256,
          documentId: source.documentId,
          firstImportedAt: "2026-07-16T00:00:00.000Z",
        },
      ],
    },
    reviewSessions: [phasedSession],
    reviewApplications: applied
      ? [
          {
            reviewSessionId: session.id,
            appliedAt: "2026-07-16T00:10:00.000Z",
            fromKnowledgeRevision: 0,
            toKnowledgeRevision: 1,
          },
        ]
      : [],
  };
}

describe("Project Astra progress", () => {
  it("marks all four documents not imported in an empty workspace", () => {
    const progress = deriveProjectAstraProgress(createEmptyStorageSnapshot(), fixture);
    expect(progress.map((item) => item.status)).toEqual([
      "not_imported",
      "not_imported",
      "not_imported",
      "not_imported",
    ]);
    expect(getNextProjectAstraStep(createEmptyStorageSnapshot(), fixture)).toMatchObject({
      kind: "import",
      source: { documentId: "astra-doc-001" },
    });
  });

  it.each([
    ["entities", "entity_review"],
    ["relationships", "relationship_review"],
    ["complete", "complete_not_applied"],
  ] as const)("maps %s phase to %s", (phase, status) => {
    const snapshot = snapshotWithFirstSession(phase);
    expect(deriveProjectAstraProgress(snapshot, fixture)[0]?.status).toBe(status);
    expect(getNextProjectAstraStep(snapshot, fixture)).toEqual({
      kind: "review",
      sessionId: "review-astra-001",
    });
  });

  it("marks an applied Session and advances only to Document 02", () => {
    const snapshot = snapshotWithFirstSession("complete", true);
    const progress = deriveProjectAstraProgress(snapshot, fixture);
    expect(progress[0]?.status).toBe("applied");
    expect(getNextProjectAstraStep(snapshot, fixture)).toMatchObject({
      kind: "import",
      source: { documentId: "astra-doc-002" },
    });
  });

  it("reports completion for the final Project Astra Snapshot", async () => {
    const result = await runProjectAstraFixture();
    expect(deriveProjectAstraProgress(result.snapshot, fixture).map((item) => item.status)).toEqual([
      "applied",
      "applied",
      "applied",
      "applied",
    ]);
    expect(getNextProjectAstraStep(result.snapshot, fixture)).toEqual({ kind: "complete" });
  });

  it("distinguishes empty, Project Astra, and non-Demo workspaces", async () => {
    const empty = createEmptyStorageSnapshot();
    expect(isEmptyWorkspace(empty)).toBe(true);
    expect(hasNonProjectAstraData(empty, fixture)).toBe(false);

    const completed = await runProjectAstraFixture();
    expect(hasNonProjectAstraData(completed.snapshot, fixture)).toBe(false);
    expect(
      hasNonProjectAstraData(
        {
          ...empty,
          knowledge: {
            entities: [{ ...fixture.expectedKnowledge.entities[0]!, id: "other-entity" }],
            relationships: [],
          },
        },
        fixture,
      ),
    ).toBe(true);
  });
});
