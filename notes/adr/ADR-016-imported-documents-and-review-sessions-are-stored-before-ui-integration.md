# ADR-016: Imported documents and Review Sessions are stored before UI integration

## Status

Accepted

## Context

Import behavior, idempotency, extraction validation, and failure atomicity must be testable independently of the future Import and Candidate Review screens.

## Decision

On a successful first import, one atomic snapshot appends the Imported Document, its Registry entry, and its new Review Session. The root Knowledge remains unchanged; the Session receives a copy of current Knowledge as its working state.

## Consequences

- The complete Import-to-Review boundary runs without React.
- Extraction or validation failure causes no partial save.
- Synchronizing completed Session Knowledge back to root Knowledge is deferred to Step 4.
