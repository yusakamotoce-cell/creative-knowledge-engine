# ADR-046: Source evidence must be an exact imported document excerpt

## Status

Accepted

## Context

SourceRef evidence must be auditable against the imported raw document. Summaries, translations, Unicode normalization, or line-ending normalization can appear plausible while losing exact provenance.

## Decision

Every Live SourceRef must match the Imported Document ID and filename, contain a non-empty excerpt, and satisfy `document.content.includes(excerpt)` without normalization. Server and browser both enforce the same pure validator.

## Consequences

- Unicode and CRLF/LF differences remain significant.
- Fabricated or paraphrased evidence is rejected.
- Fixture behavior and golden files are unchanged.

