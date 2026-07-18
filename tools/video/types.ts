export type VideoSourceState =
  | "generated-card"
  | "empty"
  | "doc1-entity-review"
  | "doc2-before-edit"
  | "doc3-duplicate-review"
  | "doc4-blocked-relationship"
  | "doc4-ready-to-complete"
  | "final-knowledge"
  | "live-ai-empty";

export interface VideoShotDefinition {
  id: string;
  fileName: string;
  targetDurationMs: number;
  sourceState: VideoSourceState;
  chapter?: {
    title: string;
    description?: string;
  };
  liveAiVariant?: "success" | "fallback";
  selected: boolean;
}

export type VideoStateName =
  | "empty"
  | "doc1EntityReview"
  | "doc2BeforeEdit"
  | "doc3DuplicateReview"
  | "doc4BlockedRelationship"
  | "doc4ReadyToComplete"
  | "finalKnowledge";
