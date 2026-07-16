# ADR-044: Imported document content is treated as untrusted prompt data

## Status

Accepted

## Context

Imported text can contain prompt injection, fabricated instructions, or requests to expose secrets.

## Decision

Extraction rules live in a fixed developer message. Document metadata and exact raw content are serialized into a separate JSON user message and explicitly described as untrusted data. The client never concatenates document content into the developer message.

## Consequences

- Document instructions cannot change the code-managed extraction contract.
- Prompt and user payload can be tested separately.
- Runtime validation remains required because prompt separation is not a security proof.

