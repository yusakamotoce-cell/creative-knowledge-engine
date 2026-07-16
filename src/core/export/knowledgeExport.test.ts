import { describe, expect, it } from "vitest";

import { runProjectAstraFixture } from "../../data/demo/project-astra";
import {
  createKnowledgeExport,
  knowledgeExportV1Schema,
  serializeKnowledgeExport,
} from "./knowledgeExport";

describe("KnowledgeExportV1", () => {
  it("contains only schema version, revision, and deep-equal Knowledge", async () => {
    const completed = await runProjectAstraFixture();
    const value = createKnowledgeExport(completed.snapshot);
    expect(value).toEqual({
      schemaVersion: 1,
      knowledgeRevision: 4,
      knowledge: completed.snapshot.knowledge,
    });
    expect(value).not.toHaveProperty("importedDocuments");
    expect(value).not.toHaveProperty("importRegistry");
    expect(value).not.toHaveProperty("reviewSessions");
    expect(value).not.toHaveProperty("reviewApplications");
    expect(value).not.toHaveProperty("insights");
  });

  it("uses a strict runtime Schema", async () => {
    const completed = await runProjectAstraFixture();
    const value = createKnowledgeExport(completed.snapshot);
    expect(knowledgeExportV1Schema.safeParse({ ...value, extra: true }).success).toBe(false);
  });

  it("serializes deterministically with two spaces and one trailing newline", async () => {
    const completed = await runProjectAstraFixture();
    const value = createKnowledgeExport(completed.snapshot);
    const first = serializeKnowledgeExport(value);
    expect(first).toBe(serializeKnowledgeExport(value));
    expect(first.startsWith('{\n  "schemaVersion": 1,')).toBe(true);
    expect(first.endsWith("\n")).toBe(true);
    expect(first.endsWith("\n\n")).toBe(false);
    expect(JSON.parse(first)).toEqual(value);
  });

  it("does not mutate the Snapshot or Export value", async () => {
    const completed = await runProjectAstraFixture();
    const snapshot = structuredClone(completed.snapshot);
    const value = createKnowledgeExport(snapshot);
    const originalValue = structuredClone(value);
    serializeKnowledgeExport(value);
    expect(snapshot).toEqual(completed.snapshot);
    expect(value).toEqual(originalValue);
  });

  it("wraps invalid values with INVALID_KNOWLEDGE_EXPORT", () => {
    expect(() =>
      serializeKnowledgeExport({
        schemaVersion: 1,
        knowledgeRevision: -1,
        knowledge: { entities: [], relationships: [] },
      }),
    ).toThrow(expect.objectContaining({ code: "INVALID_KNOWLEDGE_EXPORT" }));
  });
});
