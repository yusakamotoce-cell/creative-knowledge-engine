# ADR-038: Graph projection is derived and not persisted

## Status

Accepted

## Context

Knowledge is the primary model and Graph is a view. Persisting projection nodes, filters, zoom, or coordinates would create a second source of truth and migration burden.

## Decision

Graph nodes, edges, relation-type choices, filters, zoom, and coordinates are derived in memory from the current validated Knowledge Snapshot. None of this state is written through the Storage Adapter. Dangling Relationships are represented as supplied and are not repaired by Graph code.

## Consequences

- Refresh rebuilds Graph from canonical Knowledge.
- Graph cannot silently alter or repair domain records.
- View settings reset between browser sessions unless a later step introduces a separate UI-preference contract.

