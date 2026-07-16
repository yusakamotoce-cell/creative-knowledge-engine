import { useCallback, useEffect, useRef, useState } from "react";

import {
  applyCompletedReviewSession,
  initializeApplication,
  resetWorkspace,
  saveReviewSession,
} from "../../core/application";
import type { EntityCandidateEdit } from "../../core/review/entityReview";
import {
  acceptEntityCandidate,
  acceptRelationshipCandidate,
  advanceToRelationshipReview,
  completeReviewSession,
  editEntityCandidate,
  mergeEntityCandidate,
  rejectEntityCandidate,
  rejectRelationshipCandidate,
  setRelationshipManualResolution,
} from "../../core/review";
import type { ReviewSession } from "../../core/review/types";
import type { ImportDocumentInput } from "../../core/import";
import { importDocument } from "../../core/import";
import { ApplicationDomainError } from "../../core/application/errors";
import {
  createKnowledgeExport,
  serializeKnowledgeExport,
} from "../../core/export";
import {
  graphEntityTypeLanes,
  projectKnowledgeGraph,
} from "../../core/graph";
import type { KnowledgeGraphFilters } from "../../core/graph";
import type { EntitySearchFilters } from "../../core/search";
import type { StorageSnapshot } from "../../core/storage";
import { createKnowledgeExportFileName } from "../download/fileDownloadAdapter";
import { mapErrorToUi } from "./errorMapping";
import {
  getNextProjectAstraStep,
  hasNonProjectAstraData,
} from "./projectAstraProgress";
import type {
  AppView,
  ApplicationControllerState,
  ApplicationDependencies,
  ResetIntent,
} from "./types";

export interface ApplicationControllerActions {
  initialize(): Promise<void>;
  navigate(view: AppView): void;
  startOrResumeProjectAstra(): Promise<void>;
  importNextProjectAstraDocument(): Promise<void>;
  importArbitraryDocument(input: ImportDocumentInput): Promise<void>;
  openReviewSession(id: string): void;
  resumeWorkspace(): void;
  editEntityCandidate(candidateId: string, edit: EntityCandidateEdit): Promise<void>;
  acceptEntityCandidate(candidateId: string): Promise<void>;
  mergeEntityCandidate(
    candidateId: string,
    targetEntityId: string,
    resolution: { name?: string; description?: string },
  ): Promise<void>;
  rejectEntityCandidate(candidateId: string): Promise<void>;
  advanceToRelationships(): Promise<void>;
  setManualRelationshipResolution(
    candidateId: string,
    resolution: { fromEntityId?: string; toEntityId?: string },
  ): Promise<void>;
  acceptRelationshipCandidate(candidateId: string): Promise<void>;
  rejectRelationshipCandidate(candidateId: string): Promise<void>;
  completeAndApplyReviewSession(): Promise<void>;
  setSearchQuery(query: string): void;
  setSearchFilters(filters: EntitySearchFilters): void;
  setGraphFilters(filters: KnowledgeGraphFilters): void;
  selectEntity(id: string | null): void;
  selectRelationship(id: string | null): void;
  exportKnowledge(): Promise<void>;
  requestReset(intent: Exclude<ResetIntent, null>): void;
  cancelReset(): void;
  confirmReset(): Promise<void>;
  clearFeedback(): void;
}

export interface ApplicationController {
  state: ApplicationControllerState;
  actions: ApplicationControllerActions;
}

const initialState: ApplicationControllerState = {
  status: "loading",
  view: "home",
  snapshot: null,
  activeReviewSessionId: null,
  selectedEntityId: null,
  selectedRelationshipId: null,
  searchQuery: "",
  searchFilters: { entityTypes: [...graphEntityTypeLanes], tags: [] },
  graphFilters: {
    entityTypes: [...graphEntityTypeLanes],
    relationTypes: [],
    includeOrphans: true,
  },
  graphRelationTypesFollowAll: true,
  message: null,
  error: null,
  isBusy: false,
  resetIntent: null,
};

