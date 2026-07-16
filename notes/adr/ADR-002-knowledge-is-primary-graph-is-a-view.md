# ADR-002: Knowledge is primary; graph is a view

## Status

Accepted

## Context

The product needs multiple ways to inspect creative knowledge. Treating a graph library as the data model would couple domain truth to one presentation.

## Decision

Entity, AttributeRecord, SourceRef, and Relationship data are the primary Knowledge model. A graph is a read-only projection of that model.

## Consequences

- Domain code does not depend on React or a graph library.
- Graph layout and UI state never define Knowledge identity.
- Other consumers such as Search and Export can use the same Knowledge Store.
