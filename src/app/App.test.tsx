import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StorageAdapter, StorageSnapshot } from "../core/storage";
import { MemoryStorageAdapter } from "../core/storage";
import { runProjectAstraFixture } from "../data/demo/project-astra";
import { App } from "./App";
import { createTestApplicationDependencies } from "./testSupport";

class CountingStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  loads = 0;
  failLoads = 0;

  constructor(snapshot?: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  async load(): Promise<StorageSnapshot> {
    this.loads += 1;
    if (this.failLoads > 0) {
      this.failLoads -= 1;
      throw new Error("load failed");
    }
    return this.memory.load();
  }

  save(snapshot: StorageSnapshot): Promise<void> {
    return this.memory.save(snapshot);
  }
}

class FailingSaveStorage implements StorageAdapter {
  readonly memory: MemoryStorageAdapter;
  failNextSave = false;

  constructor(snapshot: StorageSnapshot) {
    this.memory = new MemoryStorageAdapter(snapshot);
  }

  load(): Promise<StorageSnapshot> {
    return this.memory.load();
  }

  async save(snapshot: StorageSnapshot): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error("save failed");
    }
    await this.memory.save(snapshot);
  }
}

async function createCompleteNotAppliedSnapshot(): Promise<StorageSnapshot> {
  const completed = await runProjectAstraFixture();
  return {
    ...completed.snapshot,
    knowledge: {
      ...completed.snapshot.knowledge,
      entities: completed.snapshot.knowledge.entities.filter(
        (entity) => entity.id !== "ent-astra-007",
      ),
    },
    knowledgeRevision: 3,
    reviewApplications: completed.snapshot.reviewApplications.filter(
      (application) => application.reviewSessionId !== "review-astra-004",
    ),
  };
}

