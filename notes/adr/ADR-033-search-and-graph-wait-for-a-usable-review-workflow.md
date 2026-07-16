# ADR-033: Search and graph are deferred until the review workflow is usable

## Status

Accepted

## Context

Search and graph consume registered Knowledge, while Step 6 is responsible for making Import, Candidate Review, application, and Insights usable in a browser.

## Decision

Step 6 implements the full browser review workflow and Knowledge projections only. Search, Knowledge Graph, Live AI, serverless functions, Context Bundle, and IndexedDB remain deferred.

## Consequences

- The browser UI has one complete creator-controlled path before adding new consumers.
- Search normalization remains unresolved until Search is in scope.
- No placeholder graph or partial AI integration is introduced.

