import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
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
  const extension = extname(base);
  const candidates = extension === ".js"
    ? [base, `${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`]
    : extension.length > 0
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

function moduleRelativeImports(source, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const specifiers = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith(".")
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier !== undefined &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith(".")
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }

  const visit = (node) => {
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal) &&
      node.argument.literal.text.startsWith(".")
    ) {
      specifiers.push(node.argument.literal.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      node.arguments[0].text.startsWith(".")
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);

  return specifiers;
}

function inlineTypeImportSpecifiers(source, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const specifiers = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.startsWith(".") &&
      statement.importClause?.namedBindings !== undefined &&
      ts.isNamedImports(statement.importClause.namedBindings) &&
      statement.importClause.namedBindings.elements.some(
        (element) => element.isTypeOnly,
      )
    ) {
      specifiers.push(statement.moduleSpecifier.text);
    }
  }

  return specifiers;
}

function moduleGraph(entry) {
  const files = new Set();
  const edges = [];
  const pending = [entry];
  while (pending.length > 0) {
    const filePath = pending.pop();
    if (filePath === undefined || files.has(filePath)) continue;
    files.add(filePath);
    const source = readFileSync(filePath, "utf8");
    for (const specifier of moduleRelativeImports(source, filePath)) {
      const dependency = resolveModule(filePath, specifier);
      edges.push({ filePath, specifier, dependency });
      if (dependency !== undefined) pending.push(dependency);
    }
  }
  return { files: [...files], edges };
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

  it("keeps every extraction import edge ESM-explicit and barrel-free", () => {
    const graph = moduleGraph(resolve(workspace, "api", "extract.ts"));
    expect(graph.files).toHaveLength(20);
    expect(graph.edges).toHaveLength(56);
    expect(
      graph.edges.filter(
        ({ specifier, dependency }) =>
          !specifier.endsWith(".js") ||
          dependency === undefined ||
          basename(dependency) === "index.ts",
      ),
    ).toEqual([]);
    expect(graph.files).not.toContain(
      resolve(workspace, "src", "core", "import", "index.ts"),
    );
    expect(
      graph.files.flatMap((filePath) =>
        inlineTypeImportSpecifiers(readFileSync(filePath, "utf8"), filePath),
      ),
    ).toEqual([]);
  });
});
