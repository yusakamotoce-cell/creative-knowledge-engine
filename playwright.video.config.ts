import { defineConfig } from "@playwright/test";
import process from "node:process";

import { resolveVideoTarget } from "./tools/video/config.js";

const target = resolveVideoTarget(process.env.VIDEO_BASE_URL);
const selectedShot = process.env.VIDEO_SHOT?.trim();

export default defineConfig({
  testDir: "./tools/video",
  outputDir: "./test-results-video",
  timeout: 180_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  preserveOutput: "always",
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report-video", open: "never" }],
  ],
  ...(selectedShot === undefined || selectedShot.length === 0
    ? {}
    : { grep: new RegExp(selectedShot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }),
  use: {
    baseURL: target.baseURL,
    browserName: "chromium",
    headless: true,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
});
