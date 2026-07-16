# Step 8 Manual Checklist

**Date:** 2026-07-16  
**Automated suite status:** covered where marked  
**Real OpenAI API smoke:** not run; no authorized server-side key/runtime supplied

## Fixture Demo

- [x] Automated: Project Astra selects Fixture and makes zero Live-adapter calls.
- [x] Automated: Project Astra can open its first Review when Live is unavailable.
- [ ] Manual: complete all four Project Astra documents with browser Network panel showing zero `/api/extract` requests.

## Live consent and input

- [x] Automated: privacy explanation, Review requirement, character count, consent checkbox, and no API-key input are visible.
- [x] Automated: empty, unconfirmed, over-20,000-character, and busy states cannot submit.
- [x] Automated: `.txt`, `.md/.markdown`, `.json`, and pasted-text metadata are forwarded unchanged.
- [ ] Manual: verify keyboard focus, screen-reader labels, and `aria-live` feedback at 1280 px and 768 px.
- [ ] Manual: verify the layout remains usable at 280 px.

## Successful Live workflow

- [ ] Manual: run a compatible local serverless runtime with server-only `OPENAI_API_KEY`.
- [ ] Manual: import one short synthetic document and verify Review opens without auto-Accept.
- [ ] Manual: inspect each SourceRef against exact raw input, then Accept and apply the Session.
- [ ] Manual: refresh and verify the Document, Session, and applied Knowledge persist.
- [ ] Manual: import identical raw content again and verify no second endpoint call.

## Failure and retry

- [x] Automated: disabled, missing configuration, refusal, incomplete, content filter, rate limit, upstream failure, timeout, malformed response, invalid Candidate Bundle, document mismatch, and ungrounded evidence map to safe errors.
- [x] Automated: Live failure does not call Fixture and saves no Document, Registry entry, Session, or Knowledge.
- [x] Automated: neither server nor browser adapter retries automatically.
- [ ] Manual: simulate endpoint unavailable, missing key, 429, and timeout; verify input remains and an explicit retry works.

## Security and deployment

- [x] Automated: Remote requests contain no Authorization header or API key.
- [x] Automated: endpoint responses set `Cache-Control: no-store` and emit no wildcard CORS header.
- [x] Automated: raw refusal, raw upstream body, source evidence, and secret details are absent from error envelopes.
- [ ] Manual: inspect production browser sources, network payloads, Local Storage, console, and built assets for secret absence.
- [ ] Manual: confirm same-origin deployment and server environment variables.
- [ ] Manual: configure OpenAI project budget and rate limits before public exposure.
- [ ] Manual: run `npm run smoke:live-ai`; record date, model, endpoint, and pass/fail without saving raw response.

