# ADR-050: Real OpenAI API smoke is required

## Status

Accepted

## Context

Mocks can verify request shape and local validation but cannot prove actual Responses API, model access, Structured Outputs, provider conversion, `store: false`, grounding, or public server environment compatibility.

## Decision

Step 9 is not complete until one explicit synthetic Live AI smoke succeeds through the deployed same-origin endpoint using a server-only key. The smoke must validate the success envelope, domain Candidate Bundle shape, document identity, and exact SourceRef grounding without saving the raw response.

## Consequences

- A missing deployment, key, or successful real response is reported as `BLOCKED: REAL_API_NOT_VERIFIED`.
- Mock success is never reported as real API success.
- Real output values and phrasing are not golden fixtures.
