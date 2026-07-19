# Creative Knowledge Engine

Creative Knowledge Engine turns scattered creative material into a structured, searchable, creator-controlled knowledge base.

It is designed as a standalone product and as an integration-ready core module for CreativeOS. Knowledge is the primary domain model; graph views and future AI workflows are consumers of that Knowledge.

## Links

- Live Demo: https://creative-knowledge-engine.vercel.app
- Demo Video: https://www.youtube.com/watch?v=Y0k9MBR0AoA
- Source Code: https://github.com/yusakamotoce-cell/creative-knowledge-engine

## How Codex and GPT-5.6 were used

- **Codex:** Codex supported the project from specification through implementation, architecture review, debugging, testing, and deployment preparation. The resulting domain and application behavior is protected by 620 automated tests, with all changes reviewed before integration.
- **GPT-5.6:** GPT-5.6 powers the optional Live Extraction workflow through the OpenAI Responses API and Structured Outputs. It converts imported creative documents into structured Entity and Relationship candidates with exact source references. AI output never becomes canonical automatically; every candidate requires human review.


## Current status

This repository implements **Step 0–9**: domain contracts, Candidate Review, Import, canonical application, browser persistence, the official Project Astra regression fixture, browser review, deterministic Search, a read-only Knowledge Graph, versioned Knowledge JSON Export, optional server-side GPT-5.6 Live Extraction, and verified Vercel Production deployment. Step 9 is `COMPLETE: PRODUCTION_VERIFIED`.

Implemented:

- Vite, React, and TypeScript foundation
- strict Zod schemas for registered Knowledge and AI create candidates
- Entity, Relationship, SourceRef, AttributeClaim, and AttributeRecord contracts
- deterministic name, attribute key, scalar value, and relation type normalization
- injectable production and test ID generators
- deterministic Entity name index and exact-match Duplicate candidates
- immutable AttributeRecord creation, claim addition, Conflict resolution, and Conflict reopening
- direction-preserving Relationship duplicate keys
- deterministic string and SourceRef unions
- immutable in-memory Review Sessions with `entities → relationships → complete` phases
- Entity Candidate Edit, Accept as new, Merge, and Reject operations
- Candidate attribute provenance expansion across all Candidate SourceRefs
- immediate `candidateId → registeredEntityId` mapping for Accept and Merge
- deterministic Relationship reference resolution and typed blocked states
- manual Relationship endpoint resolution
- Relationship Accept, duplicate-key consolidation, and Reject operations
- injectable production and sequence Clocks
- strict Imported Document contracts for text, Markdown, JSON, and pasted text
- raw-content UTF-8 SHA-256 hashing and idempotent Import Registry
- untrusted Extraction Adapter boundary and synthetic Fixture Adapter
- strict Storage Snapshot contract and immutable Memory Storage Adapter
- atomic Import Service from source content to a stored Review Session
- first-class persistent Review Session IDs
- canonical Knowledge revision and Review Session base revision contracts
- idempotent application of completed Review Sessions to canonical Knowledge
- Review Application history with stale-Session conflict prevention
- strict versioned Storage Envelope and migration decoder boundary
- injected Local Storage Adapter and safe application initialization
- immutable Review Session replacement through an application service
- pure Knowledge Insights for Duplicate, Conflict, Orphan, and statistics projections
- official network-free Project Astra Demo fixture and immutable golden files
- deterministic four-document Project Astra runner through Import, Review, apply, Insights, and reImport
- browser composition root with Local Storage, Fixture Extraction, hashing, IDs, and Clock injection
- React application controller that orchestrates existing domain and application services
- Home, Demo progress, arbitrary Import, Entity Review, Relationship Review, and Knowledge & Insights views
- refresh-safe Review progress after every user decision
- explicit, confirmed Workspace reset through an application service
- responsive and keyboard-operable Candidate Review presentation
- synchronous Entity Search across name, aliases, and tags with Search-only normalization
- deterministic weighted Search ranking with EntityType OR and tag AND filters
- pure read-only Knowledge Graph projection, filtering, and fixed EntityType-lane layout
- keyboard-operable SVG Graph nodes plus a Relationship selection list
- strict Knowledge Export v1 with deterministic two-space JSON serialization
- injected browser download adapter with deterministic date-based filenames
- automated domain and application smoke tests
- architecture decision records
- server-only OpenAI Responses API extraction through `POST /api/extract`
- strict request and response envelopes with safe error mapping and `no-store`
- strict OpenAI provider DTO with key/value attribute arrays, converted server-side to the unchanged domain Candidate Bundle
- GPT-5.6 Structured Outputs followed by provider validation, conversion, Candidate Bundle Zod validation, and grounding
- exact SourceRef grounding on both server and Remote Extraction Adapter
- explicit Fixture-versus-Live adapter routing with no fallback
- Live AI consent, character limit, retained input, and explicit retry UI
- Vercel Web-standard adapters for `/api/extract` and non-billable `/api/health`
- Node 22.x deployment pin and Vite auto-detection contract
- opt-in public deployment smoke with exact SourceRef validation
- tracked/source/build secret-value inspection

