# ADR-023: Corrupt persisted data is rejected rather than silently reset

## Status

Accepted

## Context

Replacing invalid persisted data with an empty Snapshot would hide corruption and could destroy recoverable creative work.

## Decision

JSON, Envelope, version, and Snapshot failures are surfaced as typed errors. Local Storage load and application initialization never call set, remove, or save while handling corrupt data.

## Consequences

- Startup fails explicitly instead of appearing as a new empty project.
- The original raw value remains available for diagnosis or a future recovery workflow.
- Reset and migration user experiences are deferred.
