import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyStorageSnapshot } from "../core/storage";
import { defaultLocalStorageKey } from "../core/storage/localStorageAdapter";
import { runProjectAstraFixture } from "../data/demo/project-astra";
import {
  createBrowserApplicationDependencies,
  createProjectAstraClock,
  createProjectAstraIdGenerator,
} from "./compositionRoot";

describe("browser composition root", () => {
  beforeEach(() => window.localStorage.clear());

  it("injects window.localStorage through the Storage Adapter", async () => {
    const dependencies = createBrowserApplicationDependencies();
    await dependencies.storage.save(createEmptyStorageSnapshot());

    expect(window.localStorage.getItem(defaultLocalStorageKey)).toContain(
      '"schemaVersion":1',
    );
  });

  it("reconstructs the first fixed Demo ID and Clock from an empty Snapshot", () => {
    const snapshot = createEmptyStorageSnapshot();
    expect(createProjectAstraIdGenerator(snapshot).nextId("document")).toBe(
      "astra-doc-001",
    );
    expect(createProjectAstraClock(snapshot).now()).toBe(
      "2026-07-16T00:00:00.000Z",
    );
  });

  it("has no remaining fixed IDs or times after the final Snapshot", async () => {
    const completed = await runProjectAstraFixture();
    expect(createProjectAstraIdGenerator(completed.snapshot).remainingCount).toBe(0);
    expect(createProjectAstraClock(completed.snapshot).remainingCount).toBe(0);
  });
});
