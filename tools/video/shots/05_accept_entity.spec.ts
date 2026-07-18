import { expect, test } from "@playwright/test";
import { stat, writeFile } from "node:fs/promises";

import { installFixtureNetworkGuard } from "../networkGuard.js";
import { ensureVideoDirectories, resolveVideoPaths } from "../paths.js";
import { assertNoSecretMaterial, escapeHtml } from "../safety.js";
import { getVideoShot } from "../shotManifest.js";

const paths = resolveVideoPaths();
const shot = getVideoShot("05_accept_entity");

test.use({
  storageState: paths.state("doc1EntityReview"),
});

test("05_accept_entity records Fixture review without Live AI", async ({
  page,
  baseURL,
}) => {
  if (baseURL === undefined) {
    throw new Error("Video baseURL is required.");
  }

  await ensureVideoDirectories(paths);
  const guard = await installFixtureNetworkGuard(page, baseURL);
  await page.goto("/");
  await page.getByRole("button", { name: "作業を再開" }).click();
  await expect(
    page.getByRole("heading", { name: "Entity Candidate Review" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nova Arclight" })).toBeVisible();

  await page.addStyleTag({
    content: `
      .review-header { margin-bottom: 14px !important; padding: 18px 24px !important; }
      .review-header p:last-child { display: none !important; }
      .review-toolbar { margin-bottom: 12px !important; }
      .candidate-panel { padding: 20px !important; }
      .candidate-panel > p { margin-bottom: 8px !important; }
      .detail-list { margin: 10px 0 !important; }
      .detail-list > div:first-child { display: none !important; }
      .candidate-panel > .subpanel + .subpanel { display: none !important; }
      .candidate-panel > form,
      .candidate-panel > .form-stack { display: none !important; }
      .candidate-panel > .reviewed-note { display: none !important; }
      .phase-footer { display: none !important; }
    `,
  });

  const sourceReference = page
    .locator(".candidate-panel > .subpanel")
    .first();
  await sourceReference.scrollIntoViewIfNeeded();
  await expect(sourceReference).toContainText("Nova Arclight");
  await expect(page.getByRole("button", { name: "Accept as new" })).toBeVisible();

  const outputPath = paths.clip(shot.fileName);
  const recordingStartedAt = Date.now();
  let recordingStarted = false;
  await page.screencast.showActions({
    cursor: "pointer",
    duration: 900,
    fontSize: 26,
    position: "top-right",
  });

  try {
    await page.screencast.start({
      path: outputPath,
      size: { width: 1920, height: 1080 },
      quality: 90,
    });
    recordingStarted = true;

    await page.screencast.showChapter(
      shot.chapter?.title ?? "Human review before canon",
      {
        description:
          shot.chapter?.description ??
          "The Names Between Stars · Fixture Mode",
        duration: 1_600,
      },
    );
    await page.waitForTimeout(1_900);

    await page.screencast.showOverlay(
      `<div style="position:fixed;left:46px;bottom:42px;padding:14px 18px;border-radius:12px;background:rgba(17,48,51,.92);color:white;font:700 25px/1.25 system-ui;box-shadow:0 14px 36px rgba(0,0,0,.22)">` +
        `${escapeHtml("Source Reference · exact excerpt")}</div>`,
      { duration: 2_700 },
    );
    await page.waitForTimeout(2_500);

    await page.getByRole("button", { name: "Accept as new" }).click();
    await expect(
      page
        .getByRole("navigation", { name: "Entity Candidate一覧" })
        .getByRole("button", { name: /Nova Arclight.*accepted/u }),
    ).toBeVisible();
    await page.screencast.showOverlay(
      `<div style="position:fixed;right:46px;bottom:42px;padding:14px 18px;border-radius:12px;background:rgba(27,97,63,.94);color:white;font:800 25px/1.25 system-ui;box-shadow:0 14px 36px rgba(0,0,0,.22)">` +
        `${escapeHtml("Creator decision saved · accepted")}</div>`,
      { duration: 3_200 },
    );

    const remaining =
      shot.targetDurationMs - (Date.now() - recordingStartedAt) - 150;
    if (remaining > 0) {
      await page.waitForTimeout(remaining);
    }
  } finally {
    if (recordingStarted) {
      await page.screencast.stop();
    }
    await page.screencast.hideActions();
  }

  await guard.stop();
  guard.assertClean();
  const clipStat = await stat(outputPath);
  expect(clipStat.size).toBeGreaterThan(10 * 1024);
  const actualDurationMs = Date.now() - recordingStartedAt;
  expect(actualDurationMs).toBeGreaterThanOrEqual(
    shot.targetDurationMs - 3_000,
  );
  expect(actualDurationMs).toBeLessThanOrEqual(
    shot.targetDurationMs + 3_000,
  );

  const report = JSON.stringify(
    {
      shotId: shot.id,
      fileName: shot.fileName,
      sourceState: shot.sourceState,
      targetDurationMs: shot.targetDurationMs,
      actualDurationMs,
      bytes: clipStat.size,
      fixtureOnly: true,
      liveAiRequests: guard.report.extractRequests.length,
      externalRequests: guard.report.externalRequests.length,
    },
    null,
    2,
  );
  assertNoSecretMaterial(report);
  await writeFile(paths.report(`${shot.id}.json`), `${report}\n`, "utf8");
});
