# ADR-008: All cross-entity links are Relationships

## Status

Accepted

## Context

Duplicating links inside Entity attributes would create competing representations and make direction, deduplication, and source tracking inconsistent.

## Decision

All links between Entities are stored as directional Relationship records. Relationship identity is based on `fromEntityId`, `toEntityId`, and normalized `relationType`.

## Consequences

- A→B and B→A remain different Relationships.
- Duplicate Relationships keep the existing ID and merge SourceRefs in a later review step.
- Entity attributes contain scalar creative facts, not cross-Entity links.
