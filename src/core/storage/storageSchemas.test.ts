import { describe, expect, it } from "vitest";

import {
  expectErrorCode,
  makeStorageSnapshot,
} from "../import/testSupport";
import type { ReviewSession } from "../review/types";
import { parseStorageSnapshot } from "./storageSchemas";

const appliedAt = "2026-07-16T10:00:00.000Z";

function cloneSession(
  session: ReviewSession,
  id: string,
): ReviewSession {
  return { ...structuredClone(session), id };
}

function makeAppliedSnapshot() {
  const snapshot = makeStorageSnapshot();
  snapshot.knowledgeRevision = 1;
  snapshot.reviewApplications = [
    {
      reviewSessionId: snapshot.reviewSessions[0]!.id,
      appliedAt,
      fromKnowledgeRevision: 0,
      toKnowledgeRevision: 1,
    },
  ];
  return snapshot;
}

describe("Step 4 Storage Snapshot Schema", () => {
  it("accepts the empty revision-zero snapshot with no applications", () => {
    const snapshot = makeStorageSnapshot();

    expect(parseStorageSnapshot(snapshot)).toEqual(snapshot);
    expect(snapshot.knowledgeRevision).toBe(0);
    expect(snapshot.reviewApplications).toEqual([]);
  });

  it("requires baseKnowledgeRevision on every Review Session", () => {
    const snapshot = makeStorageSnapshot() as unknown as {
      reviewSessions: Array<Record<string, unknown>>;
    };
    delete snapshot.reviewSessions[0]!.baseKnowledgeRevision;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });

  it.each([-1, 0.5])("rejects invalid knowledgeRevision %s", (revision) => {
    const snapshot = makeStorageSnapshot();
    snapshot.knowledgeRevision = revision;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });

  it.each([-1, 0.5])(
    "rejects invalid baseKnowledgeRevision %s",
    (revision) => {
      const snapshot = makeStorageSnapshot();
      snapshot.reviewSessions[0]!.baseKnowledgeRevision = revision;

      expectErrorCode(
        () => parseStorageSnapshot(snapshot),
        "INVALID_STORAGE_SNAPSHOT",
      );
    },
  );

  it("rejects duplicate application Session IDs", () => {
    const snapshot = makeAppliedSnapshot();
    snapshot.reviewApplications.push({
      ...snapshot.reviewApplications[0]!,
      fromKnowledgeRevision: 1,
      toKnowledgeRevision: 2,
    });
    snapshot.knowledgeRevision = 2;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "DUPLICATE_REVIEW_APPLICATION",
    );
  });

  it("rejects an application with a dangling Session ID", () => {
    const snapshot = makeAppliedSnapshot();
    snapshot.reviewApplications[0]!.reviewSessionId = "missing";

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "REVIEW_APPLICATION_DANGLING_SESSION",
    );
  });

  it("rejects a from/to revision difference other than one", () => {
    const snapshot = makeAppliedSnapshot();
    snapshot.reviewApplications[0]!.toKnowledgeRevision = 2;
    snapshot.knowledgeRevision = 2;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_REVIEW_APPLICATION_REVISION",
    );
  });

  it("rejects a broken application revision chain", () => {
    const snapshot = makeAppliedSnapshot();
    const second = cloneSession(snapshot.reviewSessions[0]!, "session-2");
    snapshot.reviewSessions.push(second);
    snapshot.reviewApplications.push({
      reviewSessionId: second.id,
      appliedAt,
      fromKnowledgeRevision: 2,
      toKnowledgeRevision: 3,
    });
    snapshot.knowledgeRevision = 3;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_REVIEW_APPLICATION_REVISION",
    );
  });

  it("rejects a final application revision that differs from Knowledge", () => {
    const snapshot = makeAppliedSnapshot();
    snapshot.knowledgeRevision = 2;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_REVIEW_APPLICATION_REVISION",
    );
  });

  it("rejects nonzero Knowledge revision when application history is empty", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.knowledgeRevision = 1;

    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_REVIEW_APPLICATION_REVISION",
    );
  });

  it("allows a migrated history to begin above revision zero", () => {
    const snapshot = makeStorageSnapshot();
    snapshot.knowledgeRevision = 3;
    snapshot.reviewApplications = [
      {
        reviewSessionId: snapshot.reviewSessions[0]!.id,
        appliedAt,
        fromKnowledgeRevision: 2,
        toKnowledgeRevision: 3,
      },
    ];

    expect(parseStorageSnapshot(snapshot)).toEqual(snapshot);
  });

  it("rejects unknown Snapshot and application fields", () => {
    expectErrorCode(
      () => parseStorageSnapshot({ ...makeStorageSnapshot(), version: 1 }),
      "INVALID_STORAGE_SNAPSHOT",
    );

    const snapshot = makeAppliedSnapshot() as unknown as {
      reviewApplications: Array<Record<string, unknown>>;
    };
    snapshot.reviewApplications[0]!.note = "unexpected";
    expectErrorCode(
      () => parseStorageSnapshot(snapshot),
      "INVALID_STORAGE_SNAPSHOT",
    );
  });
});
