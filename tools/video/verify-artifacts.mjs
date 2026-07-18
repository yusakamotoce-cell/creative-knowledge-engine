import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const shotId = process.env.VIDEO_SHOT?.trim() || "05_accept_entity";
if (shotId !== "05_accept_entity") {
  throw new Error(
    `The A1 proof milestone currently verifies only 05_accept_entity, not ${shotId}.`,
  );
}

const root = process.cwd();
const clipPath = path.join(
  root,
  "artifacts",
  "video",
  "clips",
  "05_accept_entity.webm",
);
const reportPath = path.join(
  root,
  "artifacts",
  "video",
  "reports",
  "05_accept_entity.json",
);
const clip = await stat(clipPath);
if (clip.size <= 10 * 1024) {
  throw new Error("Proof clip must be larger than 10 KiB.");
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
if (report.liveAiRequests !== 0 || report.externalRequests !== 0) {
  throw new Error("Proof shot must have zero Live AI and external requests.");
}
if (
  report.actualDurationMs < report.targetDurationMs - 3_000 ||
  report.actualDurationMs > report.targetDurationMs + 3_000
) {
  throw new Error("Proof shot duration is outside the ±3 second allowance.");
}
process.stdout.write(
  `PASS ${report.fileName}: ${clip.size} bytes, ${report.actualDurationMs} ms\n`,
);
