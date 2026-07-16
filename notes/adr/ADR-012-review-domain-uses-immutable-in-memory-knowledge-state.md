# ADR-012: Review domain uses immutable in-memory KnowledgeState before persistence

## Status

Accepted

## Context

Step 2 must establish deterministic review behavior without selecting a Storage Adapter or coupling domain decisions to React state.

## Decision

Review functions accept an in-memory `ReviewSession` and return a new value. New records append, merged records replace their existing array position, and no review function mutates input Knowledge, Candidate, Entity, Relationship, or AttributeRecord values.

## Consequences

- Domain tests run without React or Storage.
- A future Storage Adapter can persist completed or intermediate sessions without owning merge rules.
- Large-state optimization and durable session recovery are deferred.
