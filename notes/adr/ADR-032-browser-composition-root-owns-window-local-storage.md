# ADR-032: The browser composition root is the only place that accesses window.localStorage

## Status

Accepted

## Context

Direct Local Storage access from components or core code would hide persistence dependencies and make error handling and tests inconsistent.

## Decision

`src/app/compositionRoot.ts` is the only application module that reads `window.localStorage`. It injects a `LocalStorageAdapter` using key `creative-knowledge-engine:storage:v1`, together with extraction, hashing, ID, and Clock dependencies.

## Consequences

- Core and React components remain free of browser storage globals.
- Tests use Memory Storage or an injected fake.
- Versioning, corruption handling, and write failures continue through the existing adapter contract.

