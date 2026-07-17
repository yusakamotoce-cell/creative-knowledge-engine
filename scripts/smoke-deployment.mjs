/* global AbortController, URL, clearTimeout, console, fetch, process, setTimeout */

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEPLOYMENT_SMOKE_DOCUMENT = Object.freeze({
  id: "deployment-smoke-001",
  fileName: "deployment-smoke.txt",
  format: "plain_text",
  mediaType: "text/plain",
  content: [
    "Mira Vale is a navigator in the Dawn Survey Team.",
    "She carries the brass Sun Compass.",
    "The departure briefing takes place at Eastwatch Harbor.",
  ].join("\n"),
});

export class DeploymentSmokeError extends Error {
  constructor(code, options) {
    super(code, options);
    this.name = "DeploymentSmokeError";
    this.code = code;
  }
}

function fail(code, cause) {
  throw new DeploymentSmokeError(code, cause === undefined ? undefined : { cause });
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join("\0") === [...keys].sort().join("\0")
  );
}

function assertNoWildcardCors(response) {
  if (response.headers.get("access-control-allow-origin") === "*") {
    fail("WILDCARD_CORS_DETECTED");
  }
}

function assertNoStore(response) {
  const cacheControl = response.headers.get("cache-control") ?? "";
  if (!cacheControl.toLowerCase().split(",").some((part) => part.trim() === "no-store")) {
    fail("NO_STORE_HEADER_MISSING");
  }
}

function assertSafePayload(value) {
  const forbiddenKeys = new Set([
    "authorization",
    "apikey",
    "openai_api_key",
    "stack",
  ]);
  const visit = (current) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!isRecord(current)) return;
    for (const [key, child] of Object.entries(current)) {
      if (forbiddenKeys.has(key.toLowerCase())) fail("UNSAFE_RESPONSE_METADATA");
      visit(child);
    }
  };
  visit(value);

  const serialized = JSON.stringify(value);
  if (/Bearer\s+sk-/i.test(serialized) || /sk-[A-Za-z0-9_-]{20,}/.test(serialized)) {
    fail("SECRET_PATTERN_DETECTED");
  }
}

async function readJson(response, code) {
  try {
    const body = await response.json();
    assertSafePayload(body);
    return body;
  } catch (cause) {
    if (cause instanceof DeploymentSmokeError) throw cause;
    fail(code, cause);
  }
}

async function fetchWithTimeout(fetcher, url, init, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } catch (cause) {
    if (controller.signal.aborted) fail("REQUEST_TIMEOUT", cause);
    fail("REQUEST_FAILED", cause);
  } finally {
    clearTimeout(timeoutId);
  }
}

function deploymentBaseUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("DEPLOYMENT_URL_NOT_SET");
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch (cause) {
    fail("DEPLOYMENT_URL_INVALID", cause);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0
  ) {
    fail("DEPLOYMENT_URL_INVALID");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed;
}

function endpoint(baseUrl, path) {
  const result = new URL(baseUrl);
  const basePath = baseUrl.pathname === "/" ? "" : baseUrl.pathname;
  result.pathname = `${basePath}${path}`;
  return result;
}

function assertHealth(body) {
  if (
    !hasExactKeys(body, ["ok", "schemaVersion", "service", "liveAi"]) ||
    body.ok !== true ||
    body.schemaVersion !== 1 ||
    body.service !== "creative-knowledge-engine" ||
    (body.liveAi !== "enabled" && body.liveAi !== "disabled")
  ) {
    fail("HEALTH_ENVELOPE_INVALID");
  }
}

function assertSafeMethodFailure(body) {
  if (
    !hasExactKeys(body, ["ok", "schemaVersion", "error"]) ||
    body.ok !== false ||
    body.schemaVersion !== 1 ||
    !isRecord(body.error) ||
    body.error.code !== "METHOD_NOT_ALLOWED" ||
    typeof body.error.message !== "string"
  ) {
    fail("EXTRACT_METHOD_ENVELOPE_INVALID");
  }
}

function assertScalar(value) {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    fail("CANDIDATE_BUNDLE_INVALID");
  }
}

