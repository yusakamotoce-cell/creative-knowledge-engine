# Step 2 Implementation Decisions

**Status:** Implemented Step 2 contract record  
**Date:** 2026-07-16

## Starting point

Implementation started from commit `7a465da Complete Creative Knowledge Engine Step 0-1`. The tracked tree was clean; the user-provided `CODEX_STEP_2.md` was untracked. The existing 73 tests, typecheck, lint, and production build all passed before Step 2 work began.

## Candidate attribute SourceRefs

Every normalized Candidate attribute becomes one AttributeRecord whose claims contain the same Candidate value once for every distinct Candidate SourceRef. SourceRefs are deduplicated by the complete `(documentId, fileName, excerpt)` key and retain first occurrence. Attributes without a SourceRef are rejected; empty attributes with no SourceRefs remain valid.

## Attribute key collisions

Attribute keys are stored after `normalizeAttributeKey`. If two different raw keys normalize to the same key, Accept and Merge fail with `ATTRIBUTE_KEY_COLLISION`; no value is selected implicitly. Normalized keys are sorted with the existing deterministic string comparator rather than relying on object insertion order.

## Merge mapping

Successful Accept maps the Candidate ID to the new registered Entity ID. Successful Merge maps the Candidate ID to the existing target Entity ID. Both mappings are written immediately so Relationship review can resolve endpoints after the entity phase.

## Manual resolution priority

A supplied manual Entity ID takes priority over Candidate-ID mapping and exact name/alias resolution. The ID must exist and satisfy the reference's optional EntityType. An unspecified endpoint is reevaluated by the automatic rules. Manual resolution changes only the review record, never the Candidate reference.

When one endpoint is ambiguous and the other is merely unresolved, the available blocked-reason vocabulary cannot encode both conditions. The deterministic choice is to report the ambiguous side; rejected-candidate references take priority over both. This preserves the condition that requires explicit human disambiguation.

## Relationship duplicate consolidation

Relationship identity is the directional `(fromEntityId, toEntityId, normalized relationType)` key. One existing match keeps its ID, endpoints, relation type, description, creation time, and position; only SourceRefs and update time change. More than one existing match is invalid Knowledge and is rejected without automatic repair.

## Search normalization remains deferred

Search is outside Step 2. No Search normalizer, index, or query behavior was added, and Entity identity normalization is not silently promoted to a Search contract.

## Project Astra post-freeze R-2 carryover

No Project Astra Fixture was generated. The R-2 gaps recorded in `PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md`—including the complete final seven-Entity listing, the full post-merge Northstar Observatory state, and Fixture-level union-order expectations—remain confirmation items before Fixture generation.
