import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  FileDownloadError,
  type FileDownloadAdapter,
} from "./download/fileDownloadAdapter";
import { MemoryStorageAdapter } from "../core/storage";
import { runProjectAstraFixture } from "../data/demo/project-astra";
import { App } from "./App";
import {
  createTestApplicationDependencies,
  RecordingFileDownloadAdapter,
} from "./testSupport";

async function renderCompleted(
  downloadAdapter: FileDownloadAdapter = new RecordingFileDownloadAdapter(),
) {
  const completed = await runProjectAstraFixture();
  const storage = new MemoryStorageAdapter(completed.snapshot);
  render(
    <App
      dependencies={createTestApplicationDependencies(storage, {
        fileDownloadAdapter: downloadAdapter,
      })}
    />,
  );
  await screen.findByRole("heading", { name: /散らばった設定/ });
  return { completed, downloadAdapter, storage };
}

describe("Step 7 Search UI", () => {
  it("searches, identifies matched fields, selects by keyboard, clears, and validates length", async () => {
    await renderCompleted();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("searchbox", { name: "検索語" });
    fireEvent.change(input, { target: { value: "Quiet" } });

    expect(screen.getByText("1件")).toBeInTheDocument();
    expect(screen.getByText(/name: prefix · Quiet Prism/)).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("heading", { name: "Quiet Prism" })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "unknown" } });
    expect(screen.getByText("0件")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一致するEntityはありません" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
    expect(screen.getByText("7件")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "x".repeat(201) } });
    expect(screen.getByText("検索語は200文字以内で入力してください。")).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("normalizes full-width input and applies EntityType plus tag filters", async () => {
    await renderCompleted();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("searchbox", { name: "検索語" });
    fireEvent.change(input, { target: { value: "ＮＯＶＡ" } });
    const results = screen.getByRole("navigation", { name: "Entity検索結果" });
    expect(within(results).getAllByRole("button")).toHaveLength(2);
    expect(within(results).getAllByRole("button")[0]).toHaveAccessibleName(/ＮＯＶＡ/);

    fireEvent.click(screen.getByRole("checkbox", { name: "character" }));
    expect(screen.getByText("0件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "character" }));
    fireEvent.click(screen.getByRole("button", { name: "検索語をクリア" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "archive-revision" }));
    expect(screen.getByText("2件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "cartographer" }));
    expect(screen.getByText("1件")).toBeInTheDocument();
  });
});

describe("Step 7 Graph UI", () => {
  it("renders, filters, zooms, selects nodes and Relationships, and toggles Orphans", async () => {
    await renderCompleted();
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(
      screen.getByRole("group", {
        name: "Knowledge Graph: 7 nodes and 5 directed edges",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByText("125%")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset view" }));
    expect(screen.getByText("100%")).toBeInTheDocument();

    const quietNode = screen.getByRole("button", {
      name: "Quiet Prism, item, 0 relationships, orphan",
    });
    fireEvent.keyDown(quietNode, { key: "Enter" });
    expect(quietNode).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { name: "Quiet Prism" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Orphan Entityを表示" }));
    expect(
      screen.getByRole("group", {
        name: "Knowledge Graph: 6 nodes and 5 directed edges",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "appears_in" }));
    expect(
      screen.getByRole("group", {
        name: "Knowledge Graph: 6 nodes and 3 directed edges",
      }),
    ).toBeInTheDocument();
    const relationshipList = screen.getByRole("navigation", {
      name: "Graph Relationship一覧",
    });
    fireEvent.keyDown(
      within(relationshipList).getByRole("button", {
        name: /Nova Arclight member_of Astra Survey Corps/,
      }),
      { key: "Enter" },
    );
    expect(
      screen.getByRole("heading", {
        name: "Nova Arclight → member_of → Astra Survey Corps",
      }),
    ).toBeInTheDocument();
  });

  it("shares selected Entity across Search, Graph, and Knowledge", async () => {
    await renderCompleted();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("searchbox", { name: "検索語" });
    fireEvent.change(input, { target: { value: "Quiet" } });
    fireEvent.keyDown(input, { key: "Enter" });

    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(
      screen.getByRole("button", {
        name: "Quiet Prism, item, 0 relationships, orphan",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    expect(screen.getByRole("heading", { name: "Quiet Prism" })).toBeInTheDocument();
  });

  it("shows a usable empty Graph state", async () => {
    render(<App dependencies={createTestApplicationDependencies()} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    expect(screen.getByRole("heading", { name: "filterに一致するNodeはありません" })).toBeInTheDocument();
    expect(screen.getByText("0 nodes · 0 edges")).toBeInTheDocument();
  });
});

describe("Step 7 Export UI", () => {
  it("previews and downloads only the versioned canonical Knowledge JSON", async () => {
    const downloadAdapter = new RecordingFileDownloadAdapter();
    await renderCompleted(downloadAdapter);
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    expect(screen.queryByText(/"schemaVersion": 1/, { selector: "pre" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "JSON previewを表示" }));
    expect(screen.getByText(/"schemaVersion": 1/, { selector: "pre" })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Knowledge JSONをダウンロード" }),
    );

    expect(await screen.findByText("Knowledge JSONをダウンロードしました。")).toBeInTheDocument();
    expect(downloadAdapter.downloads).toHaveLength(1);
    const download = downloadAdapter.downloads[0];
    expect(download).toMatchObject({
      fileName: "creative-knowledge-20260716.json",
      mediaType: "application/json",
    });
    const parsed = JSON.parse(download?.content ?? "null");
    expect(parsed).toMatchObject({ schemaVersion: 1, knowledgeRevision: 4 });
    expect(parsed).not.toHaveProperty("importedDocuments");
    expect(parsed).not.toHaveProperty("reviewSessions");
  });

  it("maps download failures without leaking internal errors", async () => {
    await renderCompleted({
      downloadText: () => {
        throw new FileDownloadError({ cause: new Error("secret") });
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Knowledge JSONをダウンロード" }),
    );

    expect(await screen.findByText("JSONをダウンロードできません")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("rebuilds Search and Graph from persisted Knowledge after remount", async () => {
    const completed = await runProjectAstraFixture();
    const storage = new MemoryStorageAdapter(completed.snapshot);
    const first = render(
      <App dependencies={createTestApplicationDependencies(storage)} />,
    );
    await screen.findByRole("heading", { name: /散らばった設定/ });
    first.unmount();

    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(screen.getByText("7件")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Graph" }));
    await waitFor(() =>
      expect(
        screen.getByRole("group", {
          name: "Knowledge Graph: 7 nodes and 5 directed edges",
        }),
      ).toBeInTheDocument(),
    );
  });
});
