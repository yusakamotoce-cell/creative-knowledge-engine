# ADR-007: Entity resolution is deterministic and local

## Status

Accepted

## Context

Fuzzy and model-based identity matching would make Duplicate results difficult to explain, reproduce, and test during Build Week.

## Decision

Entity resolution uses application-side exact matching of names and aliases after Unicode NFKC normalization, trimming, whitespace collapse, and lowercasing.

## Consequences

- Full-width and case differences such as `ＮＯＶＡ` and `Nova` match.
- `North Star Observatory` and `Northstar Observatory` do not match automatically.
- Fuzzy matching, edit distance, embeddings, semantic similarity, and AI identity decisions are excluded.
