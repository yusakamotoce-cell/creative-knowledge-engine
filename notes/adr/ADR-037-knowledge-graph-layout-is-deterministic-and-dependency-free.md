# ADR-037: Knowledge graph layout is deterministic and dependency-free

## Status

Accepted

## Context

The Step 7 Graph is a small, read-only view of canonical Knowledge. A force simulation or graph dependency would add nondeterminism, bundle cost, and state that is unnecessary for the fixed Build Week scope.

## Decision

Graph layout uses fixed EntityType lanes in `character`, `organization`, `location`, `scene`, `item` order. Nodes retain Knowledge order within each lane, and fixed padding and gaps determine coordinates and canvas height. No force simulation, randomness, or external graph library is used.

## Consequences

- Equal projection and filters always produce equal coordinates.
- Layout tests can assert exact structural behavior without timing controls.
- The layout favors predictability over automatic optimization for very large graphs.

