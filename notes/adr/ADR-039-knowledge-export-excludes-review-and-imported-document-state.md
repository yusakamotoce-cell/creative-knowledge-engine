# ADR-039: Knowledge export excludes review and imported-document state

## Status

Accepted

## Context

Creators need a portable representation of registered Knowledge. The Storage Snapshot also contains raw imported material, Review workflow state, registry records, and application history that are operational rather than canonical Knowledge.

## Decision

Knowledge Export v1 is a strict object containing only `schemaVersion`, `knowledgeRevision`, and `knowledge`. It includes all data nested in canonical Entities and Relationships, while excluding Imported Documents, Import Registry, Candidate Bundles, Review Sessions, Review Applications, Local Storage Envelope, UI state, and derived Insights.

## Consequences

- The exported JSON has a narrow, versioned, auditable contract.
- Sensitive or bulky raw source documents are not bundled accidentally.
- Review history and Insights must be transported or regenerated separately if a later feature needs them.

