# Step 0–1 Implementation Decisions and Deferred Confirmations

**Status:** Step 0–1 boundary record  
**Date:** 2026-07-16

## Decisions implemented now

### SourceRef equality

Two SourceRefs are equal only when `documentId`, `fileName`, and `excerpt` all match exactly after schema parsing. A JSON array representation is used as a collision-safe key.

Reason: `CODEX_STEP_0-1.md` recommends the complete triple and requires a fixed, tested rule.

### Deterministic union order

`unionStrings` deduplicates by exact string equality and preserves first occurrence across the existing-values array followed by the incoming-values array. `unionSourceRefs` applies the same first-occurrence rule using the complete SourceRef key.

Reason: merge fields require deterministic unions, the fixed import/review sequence gives the inputs a meaningful order, and the frozen Astra expectations retain existing values before incoming values. Name normalization must not silently change stored aliases or tags.

### Production and test IDs

Production IDs combine a caller-provided prefix with `crypto.randomUUID()`. Tests inject either a UUID function or a fixed sequence generator. Sequence exhaustion throws `ID_SEQUENCE_EXHAUSTED`.

Reason: domain logic must not call random generation directly, while tests require fixed IDs.

## Frozen-after-review items not implemented in Step 0–1

### Merge and the candidateId mapping

No rule is implemented for adding a merged Entity Candidate to the `candidateId → registeredEntityId` map.

Reason: Candidate Review and Relationship reference resolution are Step 2 or later. The upper specifications explicitly define immediate mapping for Accept but do not fully define the Merge mapping rule. Project Astra freezes the final outcome, not the mechanism. This must be confirmed before Review state implementation.

### Candidate attribute to AttributeClaim SourceRefs

No Candidate-to-AttributeClaim conversion function is implemented.

Reason: an Entity Candidate can contain multiple SourceRefs, while the upper specifications do not define which SourceRef each attribute uses or whether one attribute becomes multiple claims. Step 0–1 implements AttributeRecord operations only after an explicit AttributeClaim is supplied.

### Search string normalization

No Search normalizer or Search index is implemented.

Reason: Search is outside Step 0–1, and the upper specifications do not state that Entity identity normalization must also be Search normalization. The existing `normalizeEntityName` function is restricted to Entity resolution unless a later Search contract explicitly reuses it.

## Project Astra post-freeze R-2 carryover

`PROJECT_ASTRA_POST_FREEZE_VERIFICATION.md` records that Fable R-2 is only partially reflected: Nova Arclight is fully enumerated, but all seven final Entities, the complete post-merge Northstar Observatory state, and the Fixture-level union-order contract are not all frozen.

Step 0–1 does not generate Astra Fixture data and does not alter the frozen document. Before `final-knowledge.json` or other Astra Fixture files are generated, the remaining R-2 values must be confirmed without inferring them from this domain helper alone. The first-occurrence union implemented in Step 0–1 is an implementation choice aligned with the current review expectation, not a substitute for completing the frozen Fixture contract.
