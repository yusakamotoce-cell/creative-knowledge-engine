# ADR-049: Public live extraction requires platform rate limiting

## Status

Accepted

## Context

`POST /api/extract` can consume billable OpenAI capacity. Serverless instances do not share a reliable in-memory counter, and public access without a platform control is unsafe.

## Decision

Public Live AI requires a published Vercel Firewall rate-limit rule for `POST /api/extract`, scoped to the same client or IP, with five requests per minute and HTTP 429. Until that rule is verified, Production must keep `LIVE_AI_ENABLED=false`.

## Consequences

- No in-memory application rate limiter is added.
- Firewall configuration is a required authenticated deployment step.
- Fixture Demo remains usable while Live AI is disabled.
