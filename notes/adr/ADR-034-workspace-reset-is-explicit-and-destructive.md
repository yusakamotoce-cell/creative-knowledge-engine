# ADR-034: Workspace reset is explicit and destructive

## Status

Accepted

## Context

Project Astra golden expectations require an empty starting Knowledge, but silently clearing an existing workspace would destroy creator-controlled records.

## Decision

Reset is a two-step user action. The reset service saves one validated empty Snapshot through the Storage Adapter; it does not remove the Local Storage key, auto-reset corrupt data, or create an implicit backup.

## Consequences

- Existing work is preserved unless the user confirms destruction.
- A failed reset save leaves the current controller Snapshot intact and reports an error.
- Starting Demo over unrelated data requires the same explicit confirmation.

