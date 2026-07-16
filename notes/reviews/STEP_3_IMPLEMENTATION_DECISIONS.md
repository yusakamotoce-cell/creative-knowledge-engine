# Step 3 Implementation Decisions

**Status:** Implemented Step 3 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `040c651 Complete Creative Knowledge Engine Step 2`. The tracked tree was clean; the user-provided `CODEX_STEP_3.md` was untracked. The existing 154 tests, typecheck, lint, and production build all passed before Step 3 work began.

## Raw-content hash boundary

Only the Imported Document `content` string is encoded as UTF-8 and hashed. File name, source kind, format, media type, IDs, and timestamps are excluded. Content is never normalized, trimmed, reformatted, or given line-ending conversion before hashing. A BOM and CRLF/LF differences therefore remain observable content differences.

The Import Registry uses lowercase 64-character content SHA-256 as its sole unique key. The first document ID, first import time, and entry order are retained. Hash collision recovery and forced re-extraction are not implemented.

## Review Session ID API change

Review Session now has a required persistent `id`. `createReviewSession` accepts an injected `IdGenerator` dependency and calls `nextId("review-session")` after Candidate Bundle and Knowledge validation. All existing Step 2 tests use an explicit deterministic generator; review transitions are unchanged.

## Untrusted Extraction boundary

`ExtractionAdapter` deliberately returns `unknown` because Fixture and future Live AI results require runtime validation. Import Service always applies the existing strict Candidate Bundle Schema, rejects extra decision fields without repair, and checks that Bundle and Imported Document IDs match.

## Import atomicity and re-import behavior

The Import Service builds the complete next snapshot before its single save. Extraction failure, invalid Bundle data, document-ID mismatch, or Review Session creation failure performs no save and therefore writes no Document, Registry entry, or Session.

When raw-content hash already exists, the service returns the original document and first matching Session without calling Extraction, ID generation, Clock, or save. A dangling Registry reference is rejected and never auto-repaired.

## Knowledge ownership boundary

Root snapshot Knowledge is unchanged by import. The new Review Session receives current Knowledge as its immutable initial working copy. Applying completed Session Knowledge back to the root store remains a Step 4 integration concern.

## Deferred persistence and product features

Step 3 provides only strict Memory Storage. localStorage and IndexedDB are intentionally deferred, along with UI, Search, Insights, Graph, Live AI, and Context Bundle. Search normalization remains undecided because no Search contract is implemented.

No Project Astra Fixture was generated. The R-2 gaps recorded in `PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md` remain confirmation items before Fixture generation.
