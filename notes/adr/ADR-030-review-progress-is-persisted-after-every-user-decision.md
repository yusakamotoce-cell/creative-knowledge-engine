# ADR-030: Review progress is persisted after every user decision

## Status

Accepted

## Context

A browser refresh must not lose Accept, Edit, Merge, Reject, phase transition, or manual Relationship resolution decisions.

## Decision

After every Review operation, the controller passes the immutable updated Session to `saveReviewSession` and adopts the returned Snapshot. It never mutates the current Session in place.

## Consequences

- Refresh restores the last successfully saved decision.
- A failed save leaves the controller on the prior Snapshot and can be retried.
- Storage writes remain behind the application service and adapter boundary.

