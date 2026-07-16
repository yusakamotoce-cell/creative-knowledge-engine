# Step 9 Deployment Checklist

**Status:** BLOCKED — REAL_API_NOT_VERIFIED

**Date:** 2026-07-17

**Starting commit:** `3040e17 Complete Creative Knowledge Engine Step 8`

Status values are `NOT_RUN`, `PASS`, `FAIL`, and `BLOCKED`. Local automated evidence does not substitute for a public Preview or Production check.

| Check | Status | Evidence / next action |
| --- | --- | --- |
| Step 8 commit is current | PASS | Starting HEAD is `3040e17`. |
| Starting working tree is clean | PASS | Confirmed before Step 9 edits. |
| Existing 561 tests | PASS | All passed before implementation. |
| Starting typecheck / lint / build / offline audit | PASS | All passed before implementation; audit found 0. |
| Final automated suite | PASS | 61 files, 594 tests passed. |
| Final typecheck / lint / build / offline audit | PASS | All passed; build transformed 191 modules and audit found 0. |
| GitHub repository and push | BLOCKED | No Git remote is configured. User must create/select the repository and add/push the remote. |
| Vercel project and Git integration | BLOCKED | Requires authenticated Vercel project creation and GitHub connection. |
| Preview deploy, Live AI disabled | BLOCKED | Requires Vercel project and Preview deployment. |
| Preview environment separation | BLOCKED | Set Preview values manually; begin with `LIVE_AI_ENABLED=false`. |
| Dedicated OpenAI Project | BLOCKED | User must create/select it, configure budget/usage notification, and issue a minimal server-only key. |
| Preview Firewall rate limit | BLOCKED | Publish `POST /api/extract`, same IP/client, 5 requests/minute, HTTP 429. |
| Preview health | BLOCKED | Run public smoke after Preview URL exists. Local health tests pass. |
| Preview Fixture Demo | BLOCKED | Complete all four documents in the deployed browser with Live AI disabled. Local regression passes. |
| Preview real Live AI smoke | BLOCKED | No Preview URL or authorized server key is available. |
| Preview Structured Outputs and `store: false` | BLOCKED | Local request-shape tests pass; real API compatibility is unverified. |
| Preview SourceRef grounding | BLOCKED | Local grounding tests pass; inspect real smoke evidence against the synthetic input. |
| Preview Review and Apply | BLOCKED | Verify real extraction opens Review and can be accepted/applied. |
| Preview identical-content reImport | BLOCKED | Verify it makes no second API request. Local regression passes. |
| Preview Search | BLOCKED | Public browser verification required; local regression passes. |
| Preview Graph | BLOCKED | Public browser verification required; local regression passes. |
| Preview Export | BLOCKED | Public browser download verification required; local regression passes. |
| Preview refresh and Local Storage | BLOCKED | Public browser verification required; local regression passes. |
| Production deploy from passing Preview commit | BLOCKED | Preview has not run. |
| Production environment separation | BLOCKED | Configure only after Preview passes. |
| Production Firewall rate limit | BLOCKED | Live AI must remain disabled until the rule is published and verified. |
| Production health | BLOCKED | Production URL does not exist. |
| Production Fixture Demo | BLOCKED | Production URL does not exist. |
| Production real Live AI smoke | BLOCKED | Production URL/key/configuration do not exist. |
| Production Search / Graph / Export | BLOCKED | Production URL does not exist. |
| Chrome and Edge | NOT_RUN | Test both browsers after deployment. |
| Responsive 1280 px and 768 px | NOT_RUN | Test after deployment. |
| Console and Network inspection | NOT_RUN | Confirm zero unexpected errors, secret absence, same-origin API, and `no-store`. |
| Public response `no-store` | BLOCKED | Automated handler and smoke tests pass; public headers are unverified. |
| Secret scan | PASS | `npm run scan:secrets` reports 0 findings across tracked/untracked source and built artifacts. |
| Public app URL | BLOCKED | Not configured. |
| Repository URL | BLOCKED | Not configured. |
| Stable Step 9 commit | BLOCKED | Step 9 is uncommitted and real API verification is incomplete. |
| Frozen specifications and golden fixtures | PASS | No protected source or expected JSON was modified. |

## Required completion evidence

Record the Preview URL, Production URL, stable commit, deployment date, browser matrix, WAF rule state, safe smoke result, model returned by the API, and PASS/FAIL for every public item. Do not record the API key, Authorization header, raw source, raw model response, raw Candidate Bundle, or full SourceRefs.
