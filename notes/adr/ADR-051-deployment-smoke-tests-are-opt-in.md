# ADR-051: Deployment smoke tests are opt-in

## Status

Accepted

## Context

Basic public checks are safe and non-billable, while a Live AI check consumes external capacity and sends document content to OpenAI.

## Decision

`npm run smoke:deployment` checks the app root, health, method handling, CORS, safe errors, and `no-store` without calling OpenAI. Live AI runs only when `RUN_LIVE_AI=true`; it sends exactly one fixed synthetic document and performs no automatic retry.

## Consequences

- Ordinary deployment checks cannot accidentally incur an AI call.
- Missing `DEPLOYMENT_URL` returns a blocked non-success exit.
- The smoke prints only safe status codes and never persists or prints the raw response.
