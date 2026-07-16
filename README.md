# Creative Knowledge Engine

Creative Knowledge Engine turns scattered creative material into a structured, searchable, creator-controlled knowledge base.

It is designed as a standalone product and as an integration-ready core module for CreativeOS. Knowledge is the primary domain model; graph views and future AI workflows are consumers of that Knowledge.

## Current status

This repository currently implements **Step 0–6: domain contracts, Candidate Review, Import, canonical application, browser persistence, the official Project Astra regression fixture, and the complete browser review workflow**.

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
- automated domain and application smoke tests
- architecture decision records

Not implemented through Step 6:

- IndexedDB adapter and multi-tab synchronization
- Graph and Search
- Live AI and serverless functions
- Context Bundle
- Step 7 or later functionality

## Core boundaries

- AI returns create-only candidates. It does not return an action, a registered Entity ID, a merge destination ID, or a canonical-value decision.
- The application owns ID generation, exact-match Entity resolution, merge decisions, Conflict detection, reference resolution, and persistence.
- Candidate Review is required before a candidate can become registered Knowledge.
- Entity resolution compares names and aliases only after Unicode NFKC normalization, trimming, whitespace collapse, and lowercasing. It does not use fuzzy matching, edit distance, embeddings, semantic similarity, or AI identity decisions.
- Cross-Entity links are stored as directional Relationships rather than duplicated inside Entities.
- Demo Mode uses the official Project Astra fixture and works without an API key or live AI access.
- Live AI is not implemented in this step.

## Requirements

- Node.js 22 or later
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

Arbitrary pasted text and `.txt`, `.md`, `.markdown`, and `.json` files can be submitted through Import. Step 6 intentionally has only Fixture-based extraction, so content without a saved Project Astra extraction result reports `FIXTURE_NOT_FOUND` and is not partially saved.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Run only the official Project Astra fixture checks with:

```bash
npm test -- src/data/demo/project-astra
```

## Directory structure

```text
src/
  app/                    Step 6 shell, controller, views, review UI, Demo progress
  core/
    application/          canonical apply, Review Session save, initialization
    candidates/           Candidate Bundle schemas
    entities/             Entity, AttributeRecord, Duplicate logic
    knowledge/            immutable in-memory KnowledgeState
    relationships/        Relationship schema and duplicate key
    review/               two-stage Candidate Review domain
    insights/             pure Knowledge projections
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

The Step 0–6 public domain exports are available from `src/core/index.ts`. React components do not own or implement domain behavior. Review, Import, apply, initialization, persistence, reset, and Insights functions remain React-independent.

`src/app/compositionRoot.ts` is the only application module that accesses `window.localStorage` or loads the Project Astra Fixture for runtime injection. `useApplicationController` owns operation order, busy protection, saved Snapshot adoption, retries, and error mapping. Views receive state and actions as props.

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

The repeatable browser, keyboard, persistence, error, 1280 px, and 768 px checks are recorded in `notes/reviews/STEP_6_MANUAL_CHECKLIST.md`.

## Deferred integration questions

Search string normalization remains deliberately unresolved because Search is outside Step 6. IndexedDB, Graph, Search, Live AI, serverless functions, Context Bundle, and all Step 7+ behavior are deferred.

The Step 6 decisions are recorded in `notes/reviews/STEP_6_IMPLEMENTATION_DECISIONS.md`.
