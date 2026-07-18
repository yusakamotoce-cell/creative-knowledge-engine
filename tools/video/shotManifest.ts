import type { VideoShotDefinition } from "./types.js";

export const TARGET_VIDEO_DURATION_MS = 165_000;

export const videoShotManifest = [
  {
    id: "01_title_problem",
    fileName: "01_title_problem.webm",
    targetDurationMs: 7_000,
    sourceState: "generated-card",
    selected: true,
  },
  {
    id: "02_duplicate_conflict_problem",
    fileName: "02_duplicate_conflict_problem.webm",
    targetDurationMs: 11_000,
    sourceState: "final-knowledge",
    selected: true,
  },
  {
    id: "03_home_intro",
    fileName: "03_home_intro.webm",
    targetDurationMs: 10_000,
    sourceState: "empty",
    selected: true,
  },
  {
    id: "04_import_astra",
    fileName: "04_import_astra.webm",
    targetDurationMs: 12_000,
    sourceState: "empty",
    selected: true,
  },
  {
    id: "05_accept_entity",
    fileName: "05_accept_entity.webm",
    targetDurationMs: 13_000,
    sourceState: "doc1-entity-review",
    chapter: {
      title: "Human review before canon",
      description: "The Names Between Stars · Fixture Mode",
    },
    selected: true,
  },
  {
    id: "06_edit_merge",
    fileName: "06_edit_merge.webm",
    targetDurationMs: 12_000,
    sourceState: "doc2-before-edit",
    selected: true,
  },
  {
    id: "07_duplicate_accept_new",
    fileName: "07_duplicate_accept_new.webm",
    targetDurationMs: 12_000,
    sourceState: "doc3-duplicate-review",
    selected: true,
  },
  {
    id: "08_blocked_relationship",
    fileName: "08_blocked_relationship.webm",
    targetDurationMs: 11_000,
    sourceState: "doc4-blocked-relationship",
    selected: true,
  },
  {
    id: "09_complete_apply",
    fileName: "09_complete_apply.webm",
    targetDurationMs: 8_000,
    sourceState: "doc4-ready-to-complete",
    selected: true,
  },
  {
    id: "10_insights",
    fileName: "10_insights.webm",
    targetDurationMs: 12_000,
    sourceState: "final-knowledge",
    selected: true,
  },
  {
    id: "11_search",
    fileName: "11_search.webm",
    targetDurationMs: 10_000,
    sourceState: "final-knowledge",
    selected: true,
  },
  {
    id: "12_graph",
    fileName: "12_graph.webm",
    targetDurationMs: 11_000,
    sourceState: "final-knowledge",
    selected: true,
  },
  {
    id: "13_export",
    fileName: "13_export.webm",
    targetDurationMs: 10_000,
    sourceState: "final-knowledge",
    selected: true,
  },
  {
    id: "14_live_ai_success",
    fileName: "14_live_ai_success.webm",
    targetDurationMs: 13_000,
    sourceState: "live-ai-empty",
    liveAiVariant: "success",
    selected: true,
  },
  {
    id: "15_codex_finish",
    fileName: "15_codex_finish.webm",
    targetDurationMs: 13_000,
    sourceState: "generated-card",
    selected: true,
  },
] as const satisfies readonly VideoShotDefinition[];

export function totalSelectedDurationMs(
  manifest: readonly VideoShotDefinition[] = videoShotManifest,
): number {
  return manifest
    .filter((shot) => shot.selected)
    .reduce((total, shot) => total + shot.targetDurationMs, 0);
}

export function getVideoShot(id: string): VideoShotDefinition {
  const shot = videoShotManifest.find((candidate) => candidate.id === id);
  if (shot === undefined) {
    throw new Error(`Unknown video shot: ${id}`);
  }
  return shot;
}
