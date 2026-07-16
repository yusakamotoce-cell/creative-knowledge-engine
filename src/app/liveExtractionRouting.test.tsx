import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExtractionAdapter, ImportedDocument } from "../core/import";
import { importDocument } from "../core/import";
import { SequenceClock } from "../core/shared/clock";
import { SequenceIdGenerator } from "../core/shared/idGenerator";
import { WebCryptoSha256Hasher } from "../core/shared/sha256";
import { MemoryStorageAdapter } from "../core/storage";
import { App } from "./App";
import { RemoteExtractionAdapter } from "./extraction";
import { createTestApplicationDependencies } from "./testSupport";

class DynamicLiveExtractionAdapter implements ExtractionAdapter {
  readonly extract = vi.fn(async (document: ImportedDocument) => ({
    schemaVersion: 1 as const,
    documentId: document.id,
    entities: [
      {
        candidateId: "candidate-live-mira",
        entityType: "character" as const,
        name: "Mira Vale",
        aliases: [],
        description: "",
        attributes: {},
        tags: [],
        sourceRefs: [
          {
            documentId: document.id,
            fileName: document.fileName,
            excerpt: "Mira Vale",
          },
        ],
      },
    ],
    relationships: [],
  }));
}

describe("explicit Fixture and Live extraction routing", () => {
  it("runs Project Astra through Fixture extraction without calling Live AI", async () => {
    const live = new DynamicLiveExtractionAdapter();
    const dependencies = createTestApplicationDependencies(undefined, {
      liveExtractionAdapter: live,
    });
    render(<App dependencies={dependencies} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });

    fireEvent.click(
      screen.getByRole("button", { name: "Project Astra Demoを開始" }),
    );

    expect(
      await screen.findByRole("heading", { name: "01-astra-foundation.md" }),
    ).toBeInTheDocument();
    expect(live.extract).not.toHaveBeenCalled();
  });

  it("routes an arbitrary document only to the injected Live adapter", async () => {
    const live = new DynamicLiveExtractionAdapter();
    const fixture = { extract: vi.fn(async () => ({})) };
    const dependencies = createTestApplicationDependencies(undefined, {
      liveExtractionAdapter: live,
    });
    dependencies.fixtureExtractionAdapter = fixture;
    render(<App dependencies={dependencies} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "文書をImport" }));
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "Mira Vale maps a harbor." },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "GPT-5.6で抽出してReview" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Entity Candidate Review" }),
    ).toBeInTheDocument();
    expect(live.extract).toHaveBeenCalledOnce();
    expect(fixture.extract).not.toHaveBeenCalled();
  });

  it("does not fall back to Fixture extraction after a Live failure", async () => {
    const live = {
      extract: vi.fn(async () => {
        throw new Error("Live unavailable");
      }),
    };
    const fixture = { extract: vi.fn(async () => ({})) };
    const dependencies = createTestApplicationDependencies(undefined, {
      liveExtractionAdapter: live,
    });
    dependencies.fixtureExtractionAdapter = fixture;
    render(<App dependencies={dependencies} />);
    await screen.findByRole("heading", { name: /散らばった設定/ });
    fireEvent.click(screen.getByRole("button", { name: "文書をImport" }));
    fireEvent.change(screen.getByLabelText("本文"), {
      target: { value: "Mira Vale" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(
      screen.getByRole("button", { name: "GPT-5.6で抽出してReview" }),
    );

    expect(await screen.findByText("操作を完了できませんでした")).toBeInTheDocument();
    expect(live.extract).toHaveBeenCalledOnce();
    expect(fixture.extract).not.toHaveBeenCalled();
  });
});

describe("Live extraction Import integration", () => {
  it("does not call Live AI again when the raw content is already imported", async () => {
    const storage = new MemoryStorageAdapter();
    const live = new DynamicLiveExtractionAdapter();
    const dependencies = {
      storage,
      extractionAdapter: live,
      hasher: new WebCryptoSha256Hasher(),
      idGenerator: new SequenceIdGenerator(["document-live", "session-live"]),
      clock: new SequenceClock(["2026-07-16T00:00:00.000Z"]),
    };
    const input = {
      sourceKind: "pasted_text" as const,
      format: "plain_text" as const,
      fileName: "notes.txt",
      mediaType: "text/plain",
      content: "Mira Vale maps a harbor.",
    };

    expect((await importDocument(input, dependencies)).status).toBe("imported");
    expect((await importDocument(input, dependencies)).status).toBe(
      "already_imported",
    );
    expect(live.extract).toHaveBeenCalledOnce();
  });

  it("keeps Storage empty when Remote output fails validation", async () => {
    const storage = new MemoryStorageAdapter();
    const remote = new RemoteExtractionAdapter({
      fetcher: vi.fn(async () =>
        Response.json({
          ok: true,
          schemaVersion: 1,
          candidateBundle: { schemaVersion: 1 },
          meta: {
            model: "gpt-5.6",
            promptVersion: "creative-knowledge-candidate-extraction-v1",
          },
        }),
      ),
    });

    await expect(
      importDocument(
        {
          sourceKind: "pasted_text",
          format: "plain_text",
          fileName: "notes.txt",
          mediaType: "text/plain",
          content: "Mira Vale",
        },
        {
          storage,
          extractionAdapter: remote,
          hasher: new WebCryptoSha256Hasher(),
          idGenerator: new SequenceIdGenerator([
            "document-live",
            "session-live",
          ]),
          clock: new SequenceClock(["2026-07-16T00:00:00.000Z"]),
        },
      ),
    ).rejects.toEqual(expect.objectContaining({ code: "EXTRACTION_FAILED" }));

    const snapshot = await storage.load();
    expect(snapshot.importedDocuments).toEqual([]);
    expect(snapshot.reviewSessions).toEqual([]);
    expect(snapshot.importRegistry.entries).toEqual([]);
  });
});
