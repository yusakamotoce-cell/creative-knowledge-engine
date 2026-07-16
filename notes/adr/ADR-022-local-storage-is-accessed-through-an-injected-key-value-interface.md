# ADR-022: Local Storage is accessed through an injected key-value interface

## Status

Accepted

## Context

Core application and persistence behavior must remain testable without a browser global and replaceable by future storage technologies.

## Decision

`LocalStorageAdapter` receives a `KeyValueStorage` implementation and an optional key. It never reads `window` directly. The default key is `creative-knowledge-engine:storage:v1`.

## Consequences

- Browser localStorage can be supplied by composition code later.
- Tests use deterministic in-memory fakes.
- IndexedDB, multi-tab synchronization, and storage events remain deferred.