export function graphFiltersForSnapshot(
  current: Pick<
    ApplicationControllerState,
    "graphFilters" | "graphRelationTypesFollowAll"
  >,
  snapshot: StorageSnapshot,
): KnowledgeGraphFilters {
  const nextRelationTypes = projectKnowledgeGraph(
    snapshot.knowledge,
  ).availableRelationTypes;
  return {
    ...current.graphFilters,
    entityTypes: [...current.graphFilters.entityTypes],
    relationTypes: current.graphRelationTypesFollowAll
      ? nextRelationTypes
      : current.graphFilters.relationTypes.filter((relationType) =>
          nextRelationTypes.includes(relationType),
        ),
  };
}

function requireSnapshot(
  snapshot: StorageSnapshot | null,
): StorageSnapshot {
  if (snapshot === null) {
    throw new ApplicationDomainError("REVIEW_SESSION_NOT_FOUND");
  }
  return snapshot;
}

function requireSession(
  snapshot: StorageSnapshot,
  sessionId: string | null,
): ReviewSession {
  const session = snapshot.reviewSessions.find(
    (candidate) => candidate.id === sessionId,
  );
  if (session === undefined) {
    throw new ApplicationDomainError(
      "REVIEW_SESSION_NOT_FOUND",
      sessionId === null ? {} : { reviewSessionId: sessionId },
    );
  }
  return session;
}

