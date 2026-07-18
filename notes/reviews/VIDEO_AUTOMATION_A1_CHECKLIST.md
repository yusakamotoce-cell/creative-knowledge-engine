# Video Automation A1 Checklist

| Item | Status | Evidence |
|---|---|---|
| Preflight Git status and log | PASS | main aligned with origin/main before work; six requested source documents were untracked inputs |
| Baseline tests | PASS | 61 files / 600 tests before automation changes |
| Baseline typecheck | PASS | completed before implementation |
| Baseline lint | PASS | completed before implementation |
| Baseline build | PASS | completed before implementation |
| Post-change tests | PASS | 63 files / 620 tests, parsed into generated metadata and rerun after recording |
| Post-change typecheck / lint / build | PASS | all completed after 14-clip recording |
| Playwright 1.61+ exact dependency | PASS | `@playwright/test` 1.61.1 |
| Chromium install | PASS | Playwright Chromium 1228 installed |
| 1920×1080 screencast | PASS | VP8 WebM inspected with ffprobe |
| Fixture state preparation | PASS | all 7 required storageState files generated through UI actions |
| `/api/extract` calls during Fixture preparation | PASS | 0 |
| external requests during Fixture preparation | PASS | 0 |
| Non-Live-AI generation | PASS | Shots 01–13 and 15: exact 14-clip set |
| Non-Live-AI files > 10 KiB | PASS | all 14 files passed |
| Non-Live-AI target duration ±3 seconds | PASS | ffprobe durations: 7.84–12.76 seconds; every clip within its own target tolerance |
| 1920×1080 WebM | PASS | all 14 files passed ffprobe inspection |
| Shot assertions | PASS | Search ranking, 7-node/5-edge Graph, Knowledge-only Export, dynamic test count, and final card verified |
| Fixture clip `/api/extract` requests | PASS | 0 across all 14 reports |
| Fixture clip external requests | PASS | 0 across all 14 reports |
| Console errors / page errors | PASS | 0 / 0 across all 14 reports |
| Internal `astra-*` IDs absent from framing | PASS | per-shot visible-text assertion plus representative-frame visual inspection |
| Public story name | PASS | UI display constant is `The Names Between Stars` |
| Shot 14 selection | PASS | manifest selects success variant 14A |
| Real OpenAI API recording | NOT_RUN | intentionally excluded from this milestone |
| Secret scan | PASS | 0 findings across 328 text files |
| Non-Live-AI artifact verification | PASS | exact 14-file verifier passed; no unexpected clip |
| Final all-shot verification | NOT_RUN | Shot 14A intentionally remains unrecorded |
| Audio / subtitles / Descript | NOT_RUN | outside A1 proof milestone |
