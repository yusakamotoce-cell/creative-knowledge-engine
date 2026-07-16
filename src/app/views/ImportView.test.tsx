import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyStorageSnapshot } from "../../core/storage";
import { loadProjectAstraFixture } from "../../data/demo/project-astra";
import type { ApplicationControllerActions } from "../state/useApplicationController";
import { ImportView } from "./ImportView";

function createActions(): ApplicationControllerActions {
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
  };
}

function renderView(actions = createActions(), isBusy = false) {
  render(
    <ImportView
      snapshot={createEmptyStorageSnapshot()}
      projectAstra={loadProjectAstraFixture()}
      isBusy={isBusy}
      actions={actions}
    />,
  );
  return actions;
}

describe("ImportView", () => {
  it("shows the offline Demo and the explicit Live AI privacy notice", () => {
    renderView();

    expect(screen.getByRole("heading", { name: "01-astra-foundation.md" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GPT-5.6 Live Extraction" })).toBeInTheDocument();
    expect(screen.getByText(/本文をOpenAI APIへ送信/)).toBeInTheDocument();
    expect(screen.getByText(/API keyはブラウザーへ保存・送信しません/)).toBeInTheDocument();
  });

  it("rejects empty pasted content before calling the controller", () => {
    const actions = renderView();

    expect(screen.getByRole("button", { name: "GPT-5.6で抽出してReview" })).toBeDisabled();
    expect(actions.importArbitraryDocument).not.toHaveBeenCalled();
  });

  it("forwards pasted JSON metadata and raw content", () => {
    const actions = renderView();
    fireEvent.change(screen.getByLabelText("fileName"), {
      target: { value: "world.json" },
    });
    fireEvent.change(screen.getByLabelText("format"), {
      target: { value: "json" },
    });
    fireEvent.change(screen.getByLabelText("media type"), {
      target: { value: "application/json" },
    });
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: '{"name":"Nova"}' },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    fireEvent.click(screen.getByRole("button", { name: "GPT-5.6で抽出してReview" }));

    expect(actions.importArbitraryDocument).toHaveBeenCalledWith({
      sourceKind: "pasted_text",
      format: "json",
      fileName: "world.json",
      mediaType: "application/json",
      content: '{"name":"Nova"}',
    });
  });

  it("reads a supported file as text and infers its metadata", async () => {
    const actions = renderView();
    const file = new File(["# Nova\n"], "nova.md", { type: "text/markdown" });
    Object.defineProperty(file, "text", {
      value: vi.fn(async () => "# Nova\n"),
    });

    fireEvent.change(screen.getByLabelText("ファイルを選択"), {
      target: { files: [file] },
    });
    await waitFor(() => expect(screen.getByLabelText("本文")).toHaveValue("# Nova\n"));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "GPT-5.6で抽出してReview" }));

    expect(actions.importArbitraryDocument).toHaveBeenCalledWith({
      sourceKind: "file",
      format: "markdown",
      fileName: "nova.md",
      mediaType: "text/markdown",
      content: "# Nova\n",
    });
  });

  it("rejects unsupported file extensions without reading or importing", () => {
    const actions = renderView();
    const file = new File(["pdf"], "notes.pdf", { type: "application/pdf" });
    const text = vi.fn(async () => "pdf");
    Object.defineProperty(file, "text", { value: text });

    fireEvent.change(screen.getByLabelText("ファイルを選択"), {
      target: { files: [file] },
    });

    expect(screen.getByText(/\.txt、\.md、\.markdown、\.json/)).toBeInTheDocument();
    expect(text).not.toHaveBeenCalled();
    expect(actions.importArbitraryDocument).not.toHaveBeenCalled();
  });

  it("disables both import actions while another operation is busy", () => {
    renderView(createActions(), true);

    expect(screen.getByRole("button", { name: "ImportしてReview" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "GPT-5.6で抽出してReview" })).toBeDisabled();
  });

  it("shows the character count and blocks content over 20,000 characters", () => {
    const actions = renderView();
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "a".repeat(20_001) },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    expect(screen.getByText("20,001 / 20,000文字")).toBeInTheDocument();
    expect(screen.getByText("本文は20,000文字以内にしてください。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GPT-5.6で抽出してReview" })).toBeDisabled();
    expect(actions.importArbitraryDocument).not.toHaveBeenCalled();
  });
});