export function useApplicationController(
  dependencies: ApplicationDependencies,
): ApplicationController {
  const [state, setState] = useState<ApplicationControllerState>(initialState);
  const initializeStarted = useRef(false);
  const busy = useRef(false);

  const initialize = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: "loading",
      error: null,
      message: null,
    }));
    try {
      const application = await initializeApplication({
        storage: dependencies.storage,
      });
      setState((current) => ({
        ...current,
        status: "ready",
        snapshot: application.snapshot,
        graphFilters: graphFiltersForSnapshot(current, application.snapshot),
        error: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        status: "error",
        error: mapErrorToUi(error),
      }));
    }
  }, [dependencies.storage]);

  useEffect(() => {
    if (initializeStarted.current) return;
    initializeStarted.current = true;
    void initialize();
  }, [initialize]);

  const runBusy = useCallback(async (operation: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    setState((current) => ({
      ...current,
      isBusy: true,
      error: null,
      message: null,
    }));
    try {
      await operation();
    } catch (error) {
      setState((current) => ({
        ...current,
        error: mapErrorToUi(error),
      }));
    } finally {
      busy.current = false;
      setState((current) => ({ ...current, isBusy: false }));
    }
  }, []);

  const importProjectAstraSource = useCallback(
    async (snapshot: StorageSnapshot, sourceIndex: number) => {
      const source = dependencies.projectAstra.sources[sourceIndex];
      if (source === undefined) return;
      const result = await importDocument(
        {
          sourceKind: "file",
          format: source.format,
          fileName: source.fileName,
          mediaType: source.mediaType,
          content: source.content,
        },
        {
          storage: dependencies.storage,
          extractionAdapter: dependencies.fixtureExtractionAdapter,
          hasher: dependencies.hasher,
          idGenerator: dependencies.createProjectAstraIdGenerator(snapshot),
          clock: dependencies.createProjectAstraClock(snapshot),
        },
      );

      const session =
        result.status === "imported"
          ? result.reviewSession
          : result.existingReviewSession;
      if (session === null) {
        throw new ApplicationDomainError("REVIEW_SESSION_NOT_FOUND");
      }
      setState((current) => ({
        ...current,
        status: "ready",
        snapshot: result.snapshot,
        activeReviewSessionId: session.id,
        view: "review",
        message: {
          kind: "success",
          text: `${source.fileName}をImportしました。`,
        },
      }));
    },
    [dependencies],
  );

  const continueProjectAstra = useCallback(
    async (snapshot: StorageSnapshot) => {
      const next = getNextProjectAstraStep(
        snapshot,
        dependencies.projectAstra,
      );
      if (next.kind === "complete") {
        setState((current) => ({
          ...current,
          view: "knowledge",
          activeReviewSessionId: null,
          message: {
            kind: "success",
            text: "Project Astra Demoは完了しています。",
          },
        }));
        return;
      }
      if (next.kind === "review") {
        setState((current) => ({
          ...current,
          view: "review",
          activeReviewSessionId: next.sessionId,
          message: { kind: "info", text: "保存済みのReviewを再開します。" },
        }));
        return;
      }

      const sourceIndex = dependencies.projectAstra.sources.findIndex(
        (source) => source.documentId === next.source.documentId,
      );
      await importProjectAstraSource(snapshot, sourceIndex);
    },
    [dependencies.projectAstra, importProjectAstraSource],
  );

  const startOrResumeProjectAstra = useCallback(
    () =>
      runBusy(async () => {
        const snapshot = requireSnapshot(state.snapshot);
        if (hasNonProjectAstraData(snapshot, dependencies.projectAstra)) {
          setState((current) => ({
            ...current,
            resetIntent: "demo",
            message: {
              kind: "warning",
              text: "現在のWorkspaceを維持するか、Demo用に初期化してください。",
            },
          }));
          return;
        }
        await continueProjectAstra(snapshot);
      }),
    [continueProjectAstra, dependencies.projectAstra, runBusy, state.snapshot],
  );

  const importNextProjectAstraDocument = useCallback(
    () =>
      runBusy(async () => {
        const snapshot = requireSnapshot(state.snapshot);
        const next = getNextProjectAstraStep(
          snapshot,
          dependencies.projectAstra,
        );
        if (next.kind !== "import") {
          await continueProjectAstra(snapshot);
          return;
        }
        const sourceIndex = dependencies.projectAstra.sources.findIndex(
          (source) => source.documentId === next.source.documentId,
        );
        await importProjectAstraSource(snapshot, sourceIndex);
      }),
    [
      continueProjectAstra,
      dependencies.projectAstra,
      importProjectAstraSource,
      runBusy,
      state.snapshot,
    ],
  );

  const importArbitraryDocument = useCallback(
    (input: ImportDocumentInput) =>
      runBusy(async () => {
        const result = await importDocument(input, {
          storage: dependencies.storage,
          extractionAdapter: dependencies.liveExtractionAdapter,
          hasher: dependencies.hasher,
          idGenerator: dependencies.idGenerator,
          clock: dependencies.clock,
        });
        const session =
          result.status === "imported"
            ? result.reviewSession
            : result.existingReviewSession;
        setState((current) => ({
          ...current,
          snapshot: result.snapshot,
          activeReviewSessionId: session?.id ?? null,
          view: session === null ? "home" : "review",
          message: {
            kind: result.status === "imported" ? "success" : "info",
            text:
              result.status === "imported"
                ? "文書をImportしました。"
                : "同じ内容の文書はImport済みです。",
          },
        }));
      }),
    [dependencies, runBusy],
  );

  const updateActiveSession = useCallback(
    async (transform: (session: ReviewSession, snapshot: StorageSnapshot) => ReviewSession) => {
      const snapshot = requireSnapshot(state.snapshot);
      const session = requireSession(snapshot, state.activeReviewSessionId);
      const updated = transform(session, snapshot);
      const nextSnapshot = await saveReviewSession(session.id, updated, {
        storage: dependencies.storage,
      });
      setState((current) => ({
        ...current,
        snapshot: nextSnapshot,
        message: { kind: "success", text: "Reviewの進捗を保存しました。" },
      }));
    },
    [dependencies.storage, state.activeReviewSessionId, state.snapshot],
  );

  const sessionDependencies = useCallback(
    (snapshot: StorageSnapshot, session: ReviewSession) => {
      const isProjectAstra = dependencies.projectAstra.sources.some(
        (source) => source.reviewSessionId === session.id,
      );
      return isProjectAstra
        ? {
            idGenerator: dependencies.createProjectAstraIdGenerator(snapshot),
            clock: dependencies.createProjectAstraClock(snapshot),
          }
        : { idGenerator: dependencies.idGenerator, clock: dependencies.clock };
    },
    [dependencies],
  );

  const editEntity = useCallback(
    (candidateId: string, edit: EntityCandidateEdit) =>
      runBusy(() =>
        updateActiveSession((session) =>
          editEntityCandidate(session, candidateId, edit),
        ),
      ),
    [runBusy, updateActiveSession],
  );

  const acceptEntity = useCallback(
    (candidateId: string) =>
      runBusy(() =>
        updateActiveSession((session, snapshot) =>
          acceptEntityCandidate(
            session,
            candidateId,
            sessionDependencies(snapshot, session),
          ),
        ),
      ),
    [runBusy, sessionDependencies, updateActiveSession],
  );

  const mergeEntity = useCallback(
    (
      candidateId: string,
      targetEntityId: string,
      resolution: { name?: string; description?: string },
    ) =>
      runBusy(() =>
        updateActiveSession((session, snapshot) =>
          mergeEntityCandidate(session, candidateId, targetEntityId, resolution, {
            clock: sessionDependencies(snapshot, session).clock,
          }),
        ),
      ),
    [runBusy, sessionDependencies, updateActiveSession],
  );

  const rejectEntity = useCallback(
    (candidateId: string) =>
      runBusy(() =>
        updateActiveSession((session) =>
          rejectEntityCandidate(session, candidateId),
        ),
      ),
    [runBusy, updateActiveSession],
  );

  const advanceToRelationships = useCallback(
    () =>
      runBusy(() =>
        updateActiveSession((session) =>
          advanceToRelationshipReview(session),
        ),
      ),
    [runBusy, updateActiveSession],
  );

  const setManualResolution = useCallback(
    (
      candidateId: string,
      resolution: { fromEntityId?: string; toEntityId?: string },
    ) =>
      runBusy(() =>
        updateActiveSession((session) =>
          setRelationshipManualResolution(session, candidateId, resolution),
        ),
      ),
    [runBusy, updateActiveSession],
  );

  const acceptRelationship = useCallback(
    (candidateId: string) =>
      runBusy(() =>
        updateActiveSession((session, snapshot) =>
          acceptRelationshipCandidate(
            session,
            candidateId,
            sessionDependencies(snapshot, session),
          ),
        ),
      ),
    [runBusy, sessionDependencies, updateActiveSession],
  );

  const rejectRelationship = useCallback(
    (candidateId: string) =>
      runBusy(() =>
        updateActiveSession((session) =>
          rejectRelationshipCandidate(session, candidateId),
        ),
      ),
    [runBusy, updateActiveSession],
  );

  const completeAndApply = useCallback(
    () =>
      runBusy(async () => {
        let snapshot = requireSnapshot(state.snapshot);
        let session = requireSession(snapshot, state.activeReviewSessionId);

        if (session.phase === "relationships") {
          session = completeReviewSession(session);
          snapshot = await saveReviewSession(session.id, session, {
            storage: dependencies.storage,
          });
          setState((current) => ({ ...current, snapshot }));
        }

        const application = await applyCompletedReviewSession(
          { reviewSessionId: session.id },
          {
            storage: dependencies.storage,
            clock: sessionDependencies(snapshot, session).clock,
          },
        );
        snapshot = application.snapshot;
        const next = getNextProjectAstraStep(
          snapshot,
          dependencies.projectAstra,
        );
        setState((current) => ({
          ...current,
          snapshot,
          graphFilters: graphFiltersForSnapshot(current, snapshot),
          activeReviewSessionId: null,
          view: next.kind === "complete" ? "knowledge" : "import",
          message: {
            kind: application.status === "applied" ? "success" : "info",
            text:
              application.status === "applied"
                ? "Reviewを正本Knowledgeへ反映しました。"
                : "このReviewは反映済みです。",
          },
        }));
      }),
    [
      dependencies.projectAstra,
      dependencies.storage,
      runBusy,
      sessionDependencies,
      state.activeReviewSessionId,
      state.snapshot,
    ],
  );

  const confirmReset = useCallback(
    () =>
      runBusy(async () => {
        const intent = state.resetIntent;
        const snapshot = await resetWorkspace({ storage: dependencies.storage });
        setState((current) => ({
          ...current,
          snapshot,
          resetIntent: null,
          activeReviewSessionId: null,
          selectedEntityId: null,
          selectedRelationshipId: null,
          graphFilters: {
            ...current.graphFilters,
            relationTypes: [],
          },
          graphRelationTypesFollowAll: true,
          view: "home",
          message: { kind: "success", text: "Workspaceを初期化しました。" },
        }));
        if (intent === "demo") await importProjectAstraSource(snapshot, 0);
      }),
    [dependencies.storage, importProjectAstraSource, runBusy, state.resetIntent],
  );

  const exportKnowledge = useCallback(
    () =>
      runBusy(async () => {
        const snapshot = requireSnapshot(state.snapshot);
        const value = createKnowledgeExport(snapshot);
        const content = serializeKnowledgeExport(value);
        dependencies.fileDownloadAdapter.downloadText({
          fileName: createKnowledgeExportFileName(
            dependencies.exportDateProvider(),
          ),
          mediaType: "application/json",
          content,
        });
        setState((current) => ({
          ...current,
          message: {
            kind: "success",
            text: "Knowledge JSONをダウンロードしました。",
          },
        }));
      }),
    [dependencies, runBusy, state.snapshot],
  );

  const navigate = useCallback((view: AppView) => {
    setState((current) => ({ ...current, view }));
  }, []);

  const openReviewSession = useCallback(
    (id: string) => {
      const session = state.snapshot?.reviewSessions.find(
        (candidate) => candidate.id === id,
      );
      if (session === undefined) {
        setState((current) => ({
          ...current,
          error: mapErrorToUi(
            new ApplicationDomainError("REVIEW_SESSION_NOT_FOUND"),
          ),
        }));
        return;
      }
      setState((current) => ({
        ...current,
        activeReviewSessionId: id,
        view: "review",
      }));
    },
    [state.snapshot],
  );

  const resumeWorkspace = useCallback(() => {
    const snapshot = state.snapshot;
    if (snapshot === null) return;
    const session = snapshot.reviewSessions.find(
      (candidate) =>
        !snapshot.reviewApplications.some(
          (application) => application.reviewSessionId === candidate.id,
        ),
    );
    if (session !== undefined) {
      openReviewSession(session.id);
    } else if (snapshot.knowledge.entities.length > 0) {
      navigate("knowledge");
    } else {
      navigate("home");
    }
  }, [navigate, openReviewSession, state.snapshot]);

  const actions: ApplicationControllerActions = {
    initialize,
    navigate,
    startOrResumeProjectAstra,
    importNextProjectAstraDocument,
    importArbitraryDocument,
    openReviewSession,
    resumeWorkspace,
    editEntityCandidate: editEntity,
    acceptEntityCandidate: acceptEntity,
    mergeEntityCandidate: mergeEntity,
    rejectEntityCandidate: rejectEntity,
    advanceToRelationships,
    setManualRelationshipResolution: setManualResolution,
    acceptRelationshipCandidate: acceptRelationship,
    rejectRelationshipCandidate: rejectRelationship,
    completeAndApplyReviewSession: completeAndApply,
    setSearchQuery: (query) =>
      setState((current) => ({ ...current, searchQuery: query })),
    setSearchFilters: (filters) =>
      setState((current) => ({
        ...current,
        searchFilters: {
          ...(filters.entityTypes === undefined
            ? {}
            : { entityTypes: [...filters.entityTypes] }),
          ...(filters.tags === undefined ? {} : { tags: [...filters.tags] }),
        },
      })),
    setGraphFilters: (filters) =>
      setState((current) => {
        const availableRelationTypes =
          current.snapshot === null
            ? []
            : projectKnowledgeGraph(current.snapshot.knowledge)
                .availableRelationTypes;
        return {
          ...current,
          graphFilters: {
            entityTypes: [...filters.entityTypes],
            relationTypes: [...filters.relationTypes],
            includeOrphans: filters.includeOrphans,
          },
          graphRelationTypesFollowAll: availableRelationTypes.every(
            (relationType) => filters.relationTypes.includes(relationType),
          ),
        };
      }),
    selectEntity: (id) =>
      setState((current) => ({ ...current, selectedEntityId: id })),
    selectRelationship: (id) =>
      setState((current) => ({ ...current, selectedRelationshipId: id })),
    exportKnowledge,
    requestReset: (intent) =>
      setState((current) => ({ ...current, resetIntent: intent })),
    cancelReset: () =>
      setState((current) => ({ ...current, resetIntent: null })),
    confirmReset,
    clearFeedback: () =>
      setState((current) => ({ ...current, message: null, error: null })),
  };

  return { state, actions };
}
