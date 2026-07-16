import { describe, expect, it } from "vitest";

import {
  scanSecretEntries,
  scanTextForSecrets,
  secretScanExitResult,
} from "./scan-secrets.mjs";

const OPENAI_KEY_TEST_VALUE = [
  "sk",
  "proj",
  "abcdefghijklmnopqrstuvwxyz123456",
].join("-");
const TEST_SECRET_MARKER = ["server", "secret", "value"].join("-");

describe("secret scan", () => {
  it("allows the server environment variable name and an empty example", () => {
    expect(
      scanTextForSecrets(".env.example", "OPENAI_API_KEY=\nLIVE_AI_ENABLED=true\n"),
    ).toEqual([]);
    expect(
      scanTextForSecrets("api/extract.ts", "process.env.OPENAI_API_KEY"),
    ).toEqual([]);
  });

  it.each([
    ["source.ts", `const value = '${OPENAI_KEY_TEST_VALUE}';`, "OPENAI_KEY_PATTERN"],
    ["bundle.js", `Authorization: Bearer ${OPENAI_KEY_TEST_VALUE}`, "OPENAI_KEY_PATTERN"],
    ["test.ts", TEST_SECRET_MARKER, "TEST_SECRET_MARKER"],
    [".env.local", "OPENAI_API_KEY=local-private-test-token", "ENV_LOCAL_OPENAI_KEY_VALUE"],
  ])("detects %s without returning the matched value", (path, text, code) => {
    const findings = scanTextForSecrets(path, text);
    expect(findings).toEqual(expect.arrayContaining([expect.objectContaining({ path, code })]));
    expect(JSON.stringify(findings)).not.toContain("abcdefghijklmnopqrstuvwxyz123456");
    expect(JSON.stringify(findings)).not.toContain("local-private-test-token");
  });

  it("returns exit code 0 when no values are found", () => {
    const scan = scanSecretEntries([
      { path: "api/extract.ts", text: "process.env.OPENAI_API_KEY" },
      { path: ".env.example", text: "OPENAI_API_KEY=" },
    ]);
    expect(scan).toEqual({ scannedFiles: 2, findings: [] });
    expect(secretScanExitResult(scan)).toEqual({
      exitCode: 0,
      messages: ["PASS: secret scan found no secret values in 2 text files."],
    });
  });

  it("returns exit code 1 and paths only when findings exist", () => {
    const scan = scanSecretEntries([
      { path: "dist/assets/app.js", text: TEST_SECRET_MARKER },
    ]);
    const result = secretScanExitResult(scan);
    expect(result.exitCode).toBe(1);
    expect(result.messages).toContain("TEST_SECRET_MARKER: dist/assets/app.js");
    expect(result.messages.join("\n")).not.toContain(TEST_SECRET_MARKER);
  });
});
