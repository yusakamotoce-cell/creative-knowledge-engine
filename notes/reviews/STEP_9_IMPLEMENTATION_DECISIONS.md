# Step 9 Implementation Decisions

**Status:** BLOCKED — REAL_API_NOT_VERIFIED

**Date:** 2026-07-17

## Starting point

Implementation started from commit `3040e17 Complete Creative Knowledge Engine Step 8` with a clean working tree and no configured Git remote. The existing 561 tests, typecheck, lint, production build, and offline audit all passed before work began.

## Vercel and Node

Vercel is fixed as the deployment target. Local Node was measured at 22.17.0; Vercel currently supports Node 22.x, so `package.json.engines.node` is `22.x`. Vite auto-detection, `npm run build`, and `dist` satisfy the current layout, so no `vercel.json` was added. This avoids unnecessary rewrites, CORS, runtime, or security-header configuration.

No `maxDuration` is set because the Vercel plan and its permitted duration are not known. The existing OpenAI client timeout remains 55 seconds; platform duration must be checked against the selected plan before enabling Live AI.

References used for platform compatibility:

- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions

## Function export and health

`api/extract.ts` now exports Vercel's Web-standard default object with `fetch(request)`. It only translates Web Request/Response and environment values into the existing server HTTP handler, LiveExtractionService, and OpenAI client. Prompt, provider Schema, conversion, domain validation, grounding, and error mapping remain in existing server modules.

`GET /api/health` is a non-billable endpoint. It returns only schema version, fixed service name, and `enabled`/`disabled`; it never calls OpenAI. Disabled means the key is absent/blank or `LIVE_AI_ENABLED=false`. GET returns 200; other methods return safe 405; all responses are JSON with `Cache-Control: no-store` and no wildcard CORS.

## Environment separation and dedicated OpenAI Project

Preview and Production must be configured separately with server-only `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-5.6`, and `LIVE_AI_ENABLED`. Each environment starts with Live AI disabled. A dedicated OpenAI Project, minimal key, usage notification/budget, and available model access must be configured manually. No key was requested, read, logged, or stored during local work.

## Vercel Firewall and Preview-first release

Public Live AI requires a published Vercel Firewall rate-limit rule for `POST /api/extract`, same IP/client, five requests per minute, HTTP 429. An in-memory counter is deliberately absent. Production remains disabled until Preview passes and the equivalent Production rule is verified.

Reference used for the manual platform rule:

- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

## Deployment smoke and secret inspection

`npm run smoke:deployment` requires an HTTPS `DEPLOYMENT_URL`. It checks the app root, strict health envelope, `no-store`, GET `/api/extract` 405, wildcard CORS absence, and safe errors. It does not call OpenAI by default. `RUN_LIVE_AI=true` enables exactly one synthetic POST with no retry; the raw response is neither printed nor saved. The script validates the success envelope, converted domain attributes record, document ID, scalar values, and exact SourceRef grounding.

`npm run scan:secrets` scans Git tracked and untracked source, `dist`, source maps, available Vercel function output, and `.env.local` without printing matched values. It allows the `OPENAI_API_KEY` variable name but rejects key-shaped values, Bearer key values, a known test marker, and a non-empty key value in `.env.local`. Exit codes are 0 clean, 1 findings, and 2 scanner error.

## Real API smoke result

**BLOCKED: REAL_API_NOT_VERIFIED.** No Git remote, Vercel project, Preview URL, dedicated OpenAI Project/key, or published WAF rule is available in the workspace. The deployment smoke and actual OpenAI Responses API call therefore were not executed. Local mocks are not counted as real API success.

The local `vercel` command is not installed. The non-billable deployment smoke was invoked without a URL and correctly returned `BLOCKED: DEPLOYMENT_URL_NOT_SET` rather than success.

## Local verification

- 61 test files and 594 tests passed, including the existing 561 tests.
- typecheck, lint, and the Vite production build passed; the build transformed 191 modules.
- offline audit reported 0 vulnerabilities.
- secret scan reported 0 values across 297 tracked/untracked source and built text artifacts.
- the browser entry graph contains no server module, and the built browser assets contain no OpenAI upstream URL, provider schema name, or developer prompt symbol.
- `git diff --check` passed; new untracked files also have no trailing whitespace.

## Production URL and stable commit

- Public app URL:
- Repository URL:
- Stable commit:

These fields remain blank rather than containing guessed or placeholder URLs. The starting Step 8 commit is known, but there is no completed Step 9 commit.

## Known limitations

- Preview and Production builds, public browser behavior, console/network state, WAF behavior, and public headers remain unverified.
- Real model access, Structured Outputs compatibility, `store: false`, provider conversion, grounding, Review/Apply, and reImport through the deployed endpoint remain unverified.
- Additional security headers were not added because Step 9 requires real browser compatibility checks first.
- GitHub repository creation, Vercel configuration, OpenAI Project setup, environment values, WAF publication, and deployments require explicit authenticated user actions.

## Scope protection

No Context Bundle, IndexedDB, authentication, billing, semantic Search, product feature, or Step 10 work was added. Project Astra frozen material, Fixture Contract, Candidate Bundles, golden JSON, and upper specifications remain unchanged.
