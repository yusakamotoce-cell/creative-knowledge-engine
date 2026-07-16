# ADR-031: Project Astra demo progress is derived from stored domain records

## Status

Accepted

## Context

A separate Demo progress flag could diverge from Imported Documents, Review Sessions, and Review Application records after refresh or failure.

## Decision

The UI derives each Project Astra document status from the stored Snapshot in manifest order. It stores no Demo-only progress state. Fixed fixture IDs and times resume by excluding values already present in persisted domain records.

## Consequences

- Refresh and remount reconstruct the same next step.
- `complete_not_applied` is visible and retryable.
- The Demo cannot skip an earlier incomplete document through its normal UI.