Deferred after Step 9:

- IndexedDB adapter and multi-tab synchronization
- Context Bundle
- authentication, billing, and semantic Search
- Step 10 or later functionality

## Core boundaries

- AI returns create-only candidates. It does not return an action, a registered Entity ID, a merge destination ID, or a canonical-value decision.
- The application owns ID generation, exact-match Entity resolution, merge decisions, Conflict detection, reference resolution, and persistence.
- Candidate Review is required before a candidate can become registered Knowledge.
- Entity resolution compares names and aliases only after Unicode NFKC normalization, trimming, whitespace collapse, and lowercasing. It does not use fuzzy matching, edit distance, embeddings, semantic similarity, or AI identity decisions.
- Cross-Entity links are stored as directional Relationships rather than duplicated inside Entities.
- Demo Mode uses the official Project Astra fixture and works without an API key or live AI access.
- Arbitrary-document Live AI is explicit and server-mediated; Project Astra never uses it or falls back to it.

## Requirements

- Node.js 22.x
- npm 10 or later

## Setup

```bash
npm install
```

## Development server

```bash
npm run dev
```

Open the URL printed by Vite. The browser stores one versioned Snapshot under Local Storage key `creative-knowledge-engine:storage:v1`.

### Project Astra Demo

1. Start with an empty Workspace and choose **Project Astra Demoを開始**.
2. Review Document 01 Entities, then Relationships, and apply the Session.
3. Continue through the next prescribed document card. The Demo never skips manifest order.
4. After Document 04, inspect the final Knowledge & Insights view.

The four-document Demo is network-free and needs no API key. Refresh at any point to resume the last successfully saved Import, Review phase, decision, or completed-but-not-applied Session.

### GPT-5.6 Live Extraction

Arbitrary pasted text and `.txt`, `.md`, `.markdown`, and `.json` files use the explicitly injected Remote Extraction Adapter. Before sending, the UI explains that document content is transmitted to OpenAI, requires consent, and enforces a 20,000-character limit. Results always enter Candidate Review and are never auto-Accepted.

Copy `.env.example` to the serverless runtime's local environment and set the key only there:

```text
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6
LIVE_AI_ENABLED=true
```

Never create `VITE_OPENAI_API_KEY`. The browser, Local Storage, source, logs, and error responses must not contain the key. `npm run dev` always supports the Fixture Demo; Live extraction additionally needs a compatible local serverless runtime serving `api/extract.ts` at same-origin `/api/extract`. Step 8 left the platform open; Step 9 fixes Vercel as the deployment target.

The endpoint uses the OpenAI Responses API with `store: false` and strict Structured Outputs. The OpenAI-only provider DTO represents attributes as required `{ key, value }` array items so every generated object can use `additionalProperties: false`. The server rejects duplicate or empty keys and `normalizeAttributeKey` collisions, converts the array to the unchanged domain `Record<string, ScalarValue>`, then applies the existing Candidate Bundle Zod Schema and exact raw SourceRef grounding. It does not retry automatically. Refusal, incomplete output, rate limit, timeout, unavailable service, and invalid output leave the input available for an explicit retry and create no partial saved state.

`store: false` controls whether the generated OpenAI Response is retained for later API retrieval. It is intentionally used together with, not replaced by, the endpoint's `Cache-Control: no-store` response header.

For a real endpoint smoke after the local serverless route is running:

```bash
npm run smoke:live-ai
```

The command uses one short synthetic document and treats a missing server-side key as **not run**, never as success. Configure OpenAI project budgets and rate limits before enabling a public endpoint.

### Vercel deployment

Vercel is the fixed submission target. The project uses Vite auto-detection, runs `npm run build`, publishes `dist`, and serves Web-standard TypeScript functions from `api/`. No `vercel.json` is required for the current layout. Preview must pass before Production.

Configure Preview and Production separately with server-only values:

