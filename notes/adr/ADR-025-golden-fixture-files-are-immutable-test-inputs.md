# ADR-025: Golden fixture files are immutable test inputs

## Status

Accepted

## Context

Automatically rewriting expected files during tests could hide unintended changes to IDs, ordering, provenance, conflicts, or timestamps.

## Decision

Project Astra final Knowledge and expected Insights are checked-in immutable inputs. Tests parse and compare them but never regenerate or update them.

## Consequences

- Golden changes require an explicit reviewed edit.
- Object key order is irrelevant after parsing; array order remains contractual.
- The complete Storage Snapshot is not stored as a giant golden.
