# Video Automation A1 Decisions

- Status: IN_PROGRESS — representative Fixture shot milestone
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
7. Recording-only CSS hides session and Candidate identifiers in the proof shot; it does not alter product state or domain data.
8. `showActions`, chapter, and overlay annotations make the human decision visible. Overlay content is HTML-escaped.
9. Shot 05 is the first proof because it exercises restored Review state, an exact Source Reference, and an `Accept as new` decision without Live AI.
10. The typed manifest contains the authoritative v1.1 timings. Shot 14A is selected; no fallback clip is selected.
11. Test metadata parses the current Vitest summary. The previous 600-test count is not stored as a constant.
12. The final card contract is:

    ```text
    From scattered lore
    to creator-controlled canon.
    ```

## Deferred after the proof milestone

- Shots 01–04 and 06–15
- actual Production Shot 14A recording
- final artifact verification across all selected shots
- video assembly, TTS, subtitles, Descript, upload, and Devpost work
