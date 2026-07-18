import { expect, test, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import {
  access,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import process from "node:process";

import {
  ensureVideoDirectories,
  resolveVideoPaths,
} from "../paths.js";
import {
  applyRecordingUi,
  assertNoVisibleInternalIds,
} from "../recordingUi.js";
import { assertNoSecretMaterial, escapeHtml } from "../safety.js";

const PRODUCTION_ORIGIN = "https://creative-knowledge-engine.vercel.app";
const SHOT_ID = "14_live_ai_success";
const TARGET_DURATION_SECONDS = 13;
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 16;
const HEAD_DURATION_SECONDS = 4.5;
const TAIL_DURATION_SECONDS = 8.5;
const paths = resolveVideoPaths();

const LIVE_DOCUMENT = Object.freeze({
  fileName: "deployment-smoke.txt",
  content: [
    "Mira Vale is a navigator in the Dawn Survey Team.",
    "She carries the brass Sun Compass.",
    "The departure briefing takes place at Eastwatch Harbor.",
  ].join("\n"),
});

interface SafeNetworkEntry {
  method: string;
  path: string;
  resourceType: string;
}

interface MediaProbe {
  bytes: number;
  codec: string;
  durationSeconds: number;
  height: number;
  width: number;
}

function requireProductionBaseURL(baseURL: string | undefined): URL {
  const liveRun = process.env.VIDEO_RECORD_LIVE_AI === "true";
  const dryRun = process.env.VIDEO_LIVE_AI_DRY_RUN === "true";
  if (liveRun === dryRun) {
    throw new Error(
      "Select exactly one mode: VIDEO_RECORD_LIVE_AI or VIDEO_LIVE_AI_DRY_RUN.",
    );
  }
  if (baseURL === undefined) {
    throw new Error("Production video base URL is required.");
  }
  const parsed = new URL(baseURL);
  if (
    parsed.origin !== PRODUCTION_ORIGIN ||
    parsed.pathname !== "/" ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error("Shot 14A is restricted to the frozen Production URL.");
  }
  return parsed;
}

function probeMedia(filePath: string): MediaProbe {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-show_entries",
      "stream=width,height,codec_name",
      "-show_entries",
      "format=duration,size",
      "-of",
      "json",
      filePath,
    ],
    { encoding: "utf8", timeout: 30_000, windowsHide: true },
  );
  if (result.status !== 0) {
    throw new Error("ffprobe could not validate the Shot 14A media.");
  }
  const parsed = JSON.parse(result.stdout) as {
    format?: { duration?: string; size?: string };
    streams?: Array<{
      codec_name?: string;
      height?: number;
      width?: number;
    }>;
  };
  const stream = parsed.streams?.[0];
  const probe = {
    bytes: Number.parseInt(parsed.format?.size ?? "", 10),
    codec: stream?.codec_name ?? "",
    durationSeconds: Number.parseFloat(parsed.format?.duration ?? ""),
    height: stream?.height ?? 0,
    width: stream?.width ?? 0,
  };
  if (
    !Number.isFinite(probe.bytes) ||
    !Number.isFinite(probe.durationSeconds)
  ) {
    throw new Error("ffprobe returned incomplete Shot 14A metadata.");
  }
  return probe;
}

function assertFfmpegAvailable(): void {
  const result = spawnSync("ffmpeg", ["-version"], {
    stdio: "ignore",
    timeout: 10_000,
    windowsHide: true,
  });
  if (result.status !== 0) {
    throw new Error("ffmpeg is required before the one-shot Live AI run.");
  }
}

function editLiveWait(
  rawPath: string,
  outputPath: string,
  rawDurationSeconds: number,
): void {
  if (rawDurationSeconds < TARGET_DURATION_SECONDS) {
    throw new Error("Raw Shot 14A recording is shorter than 13 seconds.");
  }
  const tailStart = rawDurationSeconds - TAIL_DURATION_SECONDS;
  const filter = [
    `[0:v]trim=start=0:end=${HEAD_DURATION_SECONDS},setpts=PTS-STARTPTS[v0]`,
    `[0:v]trim=start=${tailStart.toFixed(3)}:end=${rawDurationSeconds.toFixed(3)},setpts=PTS-STARTPTS[v1]`,
    "[v0][v1]concat=n=2:v=1:a=0,scale=1920:1080:flags=lanczos,format=yuv420p[v]",
  ].join(";");
  const result = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      rawPath,
      "-filter_complex",
      filter,
      "-map",
      "[v]",
      "-an",
      "-c:v",
      "libvpx",
      "-deadline",
      "good",
      "-cpu-used",
      "4",
      "-crf",
      "10",
      "-b:v",
      "3M",
      outputPath,
    ],
    { encoding: "utf8", timeout: 120_000, windowsHide: true },
  );
  if (result.status !== 0) {
    throw new Error("ffmpeg could not create the final Shot 14A clip.");
  }
}

