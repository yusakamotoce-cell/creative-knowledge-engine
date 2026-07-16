# ADR-041: Live extraction uses the server-side OpenAI Responses API

## Status

Accepted

## Context

Arbitrary documents need an optional live extraction path, but an OpenAI API key must never enter the browser bundle, browser storage, request payload, UI, logs, or error responses.

## Decision

`POST /api/extract` is the only OpenAI boundary. Its server composition reads `OPENAI_API_KEY`, selects the model, and calls the fixed Responses API URL with native `fetch`. Browser code calls only the same-origin endpoint through `RemoteExtractionAdapter` and has no key field or key-bearing configuration.

## Consequences

- The browser bundle contains no API secret.
- Serverless hosting must provide the environment variables and route adapter.
- Fixture Demo remains independent of the endpoint and network.

