# Step 5 Implementation Decisions

**Status:** Implemented Step 5 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `c716dd8 Complete Creative Knowledge Engine Step 4`. The tracked tree was clean; the user-provided `CODEX_STEP_5.md` and `PROJECT_ASTRA_FIXTURE_CONTRACT_v1.0.md` were untracked. The existing 284 tests, typecheck, lint, and production build all passed before Step 5 work began.

## Fixture Contract and post-freeze R-2

The Fixture Contract supplies final IDs, times, ordering, SourceRefs, counts, and golden values. The four source documents retain the exact Project Astra v1.0 bodies. `cand-astra-002-nova.aliases` is empty, while the final merged Nova keeps ID `ent-astra-001`, name and description, alias `Nova`, canonical age 17, both 17/18 claims, merged tags and SourceRefs, original `createdAt`, and merge `updatedAt`.

Existing attribute-key normalization has higher precedence than fixture display spelling. Therefore Candidate key `identityStatus` is stored in final Knowledge as normalized key `identitystatus`; its value and provenance are unchanged. Before the Step 5 commit, the Fixture Contract was corrected from `identityStatus` to `identitystatus` and now explicitly states that final Knowledge stores the key produced by `normalizeAttributeKey`, not the Candidate raw key. All other Fixture Contract final values are represented directly.

## Encoding, hashes, IDs, and Clock

Source files are UTF-8 without BOM, LF-only, and end in exactly one newline. Manifest SHA-256 values were calculated from those raw bytes and are also verified from the raw imported strings at test time.

The runner uses the Fixture Contract's exact `SequenceIdGenerator` and `SequenceClock` arrays. Accept and new Relationship operations consume IDs and time; Merge and Relationship consolidation consume only time; Edit, Reject, blocked resolution, phase changes, and complete consume neither. The runner rejects an under-consumed sequence, while the sequence implementations reject over-consumption.

## Insights order and immutable golden files

Duplicate groups are ordered by normalized key and their Entity IDs follow Knowledge order. Conflicts follow Entity order, attribute insertion order, and claim order. Orphans follow Entity order. All five Entity types are always present in statistics.

Golden Knowledge and Insights are strict parsed inputs. Tests never generate, rewrite, or update them, and no whole-Storage golden is stored.

## Review Session save boundary

`saveReviewSession` validates the updated Session, replaces only an existing matching Session, and preserves document ID and base revision. It performs one adapter save and cannot modify root Knowledge, revision, applications, imported documents, or registry. Invalid, mismatched, missing, load-failed, and save-failed paths use typed errors.

## Shared Demo and test path

The network-free runner uses Memory Storage, Fixture Extraction, the regular Import Service, public Review operations, Review Session save, completed-Session application, and the pure Insights projection. It does not seed canonical Knowledge directly. Local Storage regression uses the same final Snapshot and versioned Envelope.

## Deferred work

Search string normalization remains intentionally undecided because Search is not implemented. UI, IndexedDB, Graph, Live AI, Context Bundle, and Step 6+ work remain out of scope.
