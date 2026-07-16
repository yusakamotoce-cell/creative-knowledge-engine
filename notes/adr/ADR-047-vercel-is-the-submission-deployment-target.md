# ADR-047: Vercel is the submission deployment target

## Status

Accepted

## Context

Step 9 needs one fixed deployment target for the Vite frontend and same-origin server functions. Platform-neutral guesses would make Preview, Production, environment, and public safety checks non-repeatable.

## Decision

Vercel is the submission deployment target. Vite auto-detection uses `npm run build` and `dist`; TypeScript files under `api/` provide same-origin Web-standard functions. The measured local runtime is Node 22.17.0, so `package.json` pins the supported `22.x` line.

## Consequences

- Deployment preparation has one platform contract.
- No `vercel.json` is added while framework auto-detection is sufficient.
- Vercel account, project, Git integration, environment, and deployment actions remain explicit authenticated operations.
