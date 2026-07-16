# Step 6 Implementation Decisions

**Status:** Implemented Step 6 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `9282283 Complete Creative Knowledge Engine Step 5`. `CODEX_STEP_6.md` was the only untracked file. The existing 328 tests, typecheck, lint, and production build all passed before Step 6 work began.

## App views and controller ownership

The application uses explicit `home | import | review | knowledge` state without a router dependency. Components collect input and render state. A single controller owns initialization, busy protection, domain-operation ordering, Review Session persistence, completion/application, navigation after success, reset, and user-facing error mapping.

The controller consistently trusts the validated Snapshot returned by `importDocument`, `saveReviewSession`, `applyCompletedReviewSession`, and `resetWorkspace`; it does not perform an extra reload after a successful service call.

## Browser composition and Local Storage

The browser composition root injects the existing `LocalStorageAdapter`, Fixture Extraction Adapter, Web Crypto SHA-256 hasher, production ID generator, and production Clock. `window.localStorage` is accessed only there. The existing key `creative-knowledge-engine:storage:v1` remains unchanged, and no dependency was added.

Project Astra's fixed ID and Clock sequences must survive refresh between individual decisions. The composition root reconstructs each sequence by excluding IDs and timestamps already present in Imported Documents, Sessions, Applications, and registered Knowledge. It does not store a separate cursor.

## Demo progress and ordering

Project Astra progress is derived only from manifest-ordered Imported Documents, Review Session phases, and Review Application records. The first incomplete document always wins. After an apply, the UI opens the Import view with the next prescribed document card; after the fourth apply it opens Knowledge & Insights.

If unrelated data exists, Demo does not start until the user explicitly chooses a destructive Demo reset. A completed Demo opens its persisted Knowledge rather than reimporting fixtures.

## Review persistence and complete/apply

Every Accept, Edit, Merge, Reject, phase transition, manual endpoint resolution, and Relationship decision is saved with `saveReviewSession`. Components do not mutate Session objects.

Completion follows `completeReviewSession → saveReviewSession → applyCompletedReviewSession`. If the complete save succeeds but apply fails, the stored Session remains `complete_not_applied` and the same screen can retry. Revision conflicts are explained without promising automatic merge. Existing idempotent application behavior prevents double application.

## Arbitrary Import limitation

The arbitrary Import form is visible and supports pasted text plus `.txt`, `.md`, `.markdown`, and `.json` files. The production extraction dependency is still the Fixture Adapter, so non-Astra content normally reports `FIXTURE_NOT_FOUND`. The existing atomic Import Service ensures the failed Document, Registry entry, and Session are not partially stored.

## Reset and errors

Reset uses a focused two-step confirmation and the new minimal `resetWorkspace` application service. It saves one empty Snapshot and never removes a storage key directly. Read errors never offer automatic reset.

Known domain and storage codes are mapped to concise Japanese explanations. Unknown internal messages are not copied into the UI. Success and error states include text and `aria-live`, not color alone.

## Accessibility and presentation

Inputs have labels, Candidate lists use native buttons, tables have headers, status is visible as text, destructive confirmation receives initial focus, and focus indicators remain visible. The layout prioritizes desktop review work and collapses at 920 px and 620 px without a CSS framework or icon dependency.

## Deferred work

Search, Knowledge Graph, Live AI, serverless functions, Context Bundle, IndexedDB, multi-tab synchronization, and all Step 7+ behavior remain out of scope. Search string normalization remains deliberately unresolved.

