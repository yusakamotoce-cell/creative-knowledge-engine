# ADR-019: Knowledge revisions prevent stale Review Sessions from overwriting newer Knowledge

## Status

Accepted

## Context

Two Sessions can begin from the same canonical Knowledge. If one applies first, applying the other by last-write-wins replacement could silently discard newer changes.

## Decision

Storage carries a nonnegative integer `knowledgeRevision`, and each Session records `baseKnowledgeRevision` at import. Application requires exact equality before replacing Knowledge and increments revision only after a successful first apply.

## Consequences

- Stale Sessions fail with `KNOWLEDGE_REVISION_CONFLICT`.
- No automatic rebase, merge, or last-write-wins behavior is attempted.
- A caller must resolve stale work in a later workflow.
