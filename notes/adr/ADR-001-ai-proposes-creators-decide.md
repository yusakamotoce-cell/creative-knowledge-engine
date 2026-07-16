# ADR-001: AI proposes; creators decide

## Status

Accepted

## Context

AI extraction can identify useful creative-knowledge candidates, but automatically treating those candidates as canon would remove creator control and make mistakes destructive.

## Decision

AI produces proposals only. A creator decides whether to Accept, Edit, Merge, or Reject a candidate before it becomes registered Knowledge.

## Consequences

- AI output and registered Knowledge use separate contracts.
- Review state and user decisions must remain application responsibilities.
- Automated registration based only on confidence is prohibited.
