# Creative Knowledge Engine

Creative Knowledge Engine turns scattered creative material into a structured, searchable, creator-controlled knowledge base.

It is designed as a standalone product and as an integration-ready core module for CreativeOS. Knowledge is the primary domain model; graph views and future AI workflows are consumers of that Knowledge.

## Current status

This repository currently implements **Step 0–1: repository foundation and domain contracts**.

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
- automated domain and application smoke tests
- architecture decision records

Not implemented in Step 0–1:

- Project Astra fixture files
- Candidate Review UI or state transitions
- Import UI or parsing flow
- Storage Adapter implementation
- Knowledge Insights screens
- Graph and Search
- Live AI and serverless functions
- Context Bundle
- Step 2 or later functionality

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
    relationships/        Relationship schema and duplicate key
    insights/             reserved for a later step
    import/               reserved for a later step
    storage/              reserved for a later step
    shared/               shared schemas, normalization, IDs, unions
  data/
    demo/                  reserved for frozen Project Astra fixtures
  test/                    shared test setup
notes/
  adr/                     architecture decisions
  devlog/                  development records
  reviews/                 implementation review notes
  submission/              future Build Week submission material
```

Tests are colocated with the domain files they cover. No Project Astra fixture data is generated in Step 0–1.

## Domain entry point

The Step 0–1 public domain exports are available from `src/core/index.ts`. React components do not own or implement domain behavior.

## Deferred integration questions

Three rules remain explicitly deferred because their workflows are outside Step 0–1:

- how Merge updates the `candidateId → registeredEntityId` map;
- how a Candidate attribute selects SourceRefs when converted into AttributeClaims;
- how Search normalizes query and indexed strings.

They are recorded in `notes/reviews/STEP_0-1_IMPLEMENTATION_DECISIONS.md` and must be resolved before their respective later-step implementations.
