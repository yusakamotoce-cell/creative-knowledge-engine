# ADR-045: Live extraction does not retry automatically

## Status

Accepted

## Context

Automatic retries can duplicate cost, complicate timeout behavior, and obscure whether a user's document was transmitted more than once.

## Decision

The OpenAI client and Remote Adapter each issue exactly one request. Rate limit, unavailable, timeout, refusal, incomplete output, and invalid output errors return without retry. The UI retains input and lets the user retry explicitly.

## Consequences

- One user action causes at most one upstream extraction call.
- Retrying is visible and creator-controlled.
- A later retry policy requires a separate decision with cost and idempotency controls.

