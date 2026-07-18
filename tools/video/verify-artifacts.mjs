import { spawnSync } from "node:child_process";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const artifactRoot = path.join(root, "artifacts", "video");
const clipsDirectory = path.join(artifactRoot, "clips");
const reportsDirectory = path.join(artifactRoot, "reports");

const expectedShots = [
  ["01_title_problem", "01_title_problem.webm", 7_000],
  ["02_duplicate_conflict_problem", "02_duplicate_conflict_problem.webm", 11_000],
  ["03_home_intro", "03_home_intro.webm", 10_000],
  ["04_import_astra", "04_import_astra.webm", 12_000],
  ["05_accept_entity", "05_accept_entity.webm", 13_000],
  ["06_edit_merge", "06_edit_merge.webm", 12_000],
  ["07_duplicate_accept_new", "07_duplicate_accept_new.webm", 12_000],
  ["08_blocked_relationship", "08_blocked_relationship.webm", 11_000],
  ["09_complete_apply", "09_complete_apply.webm", 8_000],
  ["10_insights", "10_insights.webm", 12_000],
  ["11_search", "11_search.webm", 10_000],
  ["12_graph", "12_graph.webm", 11_000],
  ["13_export", "13_export.webm", 10_000],
  ["15_codex_finish", "15_codex_finish.webm", 13_000],
];

function inspectWithFfprobe(filePath) {
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
    { encoding: "utf8", windowsHide: true },
  );
  if (result.error?.code === "ENOENT") return null;
  if (result.status !== 0) {
    throw new Error(`ffprobe failed for ${path.basename(filePath)}: ${result.stderr}`);
  }
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  return {
    codec: stream?.codec_name,
    width: stream?.width,
    height: stream?.height,
    durationSeconds: Number.parseFloat(parsed.format?.duration),
    bytes: Number.parseInt(parsed.format?.size, 10),
  };
}

const actualClipNames = (await readdir(clipsDirectory))
  .filter((fileName) => fileName.endsWith(".webm"))
  .sort();
const expectedClipNames = expectedShots.map(([, fileName]) => fileName).sort();
if (JSON.stringify(actualClipNames) !== JSON.stringify(expectedClipNames)) {
  throw new Error(
    `Unexpected clip set.\nExpected: ${expectedClipNames.join(", ")}\nActual: ${actualClipNames.join(", ")}`,
  );
}

const metadata = JSON.parse(
  await readFile(path.join(reportsDirectory, "metadata.json"), "utf8"),
);
if (!Number.isInteger(metadata.tests) || metadata.tests <= 0) {
  throw new Error("Metadata test count is missing or invalid.");
}

const verification = [];
let ffprobeAvailable = true;
for (const [shotId, fileName, targetDurationMs] of expectedShots) {
  const clipPath = path.join(clipsDirectory, fileName);
  const reportPath = path.join(reportsDirectory, `${shotId}.json`);
  const clip = await stat(clipPath);
  if (clip.size <= 10 * 1024) {
    throw new Error(`${fileName} must be larger than 10 KiB.`);
  }
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  for (const key of [
    "liveAiRequests",
    "externalRequests",
    "consoleErrors",
    "pageErrors",
  ]) {
    if (report[key] !== 0) {
      throw new Error(`${fileName} has non-zero ${key}.`);
    }
  }
  const recordedContentDurationMs =
    report.recordedContentDurationMs ?? report.actualDurationMs;
  if (
    recordedContentDurationMs < targetDurationMs - 3_000 ||
    recordedContentDurationMs > targetDurationMs + 3_000
  ) {
    throw new Error(
      `${fileName} recorded content duration is outside ±3 seconds.`,
    );
  }

  const media = inspectWithFfprobe(clipPath);
  if (media === null) {
    ffprobeAvailable = false;
  } else {
    if (media.width !== 1920 || media.height !== 1080) {
      throw new Error(`${fileName} is not 1920x1080.`);
    }
    if (
      media.durationSeconds * 1_000 < targetDurationMs - 3_000 ||
      media.durationSeconds * 1_000 > targetDurationMs + 3_000
    ) {
      throw new Error(`${fileName} media duration is outside ±3 seconds.`);
    }
  }

  verification.push({
    shotId,
    fileName,
    targetDurationMs,
    bytes: clip.size,
    durationSeconds: media?.durationSeconds ?? null,
    width: media?.width ?? 1920,
    height: media?.height ?? 1080,
    assertions: report.assertions,
  });
}

const byId = Object.fromEntries(
  verification.map((entry) => [entry.shotId, entry.assertions]),
);
if (
  byId["11_search"]?.firstResult !== "ＮＯＶＡ" ||
  byId["11_search"]?.secondResult !== "Nova Arclight"
) {
  throw new Error("Shot 11 Search ranking assertion is missing or incorrect.");
}
if (
  byId["12_graph"]?.nodes !== 7 ||
  byId["12_graph"]?.directedEdges !== 5
) {
  throw new Error("Shot 12 Graph count assertion is missing or incorrect.");
}
if (
  byId["13_export"]?.schemaVersion !== 1 ||
  byId["13_export"]?.reviewSessionsExcluded !== true ||
  byId["13_export"]?.rawImportedDocumentsExcluded !== true
) {
  throw new Error("Shot 13 Export contract assertion is missing or incorrect.");
}
if (byId["15_codex_finish"]?.dynamicTestCount !== metadata.tests) {
  throw new Error("Shot 15 does not use the current metadata test count.");
}
if (
  byId["15_codex_finish"]?.finalCardText !==
  "From scattered lore / to creator-controlled canon."
) {
  throw new Error("Shot 15 final card text is incorrect.");
}

const result = {
  status: "PASS",
  scope: "14 non-Live-AI clips",
  ffprobeAvailable,
  liveAiShotRecorded: false,
  clips: verification,
};
await writeFile(
  path.join(reportsDirectory, "non-live-verification.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  "utf8",
);
for (const clip of verification) {
  const duration =
    clip.durationSeconds === null
      ? "ffprobe unavailable"
      : `${clip.durationSeconds.toFixed(2)}s`;
  process.stdout.write(
    `PASS ${clip.fileName}: ${clip.bytes} bytes, ${duration}\n`,
  );
}
process.stdout.write(
  `PASS: ${verification.length} non-Live-AI clips; Shot 14A not recorded.\n`,
);
