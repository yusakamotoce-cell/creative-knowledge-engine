import { spawn } from "node:child_process";
import { once } from "node:events";
import { get } from "node:http";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

const root = process.cwd();
const requestedTests = process.argv.slice(2);
if (requestedTests.length === 0) {
  throw new Error("Pass at least one Playwright video test path.");
}

const localBaseURL = "http://127.0.0.1:4173/";
const externalBaseURL = process.env.VIDEO_BASE_URL?.trim();
let preview;
let previewExit;

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const request = get(url, (response) => {
        response.resume();
        resolve(
          response.statusCode !== undefined && response.statusCode < 500,
        );
      });
      request.setTimeout(1_000, () => request.destroy());
      request.on("error", () => resolve(false));
    });
    if (ready) return;
    await delay(150);
  }
  throw new Error(`Timed out waiting for video preview at ${url}`);
}

async function stopPreview() {
  if (preview === undefined || preview.exitCode !== null) return;
  preview.kill();
  await Promise.race([previewExit, delay(3_000)]);
  if (preview.exitCode === null) {
    preview.kill("SIGKILL");
    await previewExit;
  }
}

try {
  const baseURL = externalBaseURL || localBaseURL;
  if (externalBaseURL === undefined || externalBaseURL.length === 0) {
    preview = spawn(
      process.execPath,
      [
        path.join(root, "node_modules", "vite", "bin", "vite.js"),
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        "4173",
      ],
      {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    previewExit = once(preview, "exit");
    await waitForServer(localBaseURL);
  }

  const playwright = spawn(
    process.execPath,
    [
      path.join(root, "node_modules", "playwright", "cli.js"),
      "test",
      "--config=playwright.video.config.ts",
      ...requestedTests,
    ],
    {
      cwd: root,
      env: { ...process.env, VIDEO_BASE_URL: baseURL },
      stdio: "inherit",
      windowsHide: true,
    },
  );
  const [exitCode] = await once(playwright, "exit");
  if (exitCode !== 0) {
    process.exitCode = typeof exitCode === "number" ? exitCode : 1;
  }
} finally {
  await stopPreview();
}
