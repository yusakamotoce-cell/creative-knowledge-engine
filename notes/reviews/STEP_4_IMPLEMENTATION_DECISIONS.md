# Step 4 Implementation Decisions

**Status:** Implemented Step 4 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `4073dd2 Complete Creative Knowledge Engine Step 3`. The tracked tree was clean; the user-provided `CODEX_STEP_4.md` was untracked. The existing 220 tests, typecheck, lint, and production build all passed before Step 4 work began.

## Knowledge revision and Session base revision

`knowledgeRevision` is a nonnegative integer stored with canonical Knowledge. Empty Storage starts at zero. It increments by exactly one only when a completed Session is applied for the first time. Import, load, failure, and repeated apply do not increment it.

Every Review Session records the current revision as `baseKnowledgeRevision` when Import Service creates it. Review transitions never change that value. Application requires exact equality with the current canonical revision; stale Sessions are rejected without automatic rebase, 3-way merge, or last-write-wins replacement.

## Review Application Record and replacement

Successful application appends one record containing Session ID, injected time, and consecutive from/to revisions. Session ID is unique, history order is apply order, and history revisions form a continuous chain ending at current Knowledge revision.

Canonical Knowledge is replaced by the completed Session Knowledge rather than merged because the Session already contains the deterministic result of its Review workflow. Reapplying that Session returns `already_applied` and does not call Clock or save. `REVIEW_SESSION_ALREADY_APPLIED` is reserved and is not emitted for this normal idempotent result.

## Persistence Envelope and migration boundary

The Local Storage value is a compact JSON Envelope with `schemaVersion: 1`. Decode selects an explicit decoder from a version map and then validates the full current Snapshot. The pipeline has an entry for v1 but no old-version migrations in Step 4. Missing or unsupported versions are not inferred.

The default Local Storage key is `creative-knowledge-engine:storage:v1`. A caller may inject another key and must inject a `KeyValueStorage`; core code never reads `window`.

## Corrupt data and error boundaries

Invalid JSON, Envelope shape, unsupported version, and invalid Snapshot remain distinct Storage Adapter errors. Local API read/write exceptions use `LOCAL_STORAGE_READ_FAILED` and `LOCAL_STORAGE_WRITE_FAILED`. Application services wrap adapter load/save failures with the existing `STORAGE_LOAD_FAILED` and `STORAGE_SAVE_FAILED` boundary codes while retaining the cause.

Corrupt persisted data is never replaced with an empty Snapshot and is never removed. Empty Snapshot is returned only when the injected key-value storage reports that no value exists.

## Deferred work

Candidate Review UI, Import UI, React state wiring, IndexedDB, multi-tab synchronization, Undo/Redo, rebase, merge, Search, Insights, Graph, Live AI, and Context Bundle remain outside Step 4. Search normalization remains undecided.

No Project Astra Fixture was generated. The post-freeze R-2 gaps remain confirmation items before Fixture generation.
