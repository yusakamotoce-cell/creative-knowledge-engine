# ADR-015: Storage is accessed only through an adapter

## Status

Accepted

## Context

The application must eventually support browser persistence and CreativeOS integration without moving validation or workflow rules into a specific storage technology.

## Decision

Knowledge, Review Sessions, Imported Documents, and the Import Registry are loaded and saved only through `StorageAdapter`. Step 3 supplies a strict, immutable Memory implementation and no browser-backed implementation.

## Consequences

- Import Service has no localStorage or IndexedDB dependency.
- Every Memory save and load passes through strict snapshot validation and reference isolation.
- Persistent adapters can be added later behind the same boundary.
