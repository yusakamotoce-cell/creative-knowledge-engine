# Step 7 Manual Verification Checklist

**Date:** 2026-07-16  
**Target:** desktop browser build from Step 7

Use completed Project Astra Knowledge for the main pass. Use a fresh empty Workspace for the empty-state pass. Automated tests cover the deterministic core contracts; this checklist covers browser presentation, keyboard flow, downloaded-file inspection, and responsive behavior.

## Executed browser smoke — 2026-07-16

- [x] Completed all four Project Astra Documents through the real Review UI and reached revision 4, 7 Entities, 5 Relationships, one Orphan, one Conflict, and one Duplicate group.
- [x] Full-width `ＮＯＶＡ` produced two scored results in formal ranking order; Enter selected the first result and shared its detail.
- [x] Refresh rebuilt a 7-node/5-edge Graph with all relation types selected.
- [x] Zoom/reset, Orphan removal (6 nodes/5 edges), keyboard Node selection, and keyboard Relationship-list selection worked.
- [x] JSON preview opened from the initially closed state and showed schema version 1, revision 4, and canonical Knowledge only.
- [x] Knowledge, Search, and Graph had no page-level horizontal overflow at 768 px; the 1280 px desktop path remained readable.
- [x] No browser console warning or error was recorded during the Step 7 smoke.

The actual file download remains covered by the isolated adapter and UI integration tests so the browser pass does not create a user-side download artifact.

## Search

- [ ] Search an Entity by name and confirm its matched field and match kind.
- [ ] Search `ASC` by alias and an existing tag by tag.
- [ ] Search full-width `ＮＯＶＡ` and confirm both matching Entities appear in deterministic score order.
- [ ] Apply multiple EntityType selections and confirm OR behavior.
- [ ] Apply multiple tags and confirm AND behavior.
- [ ] Search `unknown` and confirm the no-result state, proving description is not searched.
- [ ] Select a result and inspect shared Entity detail.
- [ ] Use Enter to select the first result, Escape to clear, and Tab/Enter/Space to select list items.

## Graph

- [ ] Confirm Project Astra renders 7 nodes and 5 directed edges.
- [ ] Confirm the legend distinguishes all EntityTypes with text as well as color.
- [ ] Apply EntityType and relationType filters and inspect the updated counts.
- [ ] Disable Orphans and confirm Quiet Prism disappears without changing Knowledge.
- [ ] Select a node by keyboard and inspect Entity detail.
- [ ] Select an edge and select the same Relationship through the keyboard Relationship list.
- [ ] Confirm Nova Arclight has three outgoing Relationships and First Light Briefing has two incoming and one outgoing.
- [ ] Exercise zoom from 50% through 200%, Reset view, scrolling, and Fit view.
- [ ] Confirm the empty Graph state in an empty Workspace or with all EntityTypes disabled.

## Export and persistence

- [ ] Confirm JSON preview is closed initially, then open and close it.
- [ ] Confirm revision and Entity/Relationship counts match current Knowledge.
- [ ] Download `creative-knowledge-YYYYMMDD.json`.
- [ ] Parse the downloaded JSON and confirm the root keys are exactly `schemaVersion`, `knowledgeRevision`, and `knowledge`.
- [ ] Confirm Entity attributes, claims, SourceRefs, Relationships, and timestamps are present.
- [ ] Confirm raw Imported Document content, registry, Candidate, Review state/history, Local Storage Envelope, UI state, and Insights are absent.
- [ ] Refresh and confirm Search and Graph rebuild from saved canonical Knowledge.

## Accessibility, responsive layout, and diagnostics

- [ ] Complete Search and Graph selection paths using keyboard only.
- [ ] Confirm visible focus on Search results, Graph nodes/edges, Relationship list, filters, and controls.
- [ ] Confirm result count, export status, and errors are announced without relying on color.
- [ ] At 1280 px, confirm Search details and Graph controls remain readable.
- [ ] At 768 px, confirm panels stack and there is no page-level horizontal overflow; Graph may scroll internally.
- [ ] Confirm there is no browser console warning or error during Search, Graph, preview, refresh, and the safe Export path.
