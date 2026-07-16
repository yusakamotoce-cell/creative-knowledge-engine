# ADR-040: Browser downloads are isolated behind an adapter

## Status

Accepted

## Context

Creating a browser download requires Blob, object URL, document, and anchor APIs. Using those APIs in React components would mix browser side effects with rendering and make exact content and cleanup difficult to test.

## Decision

The application controller depends on `FileDownloadAdapter`. The browser implementation alone creates the Blob and object URL, appends and clicks a temporary anchor, removes it, and revokes the URL. Filename date is injected independently of export content.

## Consequences

- Components and core Export functions remain browser-independent.
- Tests can verify content, media type, filename, click, and URL cleanup without a real download.
- Other hosts can provide a different adapter without changing the export contract.

