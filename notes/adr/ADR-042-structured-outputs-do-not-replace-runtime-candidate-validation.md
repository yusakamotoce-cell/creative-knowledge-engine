# ADR-042: Structured Outputs do not replace runtime Candidate Bundle validation

## Status

Accepted

## Context

Structured Outputs constrain model generation but support only a subset of JSON Schema. Every generated object must declare all fields as required and set `additionalProperties: false`. The domain Candidate Bundle uses `attributes: Record<string, ScalarValue>`, whose dynamic keys cannot be represented directly by that provider contract. Structured Outputs also do not prove that an upstream response satisfies the application's evidence rules.

## Decision

OpenAI output uses a provider DTO whose Entity attributes are strict `{ key, value }` array items. The server validates that DTO, rejects empty keys, exact raw-key duplicates, normalized-key collisions, and non-ScalarValue values, then converts it to the unchanged domain `Record<string, ScalarValue>` shape. Only after conversion does the server apply the existing strict `candidateBundleSchema` and exact grounding validation. `RemoteExtractionAdapter` repeats domain Schema and grounding checks before returning untrusted adapter output to the existing Import Service.

## Consequences

- A schema-conforming but ungrounded result is rejected.
- The provider transport contract can satisfy OpenAI's strict JSON Schema subset without changing the domain Candidate Bundle.
- Attribute conversion is an explicit server boundary with deterministic collision rejection.
- The existing Candidate Bundle contract stays authoritative.
- Invalid output produces no partial Document, Registry, Session, or Knowledge save.
