# ADR-026: Knowledge Insights are pure projections of registered Knowledge

## Status

Accepted

## Context

Duplicate, Conflict, Orphan, and statistics views must reflect registered Knowledge without depending on review candidates, blocked Relationships, UI state, or persistence.

## Decision

Knowledge Insights are calculated by a deterministic, mutation-free function whose only input is a validated `KnowledgeState`.

## Consequences

- Blocked and rejected candidates cannot affect Insights.
- The projection can be reused by tests and future UI.
- Search and Graph behavior remain separate concerns.
