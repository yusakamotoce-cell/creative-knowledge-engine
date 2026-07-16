# ADR-017: Review Sessions receive first-class persistent IDs

## Status

Accepted

## Context

Step 2 identified Sessions only by document ID, but storage must support multiple Sessions for one document in the future and reject duplicate stored Sessions deterministically.

## Decision

Every Review Session has a required application ID issued by `idGenerator.nextId("review-session")` during creation. Document ID remains a separate source association.

## Consequences

- `createReviewSession` now requires an injected ID generator.
- Storage enforces unique Session IDs while allowing future repeated document associations.
- Step 2 state transitions and Candidate review rules remain unchanged.
