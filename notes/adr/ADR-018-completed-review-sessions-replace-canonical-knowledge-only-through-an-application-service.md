# ADR-018: Completed Review Sessions replace canonical Knowledge only through an application service

## Status

Accepted

## Context

Candidate Review owns a working Knowledge copy, while Storage owns canonical Knowledge. Updating the canonical copy from UI code or an adapter would duplicate completion, validation, history, and failure rules.

## Decision

Only `applyCompletedReviewSession` may replace canonical Knowledge from a Review Session. It accepts only complete Sessions and writes the replacement, revision, and application record in one Snapshot save.

## Consequences

- Import and review operations do not implicitly update canonical Knowledge.
- Entity and Relationship order, IDs, claims, and canonical values are copied exactly from the completed Session.
- UI integration remains a caller of the application service rather than an owner of apply rules.
