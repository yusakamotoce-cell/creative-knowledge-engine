# ADR-005: Demo mode must work without live AI access

## Status

Accepted

## Context

Network access, API credentials, or model behavior can fail during judging and should not block the core product demonstration.

## Decision

The primary judging path will use frozen Project Astra inputs and saved Candidate Bundles. Live AI is an optional adapter added only after the fixture-driven core flow works.

## Consequences

- The demo must be deterministic and usable offline.
- Live AI failure must not prevent the core flow.
- Step 0–1 does not generate Project Astra fixtures or implement AI access.
