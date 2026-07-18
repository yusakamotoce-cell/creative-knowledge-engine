import { expect, type Page } from "@playwright/test";
import { rename, rm, stat, writeFile } from "node:fs/promises";

import { installFixtureNetworkGuard } from "./networkGuard.js";
import { ensureVideoDirectories, resolveVideoPaths } from "./paths.js";
import { assertNoSecretMaterial, escapeHtml } from "./safety.js";
import { getVideoShot } from "./shotManifest.js";

export type ShotAssertionValue = boolean | number | string;
export type ShotAssertions = Record<string, ShotAssertionValue>;

export interface ShotRecordingControl {
  elapsedMs(): number;
  waitUntilElapsed(targetMs: number): Promise<void>;
  showLabel(
    text: string,
    options?: {
      duration?: number;
      position?: "bottom-left" | "bottom-right";
      tone?: "accent" | "success" | "warning";
    },
  ): Promise<void>;
}

export async function recordFixtureShot(input: {
  page: Page;
  baseURL: string;
  shotId: string;
  prepare(): Promise<void>;
  perform(control: ShotRecordingControl): Promise<ShotAssertions>;
}): Promise<void> {
  const paths = resolveVideoPaths();
  const shot = getVideoShot(input.shotId);
  const finalClipPath = paths.clip(shot.fileName);
  const temporaryClipPath = paths.clip(`.${shot.id}.recording.webm`);
  const finalReportPath = paths.report(`${shot.id}.json`);
  const temporaryReportPath = paths.report(`.${shot.id}.recording.json`);
  await ensureVideoDirectories(paths);
  await rm(temporaryClipPath, { force: true });
  await rm(temporaryReportPath, { force: true });

  const guard = await installFixtureNetworkGuard(input.page, input.baseURL);
  let recordingStarted = false;
  let guardStopped = false;
  let recordingStartedAt = 0;

  try {
    await input.prepare();
    await input.page.screencast.showActions({
      cursor: "pointer",
      duration: 900,
      fontSize: 26,
      position: "top-right",
    });
    await input.page.screencast.start({
      path: temporaryClipPath,
      size: { width: 1920, height: 1080 },
      quality: 90,
    });
    recordingStarted = true;
    recordingStartedAt = Date.now();

    const control: ShotRecordingControl = {
      elapsedMs: () => Date.now() - recordingStartedAt,
      async waitUntilElapsed(targetMs) {
        const remaining = targetMs - (Date.now() - recordingStartedAt);
        if (remaining > 0) await input.page.waitForTimeout(remaining);
      },
      async showLabel(text, options = {}) {
        const tone = options.tone ?? "accent";
        const background = {
          accent: "rgba(17,48,51,.94)",
          success: "rgba(27,97,63,.95)",
          warning: "rgba(128,76,16,.95)",
        }[tone];
        const side =
          options.position === "bottom-right"
            ? "right:46px"
            : "left:46px";
        await input.page.screencast.showOverlay(
          `<div style="position:fixed;${side};bottom:42px;max-width:780px;padding:14px 18px;border-radius:12px;background:${background};color:white;font:800 25px/1.28 system-ui;box-shadow:0 14px 36px rgba(0,0,0,.22)">` +
            `${escapeHtml(text)}</div>`,
          { duration: options.duration ?? 2_700 },
        );
      },
    };

    const assertions = await input.perform(control);
    await control.waitUntilElapsed(shot.targetDurationMs - 180);
    const recordedContentDurationMs = Date.now() - recordingStartedAt;
    await input.page.screencast.stop();
    recordingStarted = false;
    await input.page.screencast.hideActions();

    await guard.stop();
    guardStopped = true;
    guard.assertClean();

    const clipStat = await stat(temporaryClipPath);
    expect(clipStat.size).toBeGreaterThan(10 * 1024);
    const actualDurationMs = Date.now() - recordingStartedAt;
    expect(recordedContentDurationMs).toBeGreaterThanOrEqual(
      shot.targetDurationMs - 3_000,
    );
    expect(recordedContentDurationMs).toBeLessThanOrEqual(
      shot.targetDurationMs + 3_000,
    );

    const report = JSON.stringify(
      {
        shotId: shot.id,
        fileName: shot.fileName,
        sourceState: shot.sourceState,
        targetDurationMs: shot.targetDurationMs,
        recordedContentDurationMs,
        actualDurationMs,
        bytes: clipStat.size,
        fixtureOnly: true,
        liveAiRequests: guard.report.extractRequests.length,
        externalRequests: guard.report.externalRequests.length,
        consoleErrors: guard.report.consoleErrors.length,
        pageErrors: guard.report.pageErrors.length,
        assertions,
      },
      null,
      2,
    );
    assertNoSecretMaterial(report);
    await writeFile(temporaryReportPath, `${report}\n`, "utf8");

    await rm(finalClipPath, { force: true });
    await rename(temporaryClipPath, finalClipPath);
    await rm(finalReportPath, { force: true });
    await rename(temporaryReportPath, finalReportPath);
  } catch (error) {
    if (recordingStarted) {
      await input.page.screencast.stop().catch(() => undefined);
    }
    await input.page.screencast.hideActions().catch(() => undefined);
    if (!guardStopped) {
      await guard.stop().catch(() => undefined);
    }
    await rm(temporaryClipPath, { force: true });
    await rm(temporaryReportPath, { force: true });
    throw error;
  }
}
