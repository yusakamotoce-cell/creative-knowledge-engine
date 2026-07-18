# Video Automation A1 Decisions

- Status: IN_PROGRESS — 14 non-Live-AI clips verified; Shot 14A remains
- Authority: `CODEX_VIDEO_AUTOMATION_A1_v1.1_OVERRIDE.md`
- Public demo story: `The Names Between Stars`
- Internal fixture identity: unchanged Project Astra IDs, filenames, Candidate Bundles, and golden JSON
- Target runtime: 165 seconds / 2:45
- Selected Live AI variant: Shot 14A, Production success
- Live AI recording status: NOT_RUN in this milestone

## Implementation decisions

1. Playwright `1.61.1` is pinned exactly and Chromium is installed separately with `video:install`.
2. Recording uses `page.screencast` at 1920×1080. Playwright trace and built-in context video are disabled.
3. The local target is Vite preview. `VIDEO_BASE_URL` may select a deployment, but query, fragment, credentials, and non-http protocols are rejected.
4. Fixture checkpoints are created by operating the existing browser UI and then calling `browserContext.storageState`. Storage payloads are not fabricated.
5. Fixture preparation and Fixture recording block `/api/extract` and every cross-origin request.
6. The public story rename is isolated in one display constant. Internal Project Astra code names and fixture contracts remain unchanged.
7. Recording-only CSS and presentation labels hide session and Candidate identifiers and translate unresolved reference display into creator-readable names; they do not alter product state or domain data.
8. Select option labels are redacted without replacing React-owned text nodes, so recording presentation cannot break subsequent UI state updates.
9. `showActions`, chapter, and overlay annotations make the human decision visible. Overlay content is HTML-escaped.
10. A shared recorder installs the Fixture network guard before page preparation, records to a temporary filename, and promotes a clip only after network, console, page, size, duration, and shot assertions pass.
11. Shot 05 remains the first proof and is now generated through the same shared recorder as the other non-Live-AI shots.
12. The typed manifest contains the authoritative v1.1 timings. Shot 14A is selected; no fallback clip is selected.
13. Test metadata parses the current Vitest summary. Historical test totals are not stored as a Shot 15 constant.
14. Artifact verification requires the exact 14-file non-Live-AI set, validates per-shot reports, and uses ffprobe when available.
15. The final card contract is:

    ```text
    From scattered lore
    to creator-controlled canon.
    ```

## Deferred after the non-Live-AI milestone

- actual Production Shot 14A recording
- final 15-shot artifact verification and assembly
- video assembly, TTS, subtitles, Descript, upload, and Devpost work
