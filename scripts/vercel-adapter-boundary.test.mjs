import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function relativeImports(source) {
  const specifiers = [];
  const expression = /\b(?:import|export)\s+(?:[\s\S]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (const match of source.matchAll(expression)) {
    if (match[1]?.startsWith(".")) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveModule(fromPath, specifier) {
  const base = resolve(dirname(fromPath), specifier);
  const candidates = extname(base).length > 0
    ? [base]
    : [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        `${base}.mjs`,
        `${base}.json`,
        resolve(base, "index.ts"),
        resolve(base, "index.tsx"),
      ];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

function browserModuleGraph(entry) {
  const visited = new Set();
  const pending = [entry];
  while (pending.length > 0) {
    const path = pending.pop();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    if ([".json", ".css"].includes(extname(path))) continue;
    const source = readFileSync(path, "utf8");
    for (const specifier of relativeImports(source)) {
      const dependency = resolveModule(path, specifier);
      if (dependency !== undefined) pending.push(dependency);
    }
  }
  return [...visited];
}

describe("Vercel adapter boundary", () => {
  it("keeps server modules out of the browser entry graph", () => {
    const graph = browserModuleGraph(resolve(workspace, "src", "main.tsx"));
    expect(graph.length).toBeGreaterThan(10);
    expect(
      graph.filter((path) => path.includes(`${resolve(workspace, "src", "server")}\\`)),
    ).toEqual([]);
  });

  it("keeps api/extract.ts as a thin adapter over the existing server service", () => {
    const source = readFileSync(resolve(workspace, "api", "extract.ts"), "utf8");
    expect(source).toContain(
      'from "../src/server/live-extraction/httpHandler.js"',
    );
    expect(source).not.toContain("creative_knowledge_candidate_bundle");
    expect(source).not.toContain("LIVE_EXTRACTION_DEVELOPER_PROMPT");
    expect(source).not.toContain("providerCandidateBundleJsonSchema");
  });

  it.each(["health.ts", "extract.ts"])(
    "uses explicit ESM file specifiers in api/%s",
    (fileName) => {
      const source = readFileSync(resolve(workspace, "api", fileName), "utf8");
      const specifiers = relativeImports(source);
      expect(specifiers.length).toBeGreaterThan(0);
      expect(specifiers.every((specifier) => specifier.endsWith(".js"))).toBe(
        true,
      );
      expect(specifiers.every((specifier) => !specifier.endsWith("/index.js"))).toBe(
        true,
      );
    },
  );
});