function isNonEmptyTrimmedString(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

const ENTITY_TYPES = new Set([
  "character",
  "scene",
  "location",
  "item",
  "organization",
]);

function assertSourceRefs(sourceRefs, document) {
  if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) {
    fail("SOURCE_REF_MISSING");
  }
  for (const sourceRef of sourceRefs) {
    if (
      !hasExactKeys(sourceRef, ["documentId", "fileName", "excerpt"]) ||
      sourceRef.documentId !== document.id ||
      sourceRef.fileName !== document.fileName ||
      typeof sourceRef.excerpt !== "string" ||
      sourceRef.excerpt.length === 0 ||
      !document.content.includes(sourceRef.excerpt)
    ) {
      fail("SOURCE_REF_UNGROUNDED");
    }
  }
}

function assertReference(reference) {
  if (!isRecord(reference)) fail("CANDIDATE_BUNDLE_INVALID");
  const keys = Object.keys(reference);
  if (
    keys.some(
      (key) => !["candidateId", "name", "entityType"].includes(key),
    ) ||
    keys.length === 0
  ) {
    fail("CANDIDATE_BUNDLE_INVALID");
  }
  if (
    (reference.candidateId !== undefined &&
      !isNonEmptyTrimmedString(reference.candidateId)) ||
    (reference.name !== undefined && !isNonEmptyTrimmedString(reference.name)) ||
    (reference.candidateId === undefined && reference.name === undefined)
  ) {
    fail("CANDIDATE_BUNDLE_INVALID");
  }
  if (
    reference.entityType !== undefined &&
    !ENTITY_TYPES.has(reference.entityType)
  ) {
    fail("CANDIDATE_BUNDLE_INVALID");
  }
}

function assertCandidateBundle(bundle, document) {
  if (
    !hasExactKeys(bundle, ["schemaVersion", "documentId", "entities", "relationships"]) ||
    bundle.schemaVersion !== 1 ||
    bundle.documentId !== document.id ||
    !Array.isArray(bundle.entities) ||
    !Array.isArray(bundle.relationships) ||
    bundle.entities.length + bundle.relationships.length === 0
  ) {
    fail("CANDIDATE_BUNDLE_INVALID");
  }

  const candidateIds = new Set();

  for (const entity of bundle.entities) {
    if (
      !hasExactKeys(entity, [
        "candidateId",
        "entityType",
        "name",
        "aliases",
        "description",
        "attributes",
        "tags",
        "sourceRefs",
      ]) ||
      !isNonEmptyTrimmedString(entity.candidateId) ||
      !ENTITY_TYPES.has(entity.entityType) ||
      !isNonEmptyTrimmedString(entity.name) ||
      !Array.isArray(entity.aliases) ||
      !entity.aliases.every(isNonEmptyTrimmedString) ||
      typeof entity.description !== "string" ||
      !isRecord(entity.attributes) ||
      !Array.isArray(entity.tags) ||
      !entity.tags.every((tag) => typeof tag === "string") ||
      candidateIds.has(entity.candidateId)
    ) {
      fail("CANDIDATE_BUNDLE_INVALID");
    }
    candidateIds.add(entity.candidateId);
    Object.values(entity.attributes).forEach(assertScalar);
    assertSourceRefs(entity.sourceRefs, document);
  }

  for (const relationship of bundle.relationships) {
    if (
      !hasExactKeys(relationship, [
        "candidateId",
        "fromRef",
        "toRef",
        "relationType",
        "description",
        "sourceRefs",
      ]) ||
      !isNonEmptyTrimmedString(relationship.candidateId) ||
      !isNonEmptyTrimmedString(relationship.relationType) ||
      typeof relationship.description !== "string" ||
      candidateIds.has(relationship.candidateId)
    ) {
      fail("CANDIDATE_BUNDLE_INVALID");
    }
    candidateIds.add(relationship.candidateId);
    assertReference(relationship.fromRef);
    assertReference(relationship.toRef);
    assertSourceRefs(relationship.sourceRefs, document);
  }
}

function assertLiveSuccess(body, document) {
  if (
    !hasExactKeys(body, ["ok", "schemaVersion", "candidateBundle", "meta"]) ||
    body.ok !== true ||
    body.schemaVersion !== 1 ||
    !isRecord(body.meta) ||
    !hasExactKeys(body.meta, ["model", "promptVersion"]) ||
    typeof body.meta.model !== "string" ||
    body.meta.model.length === 0 ||
    typeof body.meta.promptVersion !== "string" ||
    body.meta.promptVersion.length === 0
  ) {
    fail("LIVE_SUCCESS_ENVELOPE_INVALID");
  }
  assertCandidateBundle(body.candidateBundle, document);
}

