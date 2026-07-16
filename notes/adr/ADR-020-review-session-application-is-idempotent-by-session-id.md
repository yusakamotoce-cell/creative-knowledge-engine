# ADR-020: Review Session application is idempotent by Session ID

## Status

Accepted

## Context

Repeated commands, navigation, or retries must not apply one completed Session more than once or advance Knowledge revision repeatedly.

## Decision

Each successful apply appends one Review Application Record keyed uniquely by Review Session ID. A later apply for that ID returns the existing record as `already_applied` without Clock or Storage save calls.

## Consequences

- Revision and canonical Knowledge remain unchanged on repeated apply.
- `REVIEW_SESSION_ALREADY_APPLIED` remains reserved for future internal validation; normal repetition is a successful result.
- Application history order is the canonical application order.
