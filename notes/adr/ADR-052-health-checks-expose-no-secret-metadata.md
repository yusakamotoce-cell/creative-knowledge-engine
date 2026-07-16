# ADR-052: Health checks expose no secret metadata

## Status

Accepted

## Context

Deployment checks need to distinguish a disabled Live AI configuration without exposing credentials, key shape, project metadata, environment listings, internal paths, or upstream connectivity.

## Decision

`GET /api/health` returns only the fixed service envelope and `liveAi: enabled | disabled`. Enabled means Live AI is not explicitly disabled and a non-blank server key exists; it does not call OpenAI. All responses are JSON with `Cache-Control: no-store`, and non-GET methods return a safe 405.

## Consequences

- Health is suitable for public deployment smoke checks.
- Health does not prove OpenAI connectivity; the real API smoke remains separate.
- Secret presence is reduced to one coarse configuration state.
