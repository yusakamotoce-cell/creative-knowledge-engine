import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type { VideoStateName } from "./types.js";

const stateFileNames: Record<VideoStateName, string> = {
  empty: "00_empty.json",
  doc1EntityReview: "01_doc1_entity_review.json",
  doc2BeforeEdit: "02_doc2_before_edit.json",
  doc3DuplicateReview: "03_doc3_duplicate_review.json",
  doc4BlockedRelationship: "04_doc4_blocked_relationship.json",
  doc4ReadyToComplete: "05_doc4_ready_to_complete.json",
  finalKnowledge: "06_final_knowledge.json",
};

export interface VideoPaths {
  root: string;
  artifactRoot: string;
  clips: string;
  states: string;
  reports: string;
  clip(fileName: string): string;
  state(name: VideoStateName): string;
  report(fileName: string): string;
}

export function resolveVideoPaths(root = process.cwd()): VideoPaths {
  const artifactRoot = path.join(root, "artifacts", "video");
  const clips = path.join(artifactRoot, "clips");
  const states = path.join(artifactRoot, "states");
  const reports = path.join(artifactRoot, "reports");

  return {
    root,
    artifactRoot,
    clips,
    states,
    reports,
    clip: (fileName) => path.join(clips, fileName),
    state: (name) => path.join(states, stateFileNames[name]),
    report: (fileName) => path.join(reports, fileName),
  };
}

export async function ensureVideoDirectories(paths: VideoPaths): Promise<void> {
  await Promise.all([
    mkdir(paths.clips, { recursive: true }),
    mkdir(paths.states, { recursive: true }),
    mkdir(paths.reports, { recursive: true }),
  ]);
}
