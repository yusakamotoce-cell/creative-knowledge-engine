# ADR-028: Project Astra and synthetic boundary fixtures remain separate

## Status

Accepted

## Context

Adding every technical edge case to Project Astra would make the official creative scenario unstable and harder to explain.

## Decision

Project Astra contains only its frozen scenario. Type distinctions, cycle behavior, delimiter collisions, migration versions, and other technical boundaries use small synthetic fixtures.

## Consequences

- Project Astra stays aligned with its contract and demo narrative.
- Boundary tests can evolve without altering official fixture expectations.
- Context Bundle cases remain outside Step 5.