describe("App", () => {
  it("shows loading, initializes once, and renders an empty workspace", async () => {
    const storage = new CountingStorage();
    render(<App dependencies={createTestApplicationDependencies(storage)} />);

    expect(screen.getByRole("heading", { name: "Workspaceを読み込んでいます" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /散らばった設定/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Project Astra Demoを開始" })).toBeInTheDocument();
    expect(storage.loads).toBe(1);
  });

  it("shows a fatal storage error without reset and supports retry", async () => {
    const storage = new CountingStorage();
    storage.failLoads = 1;
    render(<App dependencies={createTestApplicationDependencies(storage)} />);

    expect(await screen.findByRole("heading", { name: "Workspaceを読み込めません" })).toBeInTheDocument();
    expect(screen.getByText("保存データは自動削除していません。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(await screen.findByRole("heading", { name: /散らばった設定/ })).toBeInTheDocument();
    expect(storage.loads).toBe(2);
  });

  it("navigates to Import and exposes the current extraction limitation", async () => {
    render(<App dependencies={createTestApplicationDependencies()} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });

    fireEvent.click(screen.getByRole("button", { name: "文書をImport" }));

    expect(screen.getByRole("heading", { name: "文書をImport" })).toBeInTheDocument();
    expect(screen.getByText(/Live AI抽出は後続Step/)).toBeInTheDocument();
    expect(screen.getByLabelText("本文")).toBeInTheDocument();
  });

  it("starts Project Astra and opens Document 01 Entity Review", async () => {
    render(<App dependencies={createTestApplicationDependencies()} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });

    fireEvent.click(screen.getByRole("button", { name: "Project Astra Demoを開始" }));

    expect(await screen.findByRole("heading", { name: "01-astra-foundation.md" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Entity Candidate Review" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Entity Candidate一覧" })).getByRole("button", { name: /Nova Arclight/ })).toBeInTheDocument();
  });

  it("persists an Entity decision across an unmount and remount", async () => {
    const storage = new MemoryStorageAdapter();
    const first = render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Project Astra Demoを開始" }));
    await screen.findByRole("heading", { name: "Entity Candidate Review" });
    fireEvent.click(screen.getByRole("button", { name: "Accept as new" }));
    await screen.findByText(/このCandidateはacceptedとして保存済み/);
    first.unmount();

    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Project Astra Demoを開始" }));

    const list = await screen.findByRole("navigation", { name: "Entity Candidate一覧" });
    const novaButton = within(list).getByRole("button", { name: /Nova Arclight.*accepted/ });
    expect(novaButton).toBeInTheDocument();
    fireEvent.click(novaButton);
    expect(screen.getByText(/このCandidateはacceptedとして保存済み/)).toBeInTheDocument();
  });

  it("shows final Knowledge Insights and relationship direction after refresh", async () => {
    const completed = await runProjectAstraFixture();
    const storage = new MemoryStorageAdapter(completed.snapshot);
    const first = render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));

    expect(screen.getByRole("heading", { name: "Knowledge & Insights" })).toBeInTheDocument();
    expect(screen.getByText("Nova Arclight · age")).toBeInTheDocument();
    expect(screen.getAllByText("Quiet Prism").length).toBeGreaterThan(0);
    expect(screen.getByRole("cell", { name: /member_of/ })).toBeInTheDocument();
    first.unmount();

    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Knowledge" }));
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Knowledge revision")).getByText("4"),
      ).toBeInTheDocument(),
    );
  });

  it("requires explicit confirmation before resetting a saved workspace", async () => {
    const completed = await runProjectAstraFixture();
    const storage = new MemoryStorageAdapter(completed.snapshot);
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });

    fireEvent.click(screen.getByRole("button", { name: "Workspaceをリセット" }));
    const dialog = screen.getByRole("dialog", { name: "現在のWorkspaceを初期化しますか？" });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "現在のWorkspaceを維持" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect((await storage.load()).knowledgeRevision).toBe(4);
  });

  it("does not partially save an arbitrary document when no Fixture result exists", async () => {
    const storage = new MemoryStorageAdapter();
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "文書をImport" }));
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "# Unknown world" },
    });
    fireEvent.click(screen.getByRole("button", { name: "文書をImport" }));

    expect(
      await screen.findByText("保存済みの抽出結果がありません"),
    ).toBeInTheDocument();
    const snapshot = await storage.load();
    expect(snapshot.importedDocuments).toEqual([]);
    expect(snapshot.reviewSessions).toEqual([]);
    expect(snapshot.importRegistry.entries).toEqual([]);
  });

  it("restores complete_not_applied and applies it on retry", async () => {
    const storage = new MemoryStorageAdapter(
      await createCompleteNotAppliedSnapshot(),
    );
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    expect(screen.getAllByText("反映待ち")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "作業を再開" }));
    expect(
      screen.getByRole("heading", {
        name: "Review結果を正本Knowledgeへ反映できます",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "正本Knowledgeへ反映" }));

    expect(
      await screen.findByRole("heading", { name: "Knowledge & Insights" }),
    ).toBeInTheDocument();
    expect((await storage.load()).knowledgeRevision).toBe(4);
  });

  it("keeps a completed Session retryable when apply persistence fails", async () => {
    const storage = new FailingSaveStorage(
      await createCompleteNotAppliedSnapshot(),
    );
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "作業を再開" }));
    storage.failNextSave = true;
    fireEvent.click(screen.getByRole("button", { name: "正本Knowledgeへ反映" }));

    expect(await screen.findByText("Workspaceを保存できません")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Review結果を正本Knowledgeへ反映できます",
      }),
    ).toBeInTheDocument();
    expect((await storage.load()).knowledgeRevision).toBe(3);
    fireEvent.click(screen.getByRole("button", { name: "正本Knowledgeへ反映" }));
    await screen.findByRole("heading", { name: "Knowledge & Insights" });
    expect((await storage.load()).knowledgeRevision).toBe(4);
  });

  it("reports a revision conflict without auto-merging stale Knowledge", async () => {
    const stale = await createCompleteNotAppliedSnapshot();
    const target = stale.reviewSessions.find(
      (session) => session.id === "review-astra-004",
    );
    if (target === undefined) throw new Error("missing Project Astra Session 04");
    const storage = new MemoryStorageAdapter({
      ...stale,
      knowledge: target.knowledge,
      knowledgeRevision: 4,
      reviewSessions: [
        ...stale.reviewSessions,
        { ...target, id: "review-concurrent" },
      ],
      reviewApplications: [
        ...stale.reviewApplications,
        {
          reviewSessionId: "review-concurrent",
          appliedAt: "2026-07-16T00:23:00.000Z",
          fromKnowledgeRevision: 3,
          toKnowledgeRevision: 4,
        },
      ],
    });
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "作業を再開" }));
    fireEvent.click(screen.getByRole("button", { name: "正本Knowledgeへ反映" }));

    expect(await screen.findByText("Knowledgeが更新されています")).toBeInTheDocument();
    expect((await storage.load()).reviewApplications).toHaveLength(4);
  });

  it("replaces a saved workspace only after destructive reset confirmation", async () => {
    const completed = await runProjectAstraFixture();
    const storage = new MemoryStorageAdapter(completed.snapshot);
    render(<App dependencies={createTestApplicationDependencies(storage)} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "Workspaceをリセット" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "空Workspaceへ初期化" }),
    );

    await waitFor(async () => {
      const snapshot = await storage.load();
      expect(snapshot.knowledgeRevision).toBe(0);
      expect(snapshot.importedDocuments).toEqual([]);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Workspaceをリセット" })).not.toBeInTheDocument();
  });
});
