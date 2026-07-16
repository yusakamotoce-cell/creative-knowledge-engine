# ADR-013: Import idempotency is keyed by raw content SHA-256

## Status

Accepted

## Context

Re-importing the same source under a different file name or input format must not create duplicate documents or repeat extraction. Normalizing source text before hashing would also violate the requirement to preserve source material exactly.

## Decision

The Import Registry uses the lowercase SHA-256 of the raw JavaScript content string encoded as UTF-8 as its unique key. File name, format, media type, source kind, and import time are not hash inputs. BOM and line-ending differences therefore produce different keys.

## Consequences

- Equal content is idempotent even when file metadata changes.
- Textually different but semantically equivalent JSON remains distinct.
- Hash collisions are not guessed at or repaired by the application.
