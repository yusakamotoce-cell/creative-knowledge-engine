import type { Clock } from "../../core/shared/clock";
import type { IdGenerator } from "../../core/shared/idGenerator";
import type { Sha256Hasher } from "../../core/shared/sha256";
import type { ExtractionAdapter } from "../../core/import/extractionAdapter";
import type { StorageAdapter, StorageSnapshot } from "../../core/storage";
import type { EntitySearchFilters } from "../../core/search";
import type { KnowledgeGraphFilters } from "../../core/graph";
import type { ProjectAstraFixture } from "../../data/demo/project-astra";
import type { FileDownloadAdapter } from "../download/fileDownloadAdapter";

export type AppView =
  | "home"
  | "import"
  | "review"
  | "knowledge"
  | "search"
  | "graph";

export type UiMessage =
  | { kind: "success"; text: string }
  | { kind: "info"; text: string }
  | { kind: "warning"; text: string };

export interface UiError {
  code: string;
  title: string;
  detail: string;
}

export type ResetIntent = "empty" | "demo" | null;

export interface ApplicationDependencies {
  storage: StorageAdapter;
  extractionAdapter: ExtractionAdapter;
  hasher: Sha256Hasher;
  idGenerator: IdGenerator;
  clock: Clock;
  projectAstra: ProjectAstraFixture;
  fileDownloadAdapter: FileDownloadAdapter;
  exportDateProvider(): Date;
  createProjectAstraIdGenerator(snapshot: StorageSnapshot): IdGenerator;
  createProjectAstraClock(snapshot: StorageSnapshot): Clock;
}

export interface ApplicationControllerState {
  status: "loading" | "ready" | "error";
  view: AppView;
  snapshot: StorageSnapshot | null;
  activeReviewSessionId: string | null;
  selectedEntityId: string | null;
  selectedRelationshipId: string | null;
  searchQuery: string;
  searchFilters: EntitySearchFilters;
  graphFilters: KnowledgeGraphFilters;
  graphRelationTypesFollowAll: boolean;
  message: UiMessage | null;
  error: UiError | null;
  isBusy: boolean;
  resetIntent: ResetIntent;
}