```text
OPENAI_API_KEY=<server-only secret>
OPENAI_MODEL=gpt-5.6
LIVE_AI_ENABLED=false
```

Begin with Live AI disabled. Verify the Fixture Demo, then publish a Vercel Firewall rate limit for `POST /api/extract`. Production uses a fixed 600-second window, five requests per IP address, and HTTP 429 for excess requests. Only then set `LIVE_AI_ENABLED=true` and run the real smoke. Production follows the same sequence after Preview passes. Use a dedicated OpenAI Project with a minimal key and configured usage notification/budget.

`GET /api/health` never calls OpenAI. It returns only the fixed service envelope and whether Live AI has both a non-disabled setting and a non-blank server key. It does not prove upstream connectivity. All API responses use `Cache-Control: no-store`.

Run the non-billable public checks with:

```powershell
$env:DEPLOYMENT_URL="<Preview URL>"
npm.cmd run smoke:deployment
```

Run exactly one synthetic real API check only after the key and Firewall are configured:

```powershell
$env:DEPLOYMENT_URL="<Preview URL>"
$env:RUN_LIVE_AI="true"
npm.cmd run smoke:deployment
```

The command never prints or saves the raw response and never retries. A missing deployment URL returns a blocked non-success result. Inspect tracked/source/build artifacts with `npm run scan:secrets`.

Public app URL: https://creative-knowledge-engine.vercel.app

Repository URL: https://github.com/yusakamotoce-cell/creative-knowledge-engine

These are the verified Step 9 Production references.

### Search, Graph, and Export

After registered Knowledge exists:

1. Open **Search** to query Entity name, aliases, and tags. Search applies NFKC, trim, Unicode-whitespace collapse, and lowercase without changing canonical Entity matching. EntityType filters are OR and multiple tag filters are AND.
2. Open **Graph** for the read-only directed view. EntityType, relationType, and Orphan filters are derived in memory; node positions use deterministic type lanes and are never persisted.
3. Open **Knowledge**, expand the JSON preview if needed, and choose **Knowledge JSONをダウンロード**. The filename is `creative-knowledge-YYYYMMDD.json`.

Knowledge Export v1 contains the revision and canonical Entity/Relationship Knowledge, including attributes, claims, SourceRefs, and timestamps. It excludes raw Imported Documents, Import Registry, Candidate Bundles, Review Sessions, Review Application history, Local Storage Envelope, UI state, and Insights.

Project Astra provides the repeatable Step 7 check: complete or load its four documents, then verify Search results, the 7-node/5-edge Graph with Quiet Prism as the Orphan, and an Export at revision 4. No API key, network access, or Live AI is required.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit --offline --audit-level=low
npm run scan:secrets
```

Run only the official Project Astra fixture checks with:

```bash
npm test -- src/data/demo/project-astra
```

## Directory structure

```text
api/
  extract.ts              thin Vercel Web adapter over Live extraction
  health.ts               secret-safe, non-billable health adapter
scripts/
  smoke-deployment.mjs    public deployment and opt-in real API smoke
  scan-secrets.mjs        source/build secret-value inspection
src/
  app/                    Step 8 shell, controller, views, Remote adapter, review UI
  server/live-extraction/ prompt, JSON Schema, Responses client, grounding service, HTTP handling
  server/health/          pure health response handling
  core/
    application/          canonical apply, Review Session save, initialization
    candidates/           Candidate Bundle schemas
    entities/             Entity, AttributeRecord, Duplicate logic
    knowledge/            immutable in-memory KnowledgeState
    relationships/        Relationship schema and duplicate key
    review/               two-stage Candidate Review domain
    insights/             pure Knowledge projections
    search/               Search-only normalization, ranking, and filters
    graph/                read-only projection, filters, and deterministic layout
    export/               strict Knowledge Export schema and serialization
    import/               Imported Documents, Registry, Extraction, service
    storage/              Memory/Local adapters and versioned Envelope
    shared/               shared schemas, normalization, IDs, hashing, unions
  data/
    demo/project-astra/    official sources, candidates, golden files, runner
  test/                    shared test setup
notes/
  adr/                     architecture decisions
  devlog/                  development records
  reviews/                 implementation review notes
  submission/              future Build Week submission material
