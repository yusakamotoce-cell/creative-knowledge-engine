import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  acceptEntityCandidate,
  acceptRelationshipCandidate,
  advanceToRelationshipReview,
} from "../../core/review";
import {
  createTestReviewSession,
  makeBundle,
  makeEntityCandidate,
  makeKnowledge,
  makeRelationship,
  makeRelationshipCandidate,
  timestampB,
} from "../../core/review/testSupport";
import { SequenceClock } from "../../core/shared/clock";
import { SequenceIdGenerator } from "../../core/shared/idGenerator";
import type { ApplicationControllerActions } from "../state/useApplicationController";
import { EntityEditForm } from "./EntityEditForm";
import { EntityReviewSection } from "./EntityReviewSection";
import { RelationshipReviewSection } from "./RelationshipReviewSection";

function createActions(
  overrides: Partial<ApplicationControllerActions> = {},
): ApplicationControllerActions {
  return {
    initialize: vi.fn(async () => undefined),
    navigate: vi.fn(),
    startOrResumeProjectAstra: vi.fn(async () => undefined),
    importNextProjectAstraDocument: vi.fn(async () => undefined),
    importArbitraryDocument: vi.fn(async () => undefined),
    openReviewSession: vi.fn(),
    resumeWorkspace: vi.fn(),
    editEntityCandidate: vi.fn(async () => undefined),
    acceptEntityCandidate: vi.fn(async () => undefined),
    mergeEntityCandidate: vi.fn(async () => undefined),
    rejectEntityCandidate: vi.fn(async () => undefined),
    advanceToRelationships: vi.fn(async () => undefined),
    setManualRelationshipResolution: vi.fn(async () => undefined),
    acceptRelationshipCandidate: vi.fn(async () => undefined),
    rejectRelationshipCandidate: vi.fn(async () => undefined),
    completeAndApplyReviewSession: vi.fn(async () => undefined),
    setSearchQuery: vi.fn(),
    setSearchFilters: vi.fn(),
    setGraphFilters: vi.fn(),
    selectEntity: vi.fn(),
    selectRelationship: vi.fn(),
    exportKnowledge: vi.fn(async () => undefined),
    requestReset: vi.fn(),
    cancelReset: vi.fn(),
    confirmReset: vi.fn(async () => undefined),
    clearFeedback: vi.fn(),
    ...overrides,
  };
}

function relationshipSession(
  candidate = makeRelationshipCandidate({
    fromRef: { name: "Unknown", entityType: "character" },
    toRef: { name: "Team", entityType: "organization" },
  }),
) {
  return advanceToRelationshipReview(
    createTestReviewSession({
      bundle: makeBundle({ entities: [], relationships: [candidate] }),
      initialKnowledge: makeKnowledge(),
    }),
  );
}

describe("Entity review UI", () => {
  it("preserves explicit ScalarValue types when editing attributes", () => {
    const onSave = vi.fn();
    render(
      <EntityEditForm
        candidate={makeEntityCandidate({
          attributes: { age: 17, confirmed: false },
        })}
        disabled={false}
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "属性を追加" }));
    const types = screen.getAllByLabelText("type");
    fireEvent.change(types[2] as HTMLElement, { target: { value: "boolean" } });
    fireEvent.change(screen.getAllByLabelText("value")[2] as HTMLElement, {
      target: { value: "true" },
    });
    fireEvent.change(screen.getAllByLabelText("key")[2] as HTMLElement, {
      target: { value: "active" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Editを保存" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: { age: 17, confirmed: false, active: true },
      }),
    );
    expect(screen.getByText(/candidateIdとSourceRefは編集できません/)).toBeInTheDocument();
  });

  it("gates phase advancement and offers only same-type merge targets", () => {
    const initial = createTestReviewSession({
      bundle: makeBundle({ relationships: [] }),
      initialKnowledge: makeKnowledge(),
    });
    const actions = createActions();
    const view = render(
      <EntityReviewSection session={initial} isBusy={false} actions={actions} />,
    );

    expect(screen.getByRole("button", { name: "Relationship Reviewへ進む" })).toBeDisabled();
    const mergeSelect = screen.getByLabelText("merge先");
    expect(within(mergeSelect).getByRole("option", { name: /Duplicate: Nova/ })).toBeInTheDocument();
    expect(within(mergeSelect).queryByRole("option", { name: /Team/ })).not.toBeInTheDocument();

    const accepted = acceptEntityCandidate(initial, "candidate-nova", {
      idGenerator: new SequenceIdGenerator(["entity-new"]),
      clock: new SequenceClock([timestampB]),
    });
    view.rerender(
      <EntityReviewSection session={accepted} isBusy={false} actions={actions} />,
    );
    expect(screen.getByRole("button", { name: "Relationship Reviewへ進む" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Accept as new" })).not.toBeInTheDocument();
  });
});

describe("Relationship review UI", () => {
  it("explains a blocked endpoint, disables Accept, and submits manual resolution", () => {
    const manual = vi.fn(async () => undefined);
    const actions = createActions({ setManualRelationshipResolution: manual });
    render(
      <RelationshipReviewSection
        session={relationshipSession()}
        isBusy={false}
        actions={actions}
      />,
    );

    expect(screen.getByText(/Blocked:.*始点を解決できません/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept Relationship" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("from Entity"), {
      target: { value: "entity-existing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "手動解決を適用" }));

    expect(manual).toHaveBeenCalledWith("candidate-relationship", {
      fromEntityId: "entity-existing",
      toEntityId: "entity-team",
    });
  });

  it("previews duplicate Relationship consolidation before Accept", () => {
    const session = advanceToRelationshipReview(
      createTestReviewSession({
        bundle: makeBundle({
          entities: [],
          relationships: [
            makeRelationshipCandidate({
              fromRef: { name: "Nova", entityType: "character" },
              toRef: { name: "Team", entityType: "organization" },
            }),
          ],
        }),
        initialKnowledge: makeKnowledge({ relationships: [makeRelationship()] }),
      }),
    );
    render(
      <RelationshipReviewSection
        session={session}
        isBusy={false}
        actions={createActions()}
      />,
    );

    expect(screen.getByText(/既存Relationship.*SourceRefを統合/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept Relationship" })).toBeEnabled();
  });

  it("enables completion only after every Relationship is terminal", () => {
    const pending = relationshipSession(
      makeRelationshipCandidate({
        fromRef: { name: "Nova", entityType: "character" },
        toRef: { name: "Team", entityType: "organization" },
      }),
    );
    const actions = createActions();
    const view = render(
      <RelationshipReviewSection session={pending} isBusy={false} actions={actions} />,
    );
    expect(
      screen.getByRole("button", { name: "Reviewを完了してKnowledgeへ反映" }),
    ).toBeDisabled();

    const accepted = acceptRelationshipCandidate(
      pending,
      "candidate-relationship",
      {
        idGenerator: new SequenceIdGenerator(["relationship-new"]),
        clock: new SequenceClock([timestampB]),
      },
    );
    view.rerender(
      <RelationshipReviewSection session={accepted} isBusy={false} actions={actions} />,
    );
    expect(
      screen.getByRole("button", { name: "Reviewを完了してKnowledgeへ反映" }),
    ).toBeEnabled();
  });
});