async function finalClipMustNotExist(finalClipPath: string): Promise<void> {
  try {
    await access(finalClipPath);
  } catch {
    return;
  }
  throw new Error("Shot 14A success clip already exists; refusing to overwrite.");
}

async function visibleLiveCandidate(page: Page): Promise<{
  candidateName: string;
  sourceReferenceExcerpt: string;
}> {
  await expect(
    page.getByRole("heading", { name: "Entity Candidate Review" }),
  ).toBeVisible({ timeout: 70_000 });

  await applyRecordingUi(
    page,
    `
      .review-header { margin-bottom:14px !important; padding:18px 24px !important; }
      .review-toolbar { margin-bottom:12px !important; }
      .candidate-panel { padding:20px !important; }
      .candidate-panel > p { margin-bottom:8px !important; }
      .candidate-panel > .detail-list,
      .candidate-panel > form,
      .candidate-panel > .form-stack,
      .candidate-panel > .subpanel + .subpanel,
      .phase-footer {
        display:none !important;
      }
    `,
  );

  const candidateList = page.getByRole("navigation", {
    name: "Entity Candidate一覧",
  });
  const miraCandidate = candidateList.getByRole("button", {
    name: /Mira Vale.*pending/u,
  });
  await expect(miraCandidate).toHaveCount(1);
  await miraCandidate.click();

  await expect(
    page.getByRole("heading", { name: "Mira Vale", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".candidate-panel .status-chip"),
  ).toHaveText("pending");
  await expect(
    page.getByRole("button", { name: "Accept as new" }),
  ).toBeVisible();

  const sourcePanel = page
    .getByRole("heading", { name: "SourceRefs" })
    .locator("..");
  const groundedRefs = sourcePanel
    .locator("blockquote")
    .filter({ hasText: "Mira Vale" });
  const groundedExcerpts = await groundedRefs.evaluateAll((elements) => {
    return elements.map((element) => {
      const firstNode = element.firstChild;
      return firstNode?.textContent?.trim() ?? "";
    });
  });
  expect(groundedExcerpts.length).toBeGreaterThan(0);
  const excerpt =
    groundedExcerpts.find((value) => LIVE_DOCUMENT.content.includes(value)) ??
    "";
  expect(excerpt.length).toBeGreaterThan(0);
  expect(LIVE_DOCUMENT.content.includes(excerpt)).toBe(true);
  await expect(sourcePanel).toContainText(LIVE_DOCUMENT.fileName);

  await assertNoVisibleInternalIds(page);
  const visibleText = await page.locator("body").innerText();
  assertNoSecretMaterial(visibleText);
  expect(visibleText).not.toMatch(
    /\b(?:candidate|document|entity|relationship|review|session)-[0-9a-f-]{6,}\b/iu,
  );

  return {
    candidateName: "Mira Vale",
    sourceReferenceExcerpt: excerpt,
  };
}

test.describe.configure({ mode: "serial", retries: 0 });

test("14_live_ai_success records exactly one Production extraction", async ({
  page,
  baseURL,
  request,
}) => {
  test.setTimeout(180_000);
  const isDryRun = process.env.VIDEO_LIVE_AI_DRY_RUN === "true";
  const productionURL = requireProductionBaseURL(baseURL);
  if (!isDryRun) assertFfmpegAvailable();
  await ensureVideoDirectories(paths);

  const finalClipPath = paths.clip("14_live_ai_success.webm");
  const rawClipPath = paths.clip(".14_live_ai_success.raw.webm");
  const editedClipPath = paths.clip(".14_live_ai_success.edited.webm");
  const finalReportPath = paths.report("14_live_ai_success.json");
  const attemptPath = paths.report("14_live_ai_attempt.json");
  const dryRunReportPath = paths.report("14_live_ai_dry_run.json");
  await finalClipMustNotExist(finalClipPath);
  await Promise.all([
    rm(rawClipPath, { force: true }),
    rm(editedClipPath, { force: true }),
    rm(finalReportPath, { force: true }),
    rm(dryRunReportPath, { force: true }),
  ]);
  if (!isDryRun) {
    await writeFile(
      attemptPath,
      `${JSON.stringify(
        {
          shotId: SHOT_ID,
          status: "STARTED",
          productionOrigin: PRODUCTION_ORIGIN,
          postLimit: 1,
          retryPolicy: "none",
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", flag: "wx" },
    );
  }

  const productionRequests: SafeNetworkEntry[] = [];
  const externalRequests: SafeNetworkEntry[] = [];
  const extractResponseStatuses: number[] = [];
  let extractPostAttempts = 0;
  let extractPostsSent = 0;
  let consoleErrors = 0;
  let pageErrors = 0;
  let recordingStarted = false;
  let failureStage = "health-preflight";

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors += 1;
  });
  page.on("pageerror", () => {
    pageErrors += 1;
  });
  page.on("request", (browserRequest) => {
    const url = new URL(browserRequest.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    const entry = {
      method: browserRequest.method(),
      path: url.pathname,
      resourceType: browserRequest.resourceType(),
    };
    if (url.origin === productionURL.origin) {
      productionRequests.push(entry);
    } else {
      externalRequests.push(entry);
    }
  });
  page.on("response", (response) => {
    const browserRequest = response.request();
    const url = new URL(response.url());
    if (
      url.origin === productionURL.origin &&
      url.pathname === "/api/extract" &&
      browserRequest.method() === "POST"
    ) {
      extractResponseStatuses.push(response.status());
    }
  });
  await page.route("**/*", async (route) => {
    const browserRequest = route.request();
    const url = new URL(browserRequest.url());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      await route.continue();
      return;
    }
    if (url.origin !== productionURL.origin) {
      await route.abort("blockedbyclient");
      return;
    }
    if (
      url.pathname === "/api/extract" &&
      browserRequest.method() === "POST"
    ) {
      extractPostAttempts += 1;
      if (extractPostsSent >= 1) {
        await route.abort("blockedbyclient");
        return;
      }
      extractPostsSent += 1;
    }
    await route.continue();
  });

  try {
    const healthResponse = await request.get(
      new URL("/api/health", productionURL).href,
      { timeout: 30_000 },
    );
    expect(healthResponse.status()).toBe(200);
    expect(healthResponse.headers()["cache-control"]).toContain("no-store");
    const health = (await healthResponse.json()) as {
      liveAi?: unknown;
      ok?: unknown;
      schemaVersion?: unknown;
      service?: unknown;
    };
    expect(health).toEqual({
      liveAi: "enabled",
      ok: true,
      schemaVersion: 1,
      service: "creative-knowledge-engine",
    });

    failureStage = "production-ui-prepare";
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /散らばった設定/u }),
    ).toBeVisible();
    await expect(
      page.getByText("Knowledge revision", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "文書をImport" }).click();
    await expect(
      page.getByRole("heading", { name: "GPT-5.6 Live Extraction" }),
    ).toBeVisible();
    const fileNameInput = page.getByRole("textbox", { name: "fileName" });
    const formatInput = page.getByRole("combobox", { name: "format" });
    const mediaTypeInput = page.getByRole("textbox", {
      name: "media type",
    });
    const contentInput = page.getByRole("textbox", { name: "本文" });
    await fileNameInput.fill(LIVE_DOCUMENT.fileName);
    await formatInput.selectOption("plain_text");
    await mediaTypeInput.fill("text/plain");
    await contentInput.fill(LIVE_DOCUMENT.content);
    await expect(fileNameInput).toHaveValue(LIVE_DOCUMENT.fileName);
    await expect(formatInput).toHaveValue("plain_text");
    await expect(mediaTypeInput).toHaveValue("text/plain");
    await expect(contentInput).toHaveValue(LIVE_DOCUMENT.content);

    const consent = page.getByRole("checkbox", {
      name: "この文書内容が抽出のためOpenAI APIへ送信されることを確認しました。",
    });
    const submit = page.getByRole("button", {
      name: "GPT-5.6で抽出してReview",
    });
    await expect(consent).not.toBeChecked();
    await expect(submit).toBeDisabled();
    await consent.check();
    await expect(consent).toBeChecked();
    await expect(submit).toBeEnabled();

    await page.addStyleTag({
      content: `
        .import-layout > section:first-child,
        .import-layout form > label:nth-of-type(1),
        .import-layout form > label:nth-of-type(2),
        .import-layout form > .form-row {
          display:none !important;
        }
        .import-layout { grid-template-columns:minmax(0,1fr) !important; }
        .import-layout > section:last-child {
          width:min(1240px,100%) !important;
          margin:0 auto !important;
        }
        .import-layout textarea { min-height:150px !important; }
      `,
    });
    await expect(
      page.getByRole("heading", { name: "GPT-5.6 Live Extraction" }),
    ).toBeVisible();
    await expect(fileNameInput).toBeVisible();
    await expect(contentInput).toBeVisible();
    await expect(
      page.getByText(
        "結果は自動登録せず、必ずReviewで確認します。",
        { exact: false },
      ),
    ).toBeVisible();
    await expect(submit).toBeVisible();
    await expect(submit).toBeEnabled();
    await assertNoVisibleInternalIds(page);
    assertNoSecretMaterial(await page.locator("body").innerText());
    expect(extractPostAttempts).toBe(0);
    expect(extractPostsSent).toBe(0);
    expect(externalRequests).toHaveLength(0);
    expect(consoleErrors).toBe(0);
    expect(pageErrors).toBe(0);

    if (isDryRun) {
      const dryRunReport = {
        shotId: SHOT_ID,
        status: "PASS",
        mode: "production-ui-preparation-only",
        healthGetCount: 1,
        healthStatus: 200,
        extractPostAttempts: 0,
        extractPostsSent: 0,
        retryCount: 0,
        liveAiUiVisible: true,
        format: "plain_text",
        inputConfigured: true,
        recordingCssApplied: true,
        submitVisible: true,
        submitEnabled: true,
        consoleErrors,
        pageErrors,
        successClipCreated: false,
      };
      const serializedDryRun = JSON.stringify(dryRunReport, null, 2);
      assertNoSecretMaterial(serializedDryRun);
      await writeFile(dryRunReportPath, `${serializedDryRun}\n`, "utf8");
      return;
    }

    await page.screencast.showActions({
      cursor: "pointer",
      duration: 900,
      fontSize: 26,
      position: "top-right",
    });
    await page.screencast.start({
      path: rawClipPath,
      size: { width: 1920, height: 1080 },
      quality: 90,
    });
    recordingStarted = true;
    const recordingStartedAt = Date.now();

    failureStage = "single-production-post";
    expect(extractPostAttempts).toBe(0);
    expect(extractPostsSent).toBe(0);
    await submit.click();
    expect(extractPostAttempts).toBe(1);
    expect(extractPostsSent).toBe(1);
    await expect(submit).toBeDisabled();
    await expect(page.getByRole("status")).toContainText("処理しています");
    await page.screencast.showOverlay(
      `<div style="position:fixed;left:46px;bottom:42px;padding:14px 18px;border-radius:12px;background:rgba(17,48,51,.94);color:white;font:800 25px/1.28 system-ui;box-shadow:0 14px 36px rgba(0,0,0,.22)">` +
        `${escapeHtml("Live AI · GPT-5.6 extracting grounded candidates")}</div>`,
      { duration: 2_700 },
    );

    failureStage = "human-review-result";
    const visibleCandidate = await visibleLiveCandidate(page);
    const resultReadyAt = Date.now();
    await page.screencast.showOverlay(
      `<div style="position:fixed;right:46px;bottom:42px;padding:14px 18px;border-radius:12px;background:rgba(27,97,63,.95);color:white;font:800 25px/1.28 system-ui;box-shadow:0 14px 36px rgba(0,0,0,.22)">` +
        `${escapeHtml("AI proposes · creators decide in Human Review")}</div>`,
      { duration: 4_000 },
    );
    const requiredHoldMs = Math.max(
      9_000 - (Date.now() - resultReadyAt),
      14_000 - (Date.now() - recordingStartedAt),
      0,
    );
    if (requiredHoldMs > 0) {
      await page.waitForTimeout(requiredHoldMs);
    }

    await page.screencast.stop();
    recordingStarted = false;
    await page.screencast.hideActions();

    failureStage = "network-and-ui-assertions";
    expect(extractPostAttempts).toBe(1);
    expect(extractPostsSent).toBe(1);
    expect(extractResponseStatuses).toEqual([200]);
    expect(externalRequests).toHaveLength(0);
    expect(consoleErrors).toBe(0);
    expect(pageErrors).toBe(0);

    const nonAssetPosts = productionRequests.filter(
      (entry) =>
        entry.method === "POST" && entry.path !== "/api/extract",
    );
    expect(nonAssetPosts).toHaveLength(0);

    failureStage = "media-edit-and-validation";
    const rawProbe = probeMedia(rawClipPath);
    editLiveWait(
      rawClipPath,
      editedClipPath,
      rawProbe.durationSeconds,
    );
    const finalProbe = probeMedia(editedClipPath);
    expect(finalProbe.codec).toBe("vp8");
    expect(finalProbe.width).toBe(1920);
    expect(finalProbe.height).toBe(1080);
    expect(finalProbe.durationSeconds).toBeGreaterThanOrEqual(
      MIN_DURATION_SECONDS,
    );
    expect(finalProbe.durationSeconds).toBeLessThanOrEqual(
      MAX_DURATION_SECONDS,
    );
    expect(finalProbe.bytes).toBeGreaterThan(10 * 1024);

    const report = {
      shotId: SHOT_ID,
      status: "PASS",
      productionOrigin: PRODUCTION_ORIGIN,
      targetDurationSeconds: TARGET_DURATION_SECONDS,
      healthGetCount: 1,
      healthStatus: 200,
      extractPostAttempts,
      extractPostsSent,
      extractResponseStatus: extractResponseStatuses[0],
      liveAiRequests: extractPostsSent,
      automaticRetries: 0,
      fixtureExtractionUsed: false,
      fallbackUsed: false,
      liveAiMode: true,
      browserOpenAiRequests: 0,
      productionRequests,
      externalRequests: externalRequests.length,
      consoleErrors,
      pageErrors,
      candidateName: visibleCandidate.candidateName,
      sourceReferenceExcerpt: visibleCandidate.sourceReferenceExcerpt,
      structuredOutputAcceptedByUi: true,
      humanReviewVisible: true,
      automaticAccept: false,
      assertions: {
        extractPostAttempts,
        extractPostsSent,
        extractResponseStatus: extractResponseStatuses[0],
        automaticRetries: 0,
        fixtureExtractionUsed: false,
        fallbackUsed: false,
        structuredOutputAcceptedByUi: true,
        humanReviewVisible: true,
        automaticAccept: false,
      },
      media: finalProbe,
    };
    const serializedReport = JSON.stringify(report, null, 2);
    assertNoSecretMaterial(serializedReport);
    await writeFile(finalReportPath, `${serializedReport}\n`, "utf8");
    await rename(editedClipPath, finalClipPath);
    await writeFile(
      attemptPath,
      `${JSON.stringify(
        {
          shotId: SHOT_ID,
          status: "PASS",
          postAttempts: extractPostAttempts,
          postStatus: extractResponseStatuses[0],
          retryCount: 0,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await rm(rawClipPath, { force: true });

    const promoted = await stat(finalClipPath);
    expect(promoted.size).toBe(finalProbe.bytes);
  } catch (cause) {
    if (recordingStarted) {
      await page.screencast.stop().catch(() => undefined);
    }
    await page.screencast.hideActions().catch(() => undefined);
    await Promise.all([
      rm(rawClipPath, { force: true }),
      rm(editedClipPath, { force: true }),
      rm(finalClipPath, { force: true }),
      rm(finalReportPath, { force: true }),
    ]);
    const failure = {
      shotId: SHOT_ID,
      status: "FAILED",
      failureStage,
      postAttempts: extractPostAttempts,
      postSent: extractPostsSent,
      postStatus: extractResponseStatuses[0] ?? null,
      retryCount: Math.max(0, extractPostAttempts - 1),
      consoleErrors,
      pageErrors,
      successClipCreated: false,
    };
    const serializedFailure = JSON.stringify(failure, null, 2);
    assertNoSecretMaterial(serializedFailure);
    await writeFile(
      isDryRun ? dryRunReportPath : attemptPath,
      `${serializedFailure}\n`,
      "utf8",
    );
    throw new Error(
      isDryRun
        ? `Shot 14A dry run failed at ${failureStage}; Live AI was not invoked.`
        : `Shot 14A failed at ${failureStage}; automatic retry is prohibited.`,
      { cause },
    );
  }
});
