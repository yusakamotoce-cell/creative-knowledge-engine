import path from "node:path";

import { describe, expect, it } from "vitest";

import { LOCAL_VIDEO_BASE_URL, resolveVideoTarget } from "./config.js";
import { resolveVideoPaths } from "./paths.js";
import {
  getVideoShot,
  TARGET_VIDEO_DURATION_MS,
  totalSelectedDurationMs,
  videoShotManifest,
} from "./shotManifest.js";
import { assertNoSecretMaterial, escapeHtml } from "./safety.js";
import {
  codexFinishCard,
  finalCardMarkup,
  FINAL_CARD_LINES,
  scatteredLoreCard,
} from "./titleCards.js";

describe("video automation manifest", () => {
  it("contains 15 unique selected shots totaling exactly 165 seconds", () => {
    expect(videoShotManifest).toHaveLength(15);
    expect(new Set(videoShotManifest.map((shot) => shot.id)).size).toBe(15);
    expect(new Set(videoShotManifest.map((shot) => shot.fileName)).size).toBe(15);
    expect(totalSelectedDurationMs()).toBe(TARGET_VIDEO_DURATION_MS);
  });

  it("selects only the successful Live AI variant", () => {
    const liveAiShots = videoShotManifest.filter(
      (shot) => "liveAiVariant" in shot,
    );
    expect(liveAiShots).toEqual([
      expect.objectContaining({
        id: "14_live_ai_success",
        liveAiVariant: "success",
        selected: true,
      }),
    ]);
  });

  it("uses the v1.1 timing and source state for the proof shot", () => {
    expect(getVideoShot("05_accept_entity")).toMatchObject({
      fileName: "05_accept_entity.webm",
      targetDurationMs: 13_000,
      sourceState: "doc1-entity-review",
    });
  });

  it("defines exactly 14 non-Live-AI shots", () => {
    expect(
      videoShotManifest.filter((shot) => !("liveAiVariant" in shot)),
    ).toHaveLength(14);
  });
});

describe("video target configuration", () => {
  it("uses the local preview when VIDEO_BASE_URL is absent", () => {
    expect(resolveVideoTarget(undefined)).toEqual({
      baseURL: LOCAL_VIDEO_BASE_URL,
      usesLocalPreview: true,
    });
  });

  it("normalizes a deployment URL with a trailing slash", () => {
    expect(resolveVideoTarget("https://example.test/demo")).toEqual({
      baseURL: "https://example.test/demo/",
      usesLocalPreview: false,
    });
  });

  it.each([
    "file:///tmp/demo",
    "https://example.test/?secret=value",
    "https://example.test/#fragment",
    "https://user:password@example.test/",
    "not-a-url",
  ])("rejects unsafe VIDEO_BASE_URL value %s", (value) => {
    expect(() => resolveVideoTarget(value)).toThrow();
  });
});

describe("video artifact paths and content safety", () => {
  it("uses the exact required state file names", () => {
    const paths = resolveVideoPaths(path.join("C:", "workspace"));
    expect(path.basename(paths.state("empty"))).toBe("00_empty.json");
    expect(path.basename(paths.state("doc1EntityReview"))).toBe(
      "01_doc1_entity_review.json",
    );
    expect(path.basename(paths.state("doc2BeforeEdit"))).toBe(
      "02_doc2_before_edit.json",
    );
    expect(path.basename(paths.state("doc3DuplicateReview"))).toBe(
      "03_doc3_duplicate_review.json",
    );
    expect(path.basename(paths.state("doc4BlockedRelationship"))).toBe(
      "04_doc4_blocked_relationship.json",
    );
    expect(path.basename(paths.state("doc4ReadyToComplete"))).toBe(
      "05_doc4_ready_to_complete.json",
    );
    expect(path.basename(paths.state("finalKnowledge"))).toBe(
      "06_final_knowledge.json",
    );
  });

  it("escapes recording overlay content", () => {
    expect(escapeHtml(`<script a="b">Tom & 'Nova'</script>`)).toBe(
      "&lt;script a=&quot;b&quot;&gt;Tom &amp; &#39;Nova&#39;&lt;/script&gt;",
    );
  });

  it("rejects secret-like artifact content", () => {
    expect(() =>
      assertNoSecretMaterial("Authorization: Bearer private-token"),
    ).toThrow(/secret-like/u);
    expect(() => assertNoSecretMaterial("fixture-only")).not.toThrow();
  });
});

describe("generated recording cards", () => {
  it("shows all four scattered source file names", () => {
    const card = scatteredLoreCard();
    for (const fileName of [
      "character-notes.md",
      "world-setting.md",
      "revision.json",
      "scene-draft.md",
    ]) {
      expect(card).toContain(fileName);
    }
  });

  it("renders a supplied dynamic test count", () => {
    const card = codexFinishCard(742);
    expect(card).toContain("742");
    expect(card).not.toContain("FINAL_TEST_COUNT");
  });

  it("uses the exact frozen final card text", () => {
    expect(FINAL_CARD_LINES).toEqual([
      "From scattered lore",
      "to creator-controlled canon.",
    ]);
    expect(finalCardMarkup()).toContain("From scattered lore");
    expect(finalCardMarkup()).toContain("to creator-controlled canon.");
  });
});
