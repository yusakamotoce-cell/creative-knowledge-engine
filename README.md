# Creative Knowledge Engine

Creative Knowledge Engine turns scattered creative material into a structured, searchable, creator-controlled knowledge base.

It is designed as a standalone product and as an integration-ready core module for CreativeOS. Knowledge is the primary domain model; graph views and future AI workflows are consumers of that Knowledge.

## Current status

This repository currently implements **Step 0–3: domain contracts, Candidate Review, and Import/Storage boundaries**.

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
- automated domain and application smoke tests
- architecture decision records

Not implemented through Step 3:

- Project Astra fixture files
- Candidate Review UI
- Import and Candidate Review UI
- localStorage and IndexedDB adapters
- Knowledge Insights screens
- Graph and Search
- Live AI and serverless functions
- Context Bundle
- Step 4 or later functionality

## Core boundaries

- AI returns create-only candidates. It does not return an action, a registered Entity ID, a merge destination ID, or a canonical-value decision.
- The application owns ID generation, exact-match Entity resolution, merge decisions, Conflict detection, reference resolution, and persistence.
- Candidate Review is required before a candidate can become registered Knowledge.
- Entity resolution compares names and aliases only after Unicode NFKC normalization, trimming, whitespace collapse, and lowercasing. It does not use fuzzy matching, edit distance, embeddings, semantic similarity, or AI identity decisions.
- Cross-Entity links are stored as directional Relationships rather than duplicated inside Entities.
- Demo Mode is the future judging path and must work without live AI access.
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

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Directory structure

```text
src/
  app/                    minimal Step 0–1 application shell
  core/
    candidates/           Candidate Bundle schemas
    entities/             Entity, AttributeRecord, Duplicate logic
    knowledge/            immutable in-memory KnowledgeState
    relationships/        Relationship schema and duplicate key
    review/               two-stage Candidate Review domain
    insights/             reserved for a later step
    import/               Imported Documents, Registry, Extraction, service
    storage/              strict snapshot and Memory Adapter
    shared/               shared schemas, normalization, IDs, hashing, unions
  data/
    demo/                  reserved for frozen Project Astra fixtures
  test/                    shared test setup
notes/
  adr/                     architecture decisions
  devlog/                  development records
  reviews/                 implementation review notes
  submission/              future Build Week submission material
```

Tests are colocated with the domain files they cover. No Project Astra fixture data is generated through Step 3.

## Domain entry point

The Step 0–3 public domain exports are available from `src/core/index.ts`. React components do not own or implement domain behavior. Review and Import functions use injected Clock, ID, hashing, extraction, and storage dependencies.

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
- Step 3 includes Memory Storage only. It does not access localStorage or IndexedDB.

## Deferred integration questions

Search string normalization remains deliberately unresolved because Search is outside Step 3. Browser persistence, product UI, Project Astra Fixture generation, and all Step 4+ behavior are also deferred.

The Step 3 decisions and Project Astra carryover are recorded in `notes/reviews/STEP_3_IMPLEMENTATION_DECISIONS.md`.
