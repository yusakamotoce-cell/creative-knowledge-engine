# ADR-009: Candidate Review is a two-stage state machine

## Status

Accepted

## Context

Relationship references can depend on the registered IDs produced by Entity acceptance or merge. Reviewing both candidate kinds in an arbitrary order would make reference resolution depend on timing and partial state.

## Decision

Candidate Review uses the fixed phase sequence `entities → relationships → complete`. Every Entity review must be terminal before Relationship resolution begins, and every Relationship review must be terminal before completion.

## Consequences

- Entity registration and mapping are complete before Relationship references are resolved.
- Invalid phase operations fail with a typed domain error.
- Undo and phase rollback remain outside Step 2.
