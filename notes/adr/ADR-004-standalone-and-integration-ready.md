# ADR-004: Build Week project is standalone but integration-ready

## Status

Accepted

## Context

Creative Knowledge Engine must work as an independent Build Week product while remaining suitable for later CreativeOS integration and alternative persistence.

## Decision

Keep domain functions framework-independent and place external systems behind future adapters. The Step 0–1 domain accepts plain data and returns plain data without accessing storage or UI state.

## Consequences

- React depends on the domain; the domain does not depend on React.
- Storage, AI, and graph implementations can be replaced later.
- Integration does not require redefining core Knowledge contracts.
