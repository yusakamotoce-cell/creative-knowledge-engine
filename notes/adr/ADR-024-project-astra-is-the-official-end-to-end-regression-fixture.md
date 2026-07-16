# ADR-024: Project Astra is the official end-to-end regression fixture

## Status

Accepted

## Context

The product needs one deterministic scenario that exercises Import, Review, canonical application, persistence, and Knowledge projections without a network or API key.

## Decision

Project Astra is the official end-to-end regression fixture. Its four documents run sequentially through the same domain services used by future product integration.

## Consequences

- Contract regressions are visible as fixture or golden comparison failures.
- Demo data does not bypass Candidate Review or write canonical Knowledge directly.
- UI remains outside the fixture runner.