export async function runDeploymentSmoke({
  deploymentUrl,
  runLiveAi = false,
  fetcher = fetch,
  timeoutMs = 65_000,
}) {
  const baseUrl = deploymentBaseUrl(deploymentUrl);

  const rootResponse = await fetchWithTimeout(
    fetcher,
    endpoint(baseUrl, "/"),
    { method: "GET" },
    timeoutMs,
  );
  const rootText = await rootResponse.text();
  if (
    rootResponse.status !== 200 ||
    !rootText.includes("Creative Knowledge Engine") ||
    !rootText.includes('id="root"')
  ) {
    fail("APP_ROOT_INVALID");
  }

  const healthResponse = await fetchWithTimeout(
    fetcher,
    endpoint(baseUrl, "/api/health"),
    { method: "GET" },
    timeoutMs,
  );
  assertNoWildcardCors(healthResponse);
  assertNoStore(healthResponse);
  const healthBody = await readJson(healthResponse, "HEALTH_JSON_INVALID");
  if (healthResponse.status !== 200) fail("HEALTH_STATUS_INVALID");
  assertHealth(healthBody);

  const methodResponse = await fetchWithTimeout(
    fetcher,
    endpoint(baseUrl, "/api/extract"),
    { method: "GET" },
    timeoutMs,
  );
  assertNoWildcardCors(methodResponse);
  assertNoStore(methodResponse);
  const methodBody = await readJson(
    methodResponse,
    "EXTRACT_METHOD_JSON_INVALID",
  );
  if (methodResponse.status !== 405) fail("EXTRACT_METHOD_STATUS_INVALID");
  assertSafeMethodFailure(methodBody);

  if (!runLiveAi) {
    return Object.freeze({
      root: "PASS",
      health: "PASS",
      extractMethod: "PASS",
      liveAi: "NOT_RUN",
    });
  }
  if (healthBody.liveAi !== "enabled") fail("LIVE_AI_DISABLED");

  const liveResponse = await fetchWithTimeout(
    fetcher,
    endpoint(baseUrl, "/api/extract"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        document: DEPLOYMENT_SMOKE_DOCUMENT,
      }),
    },
    timeoutMs,
  );
  assertNoWildcardCors(liveResponse);
  assertNoStore(liveResponse);
  const liveBody = await readJson(liveResponse, "LIVE_RESPONSE_JSON_INVALID");
  if (liveResponse.status !== 200) fail("LIVE_RESPONSE_STATUS_INVALID");
  assertLiveSuccess(liveBody, DEPLOYMENT_SMOKE_DOCUMENT);

  return Object.freeze({
    root: "PASS",
    health: "PASS",
    extractMethod: "PASS",
    liveAi: "PASS",
  });
}

export async function deploymentSmokeMain(
  environment,
  dependencies = {},
) {
  try {
    const result = await runDeploymentSmoke({
      deploymentUrl: environment.DEPLOYMENT_URL,
      runLiveAi: environment.RUN_LIVE_AI === "true",
      fetcher: dependencies.fetcher ?? fetch,
      timeoutMs: dependencies.timeoutMs ?? 65_000,
    });
    return {
      exitCode: 0,
      message: `PASS: deployment smoke passed (Live AI: ${result.liveAi}).`,
    };
  } catch (error) {
    const code =
      error instanceof DeploymentSmokeError ? error.code : "UNEXPECTED_FAILURE";
    const blocked =
      code === "DEPLOYMENT_URL_NOT_SET" || code === "DEPLOYMENT_URL_INVALID";
    return {
      exitCode: blocked ? 2 : 1,
      message: `${blocked ? "BLOCKED" : "FAIL"}: ${code}`,
    };
  }
}

const invokedPath = process.argv[1] === undefined ? undefined : resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const result = await deploymentSmokeMain(process.env);
  if (result.exitCode === 0) console.log(result.message);
  else console.error(result.message);
  process.exitCode = result.exitCode;
}
