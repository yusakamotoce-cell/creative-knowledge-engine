# ADR-011: Candidate attribute provenance expands across all Candidate SourceRefs

## Status

Accepted

## Context

Entity Candidate attributes do not have attribute-level provenance, while a Candidate can carry several SourceRefs. Choosing one SourceRef would discard evidence, and inventing a SourceRef would create unsupported provenance.

## Decision

For each Candidate attribute, create one equal-valued AttributeClaim for every distinct Candidate SourceRef, preserving first occurrence. Attributes require at least one SourceRef. Attribute keys are normalized and colliding raw keys are rejected.

## Consequences

- All available Candidate provenance is retained for every attribute.
- Equal values from different sources do not create a Conflict.
- Candidates with attributes but no SourceRefs require correction before Accept or Merge.
