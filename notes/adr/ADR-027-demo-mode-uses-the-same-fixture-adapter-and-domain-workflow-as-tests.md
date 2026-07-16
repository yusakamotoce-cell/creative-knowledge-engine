# ADR-027: Demo Mode uses the same fixture adapter and domain workflow as tests

## Status

Accepted

## Context

A special demo-only write path would not prove that the real Import and Review workflow works.

## Decision

The Project Astra runner uses `FixtureExtractionAdapter`, `importDocument`, Review operations, Review Session save, and completed-Session application exactly as tests do.

## Consequences

- Demo Mode remains network-free while exercising production domain boundaries.
- Fixed ID and Clock sequences make results reproducible.
- Presentation UI is deferred without changing the data path.
