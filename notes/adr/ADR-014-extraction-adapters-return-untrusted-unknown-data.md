# ADR-014: Extraction adapters return untrusted unknown data

## Status

Accepted

## Context

Fixture and future Live AI extraction cross an external-data boundary. A TypeScript return annotation cannot prove runtime conformance or prevent extra AI decision fields.

## Decision

`ExtractionAdapter.extract` returns `unknown`. The Import Service validates every result with the existing strict Candidate Bundle Schema and separately requires the Bundle document ID to match the Imported Document ID.

## Consequences

- Unknown fields, confidence, actions, registered IDs, and merge targets are rejected rather than removed or repaired.
- Adapter exceptions are exposed as typed extraction failures with their cause retained.
- Live AI remains replaceable and is not implemented in Step 3.
