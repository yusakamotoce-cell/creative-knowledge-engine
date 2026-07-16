import type { StorageSnapshot } from "../../core/storage";
import type {
  ProjectAstraFixture,
  ProjectAstraSourceFixture,
} from "../../data/demo/project-astra";

export type ProjectAstraDocumentStatus =
  | "not_imported"
  | "entity_review"
  | "relationship_review"
  | "complete_not_applied"
  | "applied";

export interface ProjectAstraDocumentProgress {
  order: number;
  documentId: string;
  reviewSessionId: string;
  fileName: string;
  status: ProjectAstraDocumentStatus;
  sessionId: string | null;
}

export type ProjectAstraNextStep =
  | { kind: "import"; source: ProjectAstraSourceFixture }
  | { kind: "review"; sessionId: string }
  | { kind: "complete" };

export function deriveProjectAstraProgress(
  snapshot: StorageSnapshot,
  fixture: ProjectAstraFixture,
): ProjectAstraDocumentProgress[] {
  return fixture.sources.map((source) => {
    const document = snapshot.importedDocuments.find(
      (candidate) => candidate.id === source.documentId,
    );
    const session = snapshot.reviewSessions.find(
      (candidate) => candidate.documentId === source.documentId,
    );
    const application =
      session === undefined
        ? undefined
        : snapshot.reviewApplications.find(
            (candidate) => candidate.reviewSessionId === session.id,
          );

    let status: ProjectAstraDocumentStatus = "not_imported";
    if (document !== undefined && session?.phase === "entities") {
      status = "entity_review";
    } else if (document !== undefined && session?.phase === "relationships") {
      status = "relationship_review";
    } else if (
      document !== undefined &&
      session?.phase === "complete" &&
      application === undefined
    ) {
      status = "complete_not_applied";
    } else if (document !== undefined && application !== undefined) {
      status = "applied";
    }

    return {
      order: source.order,
      documentId: source.documentId,
      reviewSessionId: source.reviewSessionId,
      fileName: source.fileName,
      status,
      sessionId: session?.id ?? null,
    };
  });
}

export function getNextProjectAstraStep(
  snapshot: StorageSnapshot,
  fixture: ProjectAstraFixture,
): ProjectAstraNextStep {
  const progress = deriveProjectAstraProgress(snapshot, fixture);
  const firstIncomplete = progress.find((item) => item.status !== "applied");

  if (firstIncomplete === undefined) return { kind: "complete" };
  if (firstIncomplete.status === "not_imported") {
    const source = fixture.sources.find(
      (candidate) => candidate.documentId === firstIncomplete.documentId,
    );
    if (source === undefined) return { kind: "complete" };
    return { kind: "import", source };
  }

  return firstIncomplete.sessionId === null
    ? { kind: "complete" }
    : { kind: "review", sessionId: firstIncomplete.sessionId };
}

export function isEmptyWorkspace(snapshot: StorageSnapshot): boolean {
  return (
    snapshot.knowledgeRevision === 0 &&
    snapshot.knowledge.entities.length === 0 &&
    snapshot.knowledge.relationships.length === 0 &&
    snapshot.reviewSessions.length === 0 &&
    snapshot.reviewApplications.length === 0 &&
    snapshot.importedDocuments.length === 0 &&
    snapshot.importRegistry.entries.length === 0
  );
}

export function hasNonProjectAstraData(
  snapshot: StorageSnapshot,
  fixture: ProjectAstraFixture,
): boolean {
  if (isEmptyWorkspace(snapshot)) return false;

  const documentIds = new Set(fixture.sources.map((source) => source.documentId));
  const sessionIds = new Set(
    fixture.sources.map((source) => source.reviewSessionId),
  );
  const entityIds = new Set(
    fixture.expectedKnowledge.entities.map((entity) => entity.id),
  );
  const relationshipIds = new Set(
    fixture.expectedKnowledge.relationships.map((relationship) => relationship.id),
  );

  return (
    snapshot.importedDocuments.some((document) => !documentIds.has(document.id)) ||
    snapshot.reviewSessions.some((session) => !sessionIds.has(session.id)) ||
    snapshot.reviewApplications.some(
      (application) => !sessionIds.has(application.reviewSessionId),
    ) ||
    snapshot.knowledge.entities.some((entity) => !entityIds.has(entity.id)) ||
    snapshot.knowledge.relationships.some(
      (relationship) => !relationshipIds.has(relationship.id),
    )
  );
}
