# ADR-021: Browser persistence uses a versioned Storage Envelope

## Status

Accepted

## Context

Persisted application state will outlive individual releases. Treating an unversioned JSON object as current data would make future schema changes ambiguous and unsafe.

## Decision

Browser persistence stores a strict `{ schemaVersion: 1, snapshot }` Envelope. Decode selects an explicit version decoder before validating the current Snapshot. Missing and unsupported versions are never guessed.

## Consequences

- A migration pipeline exists even though no legacy migration is implemented in Step 4.
- Unsupported versions fail without rewriting raw data.
- Context Bundle canonical JSON rules do not apply to this storage format.
