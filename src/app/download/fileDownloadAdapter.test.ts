import { describe, expect, it, vi } from "vitest";

import {
  BrowserFileDownloadAdapter,
  createKnowledgeExportFileName,
  type BrowserFileDownloadEnvironment,
} from "./fileDownloadAdapter";

function createEnvironment() {
  const anchor = {
    href: "",
    download: "",
    click: vi.fn(),
    remove: vi.fn(),
  };
  const blob = new Blob(["fixture"], { type: "text/plain" });
  const environment: BrowserFileDownloadEnvironment = {
    createBlob: vi.fn(() => blob),
    createObjectUrl: vi.fn(() => "blob:fixture"),
    revokeObjectUrl: vi.fn(),
    createAnchor: vi.fn(() => anchor),
    appendAnchor: vi.fn(),
  };
  return { anchor, blob, environment };
}

describe("BrowserFileDownloadAdapter", () => {
  it("downloads the exact JSON content and revokes its object URL", () => {
    const { anchor, blob, environment } = createEnvironment();
    new BrowserFileDownloadAdapter(environment).downloadText({
      fileName: "creative-knowledge-20260716.json",
      mediaType: "application/json",
      content: "{\n  \"schemaVersion\": 1\n}\n",
    });

    expect(environment.createBlob).toHaveBeenCalledWith(
      "{\n  \"schemaVersion\": 1\n}\n",
      "application/json",
    );
    expect(environment.createObjectUrl).toHaveBeenCalledWith(blob);
    expect(anchor).toMatchObject({
      href: "blob:fixture",
      download: "creative-knowledge-20260716.json",
    });
    expect(environment.appendAnchor).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith("blob:fixture");
  });

  it("revokes an allocated URL and throws a safe typed error on failure", () => {
    const { environment } = createEnvironment();
    environment.createAnchor = vi.fn(() => {
      throw new Error("internal browser detail");
    });
    expect(() =>
      new BrowserFileDownloadAdapter(environment).downloadText({
        fileName: "x.json",
        mediaType: "application/json",
        content: "{}\n",
      }),
    ).toThrow(expect.objectContaining({ code: "FILE_DOWNLOAD_FAILED" }));
    expect(environment.revokeObjectUrl).toHaveBeenCalledWith("blob:fixture");
  });
});

describe("createKnowledgeExportFileName", () => {
  it("uses the injected local calendar date", () => {
    expect(createKnowledgeExportFileName(new Date(2026, 6, 16, 23, 59))).toBe(
      "creative-knowledge-20260716.json",
    );
  });
});
