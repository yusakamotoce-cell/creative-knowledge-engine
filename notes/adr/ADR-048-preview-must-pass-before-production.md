# ADR-048: Preview must pass before production

## Status

Accepted

## Context

Production enables a public frontend and potentially a billable Live AI endpoint. Moving directly from local checks to Production would combine deployment, environment, firewall, browser, and provider risks.

## Decision

The complete Step 9 checklist must pass in a Vercel Preview deployment before the same stable commit and equivalent scoped configuration are promoted to Production. A Preview failure blocks Production.

## Consequences

- Preview and Production environment variables are configured and verified separately.
- Production results cannot be inferred from local or Preview results.
- The stable commit and both deployment URLs must be recorded after successful verification.
