# Step 7 Implementation Decisions

**Status:** Implemented Step 7 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `5cf2842 Complete Creative Knowledge Engine Step 6`. `CODEX_STEP_7.md` was the only untracked file. The existing 367 tests, typecheck, lint, and production build all passed before Step 7 work began.

## Search normalization and scope

Search uses its own NFKC → trim → Unicode-whitespace collapse → lowercase function. This function is not imported by canonical Entity matching, Duplicate detection, Relationship resolution, attribute-key normalization, or Import hashing. Search reads only Entity name, aliases, and tags; description, attributes, claims, SourceRef excerpts, Relationships, Documents, and Sessions are intentionally invisible.

## Ranking and filters

The strongest field match determines the score. Fixed scores and tie-breaking follow Step 7 section 6. EntityType selections are OR, tag selections are normalized exact-match AND, and filters combine with a non-empty query by AND. Empty query returns the filtered Knowledge order with score zero. Available tag labels preserve their first original spelling and occurrence.

The Project Astra example row for query `nova` lists `ent-astra-001, ent-astra-006`, while the same document's formal score table requires the opposite ranking: `ent-astra-006` is a name exact match (900), and `ent-astra-001` is an alias exact match (850). The implementation treats the formal scoring contract as determinative and returns `ent-astra-006, ent-astra-001`. Both Entities are still present, and this discrepancy is retained explicitly rather than changing frozen fixture data or inventing a special case.

## Graph projection and layout

Projection preserves Entity and Relationship order, derives original orphan and relationship counts, and preserves direction. Filtering removes edges only when their type or displayed endpoints do not pass. A relation filter can temporarily isolate a non-Orphan without reclassifying or removing it. Layout is a pure fixed-lane projection with no graph dependency, force simulation, or randomness.

Graph projection, filters, zoom, and coordinates are not persisted. Graph rebuilds from the current Snapshot after initialization or refresh. Invalid projection data is rejected with `GRAPH_PROJECTION_FAILED`; Graph never repairs a dangling Relationship.

The controller separately remembers whether the user is following all relation types. While that mode is active, relation types introduced by newly applied Knowledge become selected automatically; after an explicit subset is chosen, only that subset is retained. This is transient UI state and is never stored. A browser smoke that grew Knowledge from revision 0 to 4 exposed and verified this boundary.

## Shared selection

`selectedEntityId` remains controller-owned and is shared across Search, Graph, and Knowledge. The reusable Entity detail component owns attributes, directional Relationship summaries, timestamps, and SourceRefs. Relationship selection is also controller-owned for Graph, but does not change canonical Knowledge.

## Export schema and exclusions

`KnowledgeExportV1` is a strict Zod schema with exactly `schemaVersion: 1`, `knowledgeRevision`, and canonical `knowledge`. Serialization uses two-space JSON and exactly one trailing newline, adds no current timestamp, and validates before output. Imported Document content, Import Registry, Candidate and Review state, application history, Local Storage Envelope, UI state, and Insights are excluded.

## Browser download boundary

React components request export through the application controller. `BrowserFileDownloadAdapter` alone owns Blob, object URL, temporary anchor, click, removal, and URL revocation. The controller injects the current date only into `creative-knowledge-YYYYMMDD.json`; the date is not written into JSON.

## Dependencies and protected contracts

No dependency was added. Existing Entity matching, Duplicate, Relationship reference resolution, attribute-key normalization, Import hash, Candidate Bundle, Project Astra golden files, and frozen specifications were not changed.

## Deferred work

Live AI, serverless functions, Context Bundle, IndexedDB, multi-tab synchronization, semantic or fuzzy Search, token query parsing, editable Graph behavior, graph layout persistence, export import, and every Step 8+ feature remain out of scope.
