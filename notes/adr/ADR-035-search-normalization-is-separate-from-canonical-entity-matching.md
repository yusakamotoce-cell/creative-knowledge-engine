# ADR-035: Search normalization is separate from canonical entity matching

## Status

Accepted

## Context

Interactive Search must accept visually equivalent full-width text and flexible Unicode whitespace. Canonical Entity matching is an existing identity contract used by Review and Duplicate detection and must not change as a side effect of adding Search.

## Decision

Search owns `normalizeSearchText`: Unicode NFKC, trim, Unicode-whitespace collapse to one ASCII space, then lowercase. Search calls this function only for query matching and Search filters. Existing canonical Entity matching continues to use its established normalization function unchanged.

## Consequences

- Full-width and whitespace variants are convenient to search.
- Search behavior can evolve without changing Entity identity or merge behavior.
- Similar-looking normalization functions remain deliberately separate because they serve different contracts.

