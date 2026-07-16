# ADR-036: Entity search uses deterministic field-weighted ranking

## Status

Accepted

## Context

Creators need stable Search results that explain why each Entity matched. Fuzzy, semantic, or asynchronous ranking would make the Build Week behavior harder to audit and reproduce.

## Decision

Entity Search examines only name, aliases, and tags. It assigns the fixed field-and-match-kind scores specified by Step 7, uses the strongest match as the result score, then orders by score, Knowledge order, and Entity ID. Filters are EntityType OR, tag AND, and are combined with the query by AND.

## Consequences

- The same Knowledge and inputs always produce the same ordered response.
- Every result can display its matched field and match kind.
- Description, attributes, SourceRefs, fuzzy matching, token search, and semantic search remain outside this contract.

