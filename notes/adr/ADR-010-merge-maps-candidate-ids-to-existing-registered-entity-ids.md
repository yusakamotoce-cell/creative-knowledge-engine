# ADR-010: Merge maps candidate IDs to existing registered Entity IDs

## Status

Accepted

## Context

A Relationship Candidate can reference an Entity Candidate from the same bundle by `candidateId`. If that Entity Candidate is merged, no new Entity ID is created, but its Relationship references still require a deterministic registered endpoint.

## Decision

Successful Entity merge immediately records `candidateId → target registeredEntityId`, using the same mapping used by Accept as new.

## Consequences

- Relationships can resolve accepted and merged Entity Candidates uniformly.
- Rejected and pending Entity Candidates do not create mappings.
- Mapping persistence is deferred with the rest of Storage.
