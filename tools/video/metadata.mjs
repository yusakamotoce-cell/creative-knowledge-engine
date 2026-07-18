import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { URL } from "node:url";

import { parseVitestSummary } from "./metadataSupport.mjs";

const root = process.cwd();
const reportsDirectory = path.join(root, "artifacts", "video", "reports");

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  }).trim();
}

function safeBaseURL(raw) {
  const value = raw?.trim() || "http://127.0.0.1:4173/";
  const parsed = new URL(value);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    throw new Error("VIDEO_BASE_URL is not safe for metadata.");
  }
  if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
  return parsed.toString();
}

const npmExecutable =
  process.env.npm_execpath === undefined
    ? null
    : [process.execPath, [process.env.npm_execpath, "test"]];
if (npmExecutable === null) {
  throw new Error("Run video:metadata through npm so npm_execpath is available.");
}
const testOutput = run(npmExecutable[0], npmExecutable[1]);
const testSummary = parseVitestSummary(testOutput);
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
const metadata = {
  gitCommit: run("git", ["rev-parse", "--short", "HEAD"]),
  gitBranch: run("git", ["branch", "--show-current"]),
  playwrightVersion: packageJson.devDependencies["@playwright/test"],
  baseURL: safeBaseURL(process.env.VIDEO_BASE_URL),
  liveAiVariant: "success",
  testFiles: testSummary.testFiles,
  tests: testSummary.tests,
};
const serialized = `${JSON.stringify(metadata, null, 2)}\n`;
if (
  /\bsk-[A-Za-z0-9_-]{12,}\b/u.test(serialized) ||
  /\bOPENAI_API_KEY\s*=/u.test(serialized)
) {
  throw new Error("Metadata contains secret-like material.");
}

await mkdir(reportsDirectory, { recursive: true });
await writeFile(
  path.join(reportsDirectory, "metadata.json"),
  serialized,
  "utf8",
);
process.stdout.write(
  `Video metadata: ${testSummary.testFiles} files / ${testSummary.tests} tests\n`,
);
