# Step 8 Implementation Decisions

**Status:** Implemented Step 8 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `a7e45f7 Complete Creative Knowledge Engine Step 7`. `CODEX_STEP_8.md` was the only untracked file. The existing 418 tests, typecheck, lint, production build, and offline audit all passed before Step 8 work began.

## Server and OpenAI boundary

The public boundary is same-origin `POST /api/extract`. `api/extract.ts` is a thin serverless adapter; prompt construction, OpenAI request handling, runtime validation, grounding, and safe HTTP mapping live in provider-independent server modules. Native `fetch` and `AbortController` are used, so no runtime or development dependency was added.

The server owns `OPENAI_API_KEY`, `OPENAI_MODEL`, and `LIVE_AI_ENABLED`. The fixed upstream URL is `https://api.openai.com/v1/responses`; default model is `gpt-5.6`; reasoning effort is low; output ceiling is 12,000 tokens; timeout is 55 seconds; streaming, tools, previous response IDs, and automatic retries are absent. `store: false` is always sent so OpenAI does not retain the generated Response for later API retrieval; HTTP `Cache-Control: no-store` remains a separate browser/proxy cache control. Prompt version is `creative-knowledge-candidate-extraction-v1`.

## Request contract and existing Import formats

The existing Import domain has three format enum values—`plain_text`, `markdown`, and `json`—plus two source modes, including pasted text. Step 8's phrase “existing four formats” is interpreted as the four accepted UI inputs (`.txt`, `.md/.markdown`, `.json`, and pasted text), not authority to add a fourth domain format. The Live request therefore reuses the unchanged three-value `ImportFormat` schema and omits `sourceKind`, hash, time, Registry, Knowledge, and Session data.

Requests are strict and reject unknown fields, NUL, blank values, invalid formats, filename over 255 characters, media type over 100 characters, content over 20,000 characters, or content over 80 KiB UTF-8. Every response is JSON with `Cache-Control: no-store`; wildcard CORS is not emitted.

## Structured Outputs and runtime authority

The OpenAI Structured Outputs contract is a provider DTO rather than the domain Candidate Bundle itself. It preserves the Candidate Bundle field structure except that Entity attributes use `Array<{ key: string; value: ScalarValue }>` instead of a dynamic-key record. Every object, including array items and EntityReference variants, sets `additionalProperties: false`; every declared field is required; no schema-valued `additionalProperties` remains.

After parsing the provider DTO, the server converts each attributes array to the unchanged domain `Record<string, ScalarValue>`. Conversion preserves the raw key but rejects an empty normalized key, duplicate raw keys, collisions after the existing `normalizeAttributeKey`, and values outside the existing ScalarValue union. This boundary exists because OpenAI's Structured Outputs subset cannot directly express the domain's dynamic-key record without violating its strict-object requirements. The existing Candidate Bundle type, Zod Schema, Import Service, Review flow, and Fixture data remain unchanged.

Structured Outputs is not treated as domain validation. The server validates provider DTO → converts → validates the existing Candidate Bundle Zod Schema → applies exact SourceRef grounding. The browser Remote Adapter repeats the domain Schema and grounding checks before the existing Import Service sees the output.

## Pre-commit API compatibility correction

On 2026-07-17, the provider DTO separation and `store: false` were added before the Step 8 commit. The correction follows the OpenAI Structured Outputs requirements that every field be required and every object disable additional properties, while keeping the frozen domain and Fixture contracts unchanged.

## Exact grounding and limits

The pure grounding validator checks bundle document ID, every SourceRef document ID and filename, non-empty exact raw excerpt inclusion, bundle-wide unique Candidate IDs, Entity/Relationship counts, collection sizes, and string ceilings. It performs no Unicode or newline normalization and does not mutate input. Project Astra Fixture output is not routed through this new Live-only validator and its golden files remain unchanged.

## Explicit adapter routing and persistence

Application dependencies now name Fixture and Live adapters separately. Project Astra always selects Fixture; arbitrary documents always select Remote. No hash, failure, or content heuristic can select or fall back between them. The existing Import Service still owns hashing, reImport detection, ID/Clock issuance, Candidate validation, Review Session creation, and a single atomic save. Consequently, failure saves nothing and identical raw content bypasses Live extraction on reImport.

## UI, consent, and errors

The Import view separates offline Demo from `GPT-5.6 Live Extraction`. It states that content is sent to OpenAI, that Review is required, and that no browser API-key field exists. The send action is disabled until content is present, within 20,000 characters, and explicit consent is checked. Busy state blocks double submission. Errors are safe typed UI messages; input and consent remain available for an explicit retry.

## Local development and real API smoke

Plain `npm run dev` continues to run the network-free Fixture Demo even when no serverless route emulator is present. Live extraction requires a compatible local serverless runtime that serves `api/extract.ts` at the same origin. `npm run smoke:live-ai` uses one short synthetic document, sends no API key in its HTTP request, checks the endpoint Candidate Bundle and exact evidence, and refuses to report success when `OPENAI_API_KEY` is absent.

No real OpenAI API smoke test was executed during this implementation because no authorized server-side API key and running local serverless endpoint were provided. This is recorded as **not run**, not passed or skipped-success.

## Dependencies and protected artifacts

No dependency was added. Project Astra v1.0, Fixture Contract, Fable review, Candidate Bundles, final Knowledge JSON, all golden JSON, and upper specifications were not modified. Search, Graph, Export, canonical Entity matching, Duplicate detection, Relationship resolution, attribute-key normalization, and Import hashing contracts remain unchanged.

## Deferred work

Public endpoint rate limiting, authentication, billing, deployment-platform selection, production observability/redaction policy, IndexedDB, Context Bundle, semantic Search, and every Step 9+ feature remain out of scope.
