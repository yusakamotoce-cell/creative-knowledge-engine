# ADR-003: Candidate Review is required before registration

## Status

Accepted

## Context

Extraction results can contain duplicates, conflicts, unresolved references, and speculative material.

## Decision

Every Candidate Bundle must pass through Candidate Review before any candidate is registered or merged. Entity candidates are reviewed before Relationship candidates.

## Consequences

- Candidate and registered schemas remain separate.
- A blocked Relationship cannot be accepted.
- Review workflow implementation is deferred beyond Step 0–1, but domain contracts must support it.
