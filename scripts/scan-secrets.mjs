/* global console, process */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SECRET_PATTERNS = Object.freeze([
  {
    code: "OPENAI_KEY_PATTERN",
    expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  },
  {
    code: "BEARER_OPENAI_KEY",
    expression: /Bearer\s+sk-(?:proj-)?[A-Za-z0-9_-]{20,}/i,
  },
  {
    code: "TEST_SECRET_MARKER",
    expression: new RegExp(["server", "secret", "value"].join("-")),
  },
]);

function normalizedPath(path) {
  return path.replaceAll("\\", "/");
}

function isEnvironmentLocal(path) {
  return /(^|\/)\.env\.local$/i.test(normalizedPath(path));
}

function hasEnvironmentValue(text) {
  return text.split(/\r?\n/).some((line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) return false;
    const separator = trimmed.indexOf("=");
    if (separator < 1) return false;
    const name = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    return name === "OPENAI_API_KEY" && value.length > 0;
  });
}

export function scanTextForSecrets(path, text) {
  const findings = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.expression.test(text)) {
      findings.push(Object.freeze({ path: normalizedPath(path), code: pattern.code }));
    }
  }
  if (isEnvironmentLocal(path) && hasEnvironmentValue(text)) {
    findings.push(
      Object.freeze({
        path: normalizedPath(path),
        code: "ENV_LOCAL_OPENAI_KEY_VALUE",
      }),
    );
  }
  return findings;
}

export function scanSecretEntries(entries) {
  const findings = entries.flatMap(({ path, text }) =>
    scanTextForSecrets(path, text),
  );
  return Object.freeze({
    scannedFiles: entries.length,
    findings: Object.freeze(findings),
  });
}

function recursivelyListFiles(root, current, result) {
  if (!existsSync(current)) return;
  const stats = statSync(current);
  if (stats.isFile()) {
    result.add(resolve(current));
    return;
  }
  if (!stats.isDirectory()) return;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const child = resolve(current, entry.name);
    if (entry.isDirectory()) recursivelyListFiles(root, child, result);
    else if (entry.isFile()) result.add(child);
  }
}

function discoverFiles(root) {
  const files = new Set();
  const output = execFileSync(
    "git",
    [
      "-c",
      `safe.directory=${normalizedPath(root)}`,
      "ls-files",
      "-co",
      "--exclude-standard",
      "-z",
    ],
    { cwd: root },
  );
  for (const path of output.toString("utf8").split("\0")) {
    if (path.length > 0) files.add(resolve(root, path));
  }

  recursivelyListFiles(root, resolve(root, "dist"), files);
  recursivelyListFiles(root, resolve(root, ".vercel", "output", "functions"), files);
  const localEnvironment = resolve(root, ".env.local");
  if (existsSync(localEnvironment)) files.add(localEnvironment);
  return [...files].sort();
}

function readTextEntries(root, files) {
  const entries = [];
  for (const path of files) {
    const buffer = readFileSync(path);
    if (buffer.includes(0)) continue;
    entries.push({
      path: normalizedPath(relative(root, path)),
      text: buffer.toString("utf8"),
    });
  }
  return entries;
}

export function runSecretScan(root) {
  return scanSecretEntries(readTextEntries(root, discoverFiles(root)));
}

export function secretScanExitResult(result) {
  if (result.findings.length === 0) {
    return {
      exitCode: 0,
      messages: [
        `PASS: secret scan found no secret values in ${result.scannedFiles} text files.`,
      ],
    };
  }
  return {
    exitCode: 1,
    messages: [
      `FAIL: secret scan found ${result.findings.length} potential secret value(s).`,
      ...result.findings.map((finding) => `${finding.code}: ${finding.path}`),
    ],
  };
}

const invokedPath = process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = secretScanExitResult(runSecretScan(process.cwd()));
    result.messages.forEach((message) => {
      if (result.exitCode === 0) console.log(message);
      else console.error(message);
    });
    process.exitCode = result.exitCode;
  } catch {
    console.error("ERROR: secret scan could not complete.");
    process.exitCode = 2;
  }
}
