# ADR-006: AI returns create-only candidates

## Status

Accepted

## Context

Allowing AI output to choose actions, registered IDs, merge targets, or canonical values would bypass deterministic local checks and creator review.

## Decision

Candidate Bundles contain create candidates with bundle-local `candidateId` values. They do not contain an action, registered ID, merge destination ID, or canonical-value decision.

## Consequences

- Strict Zod schemas reject unknown action and confidence fields.
- The application issues registered IDs and proposes Duplicate matches.
- Existing Knowledge is never directly updated by AI output.
