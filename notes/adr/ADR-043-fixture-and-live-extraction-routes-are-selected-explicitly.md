# ADR-043: Fixture and live extraction routes are selected explicitly

## Status

Accepted

## Context

Project Astra must remain deterministic and offline, while arbitrary-document extraction may call a remote model. Hash-based or failure-based adapter selection would make privacy and Demo behavior unpredictable.

## Decision

The composition root injects `fixtureExtractionAdapter` and `liveExtractionAdapter` separately. Project Astra controller actions always select Fixture; arbitrary-document actions always select Live. Neither failure path falls back to the other adapter.

## Consequences

- Project Astra makes zero extraction network calls and needs no API key.
- Live extraction occurs only after the user chooses its explicit action.
- Adapter choice is testable and independent of document content.