```

Tests are colocated with the domain files they cover. Project Astra contains four Markdown documents and resolves to 7 Entities, 5 Relationships, one Duplicate group, one unresolved Conflict, and one Orphan at Knowledge revision 4.

## Application and domain boundaries

The Step 0–8 public domain exports are available from `src/core/index.ts`. React components do not own or implement domain behavior. Review, Import, apply, initialization, persistence, reset, Insights, Search, Graph, Export, and grounding functions remain React-independent.

`src/app/compositionRoot.ts` is the only application module that accesses `window.localStorage` or loads the Project Astra Fixture for runtime injection. `useApplicationController` owns operation order, busy protection, saved Snapshot adoption, retries, and error mapping. Views receive state and actions as props.

Server modules are never imported by the browser composition path. The composition root injects separate Fixture and Remote adapters; controller actions choose one explicitly. Components do not call `fetch`, OpenAI, or Local Storage directly.

Browser download APIs are isolated in `src/app/download/fileDownloadAdapter.ts`. Components never create Blobs, object URLs, or temporary anchors directly. Search and Graph are pure consumers of the current Snapshot and do not write query, filters, zoom, coordinates, or projection results to Storage.

## Candidate Review behavior

- Candidate Review is a fixed two-stage flow: all Entity Candidates finish before Relationship references are resolved.
- Accept and Merge update Knowledge immediately and register the Candidate-to-Entity mapping immediately.
- A blocked Relationship requires manual endpoint resolution or explicit Reject; a reject recommendation never auto-rejects it.
- Candidate attributes use all distinct Candidate SourceRefs for provenance.

## Import and Storage behavior

- The raw content string alone is hashed with SHA-256; BOM, whitespace, JSON formatting, and line-ending differences are preserved.
- An existing content hash returns the first Imported Document without rerunning Extraction or saving again.
- Extraction Adapter output is always treated as untrusted and passed through the strict Candidate Bundle Schema.
- A successful first import stores the Document, Registry entry, and Review Session in one snapshot while leaving root Knowledge unchanged.
- Completed Sessions replace canonical Knowledge only through the application service.
- A stale Session is rejected when its base revision differs from current Knowledge revision.
- Reapplying one Session returns its existing application record without saving again.
- Memory and injected Local Storage Adapters share the same strict Snapshot contract.
- Local persistence uses a versioned Envelope and never silently resets corrupt data.
- Every Review decision and phase transition replaces the saved Session through `saveReviewSession`.
- Completion is saved before canonical apply, so `complete_not_applied` remains retryable after an apply failure.
- Reset is always an explicit two-step action that saves one empty Snapshot; the Local Storage key is not removed directly.
- IndexedDB is not implemented.

## Project Astra Demo fixture

- The fixture follows `PROJECT_ASTRA_FIXTURE_CONTRACT_v1.0.md` and does not call a network or require an API key.
- Four fixed Markdown sources map to four strict Candidate Bundles through the same Fixture Extraction Adapter and domain workflow used by tests.
- The runner performs Accept, Merge, Edit, Relationship consolidation, Duplicate acceptance, Reject, blocked Relationship rejection, four applies, Insights calculation, and idempotent reImport verification.
- The browser UI follows that same domain path, derives Demo progress from the persisted Snapshot, and directs each successful apply to the next ordered document.
- Source hashes are calculated from the exact UTF-8 raw content. Golden Knowledge and Insights files are immutable test inputs and are never updated by tests.

The final browser state is 7 Entities, 5 Relationships, revision 4, one Duplicate group, one unresolved Conflict, and one Orphan.

## Manual verification

The Step 6 workflow checklist remains in `notes/reviews/STEP_6_MANUAL_CHECKLIST.md`. Step 7 Search, Graph, and Export checks are in `notes/reviews/STEP_7_MANUAL_CHECKLIST.md`. Step 8 Live AI consent, endpoint, failure, and security checks are in `notes/reviews/STEP_8_MANUAL_CHECKLIST.md`. Step 9 Preview, Production, WAF, public browser, and real API status is in `notes/reviews/STEP_9_DEPLOYMENT_CHECKLIST.md`.

## Deferred integration questions

IndexedDB, multi-tab synchronization, Context Bundle, authentication, billing, semantic/fuzzy Search, editable or persisted Graph layout, export import, and all Step 10+ behavior are deferred. Step 9's Production platform rate limit and real API verification are complete.

The Step 9 deployment status and decisions are recorded in `notes/reviews/STEP_9_DEPLOYMENT_CHECKLIST.md` and `notes/reviews/STEP_9_IMPLEMENTATION_DECISIONS.md`. Step 9 is `COMPLETE: PRODUCTION_VERIFIED`; the Production Live AI smoke is the required real API pass.
