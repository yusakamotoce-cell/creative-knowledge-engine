# ADR-029: The React UI calls domain operations through an application controller

## Status

Accepted

## Context

Import, review persistence, completion, and canonical application each require a defined order. Repeating that orchestration in React components would couple presentation to domain behavior and make retries inconsistent.

## Decision

React components send user intents to an injected application controller. The controller calls existing pure domain operations and application services; components only render state and collect input.

## Consequences

- Domain and application behavior remains React-independent.
- Busy, retry, status, and error handling have one owner.
- UI tests can replace storage, IDs, clocks, hashing, and extraction without browser globals.

