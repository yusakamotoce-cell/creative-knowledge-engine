# Video Automation A1 Checklist

| Item | Status | Evidence |
|---|---|---|
| Preflight Git status and log | PASS | main aligned with origin/main before work; six requested source documents were untracked inputs |
| Baseline tests | PASS | 61 files / 600 tests before automation changes |
| Baseline typecheck | PASS | completed before implementation |
| Baseline lint | PASS | completed before implementation |
| Baseline build | PASS | completed before implementation |
| Post-change tests | PASS | 63 files / 616 tests, parsed into generated metadata |
| Post-change typecheck / lint / build | PASS | all completed after representative recording |
| Playwright 1.61+ exact dependency | PASS | `@playwright/test` 1.61.1 |
| Chromium install | PASS | Playwright Chromium 1228 installed |
| 1920×1080 screencast | PASS | VP8 WebM inspected with ffprobe |
| Fixture state preparation | PASS | all 7 required storageState files generated through UI actions |
| `/api/extract` calls during Fixture preparation | PASS | 0 |
| external requests during Fixture preparation | PASS | 0 |
| Shot 05 generation | PASS | `05_accept_entity.webm` |
| Shot 05 size > 10 KiB | PASS | 1,207,770 bytes |
| Shot 05 target duration ±3 seconds | PASS | media duration 13.16 seconds for 13-second target |
| Internal `astra-*` IDs absent from proof framing | PASS | visual check at chapter, Source Reference, and accepted frames; recording-only CSS hides session, Candidate, and registered Entity IDs |
| Public story name | PASS | UI display constant is `The Names Between Stars` |
| Shot 14 selection | PASS | manifest selects success variant 14A |
| Real OpenAI API recording | NOT_RUN | intentionally excluded from this milestone |
| Secret scan | PASS | 0 findings across 324 text files |
| Final all-shot verification | NOT_RUN | deferred until all shots exist |
| Audio / subtitles / Descript | NOT_RUN | outside A1 proof milestone |
