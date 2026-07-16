# Step 6 Manual Verification Checklist

**Date:** 2026-07-16  
**Target:** desktop browser build from Step 6

Use a fresh browser profile for the empty-workspace pass and preserve the Local Storage key between refresh checks.

## Executed browser smoke — 2026-07-16

- [x] Empty Home and Project Astra progress rendered at 1280 px.
- [x] Demo started Document 01 and exposed the complete labeled Entity Review form.
- [x] Candidate Review collapsed at 768 px with document width equal to viewport width and no page-level horizontal overflow.
- [x] Saved Review appeared in Home progress and Workspace statistics.
- [x] Reset confirmation focused `現在のWorkspaceを維持` first.
- [x] No browser console warning or error was recorded during the smoke path.

The remaining boxes are the repeatable pre-release pass; the automated suite covers the full four-document path and failure branches.

## Core workflow

- [ ] First launch shows Loading, then the empty Home view.
- [ ] Project Astra starts Document 01 without an API key or network request.
- [ ] Arbitrary Import shows the current Fixture-only extraction limitation.
- [ ] A supported text/Markdown/JSON file is read as raw text; an unsupported extension is rejected locally.
- [ ] Entity Accept, Edit, Merge, and confirmed Reject each persist immediately.
- [ ] Entity phase cannot advance while a Candidate is pending.
- [ ] Relationship Accept, duplicate consolidation preview, manual resolution, and Reject work.
- [ ] A blocked Relationship explains the reason and cannot be accepted.
- [ ] Review complete saves before canonical apply.
- [ ] A saved `complete_not_applied` Session can be reopened and applied.
- [ ] Each apply exposes the next manifest-ordered document; the fourth opens Insights.
- [ ] Final Project Astra values are Entity 7, Relationship 5, revision 4, Duplicate 1, Conflict 1, Orphan 1.

## Persistence and failure behavior

- [ ] Refresh after Import restores the Session.
- [ ] Refresh during Entity Review restores decisions and selection can continue.
- [ ] Refresh during Relationship Review restores decisions and phase.
- [ ] Refresh after apply restores Knowledge, Project Astra progress, and recalculated Insights.
- [ ] A Local Storage read/corruption error displays the code and does not auto-delete data.
- [ ] A failed write leaves the prior visible/persisted state retryable.
- [ ] Workspace reset requires confirmation; Cancel preserves data and Confirm saves an empty Snapshot.
- [ ] Starting Demo over unrelated data requires an explicit Demo reset choice.

## Accessibility and layout

- [ ] The Project Astra primary path can be completed using only Tab, Shift+Tab, Enter, Space, and arrow keys.
- [ ] Reset confirmation initially focuses the safe Cancel action.
- [ ] Focus indicators remain visible on links, buttons, selects, and inputs.
- [ ] Status and errors are announced and understandable without relying on color.
- [ ] Candidate lists, forms, headings, and Relationship table expose meaningful labels/headers.
- [ ] At 1280 px the two-column review layout remains readable.
- [ ] At 768 px the layout stacks without page-level horizontal overflow.
- [ ] No console error or React warning appears during the four-document Demo.

Automated coverage verifies the domain results, browser workflow, remount/refresh equivalents, error mapping, atomic failure behavior, phase gates, blocked states, and persistence adapters. The checkboxes above remain the release operator's repeatable visual and keyboard pass.
