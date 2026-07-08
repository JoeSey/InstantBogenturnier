---
phase: 05-pdf-export
plan: 02
subsystem: export
tags: [jspdf, jspdf-autotable, svelte5, dexie, playwright, pdf]

requires:
  - phase: 05-pdf-export plan 01
    provides: "Dexie v4 settings singleton table (title + logoLeftBlob/logoRightBlob)"
provides:
  - "generateResultsPdf() / buildResultsPdfDoc() / buildClassTableRows() / resultsPdfFilename() pure PDF generation functions"
  - "Results.svelte PDF export button + include-incomplete checkbox, wired to db.settings and computeClassRankings"
affects: [phase 6 certificates]

tech-stack:
  added: [jspdf@4.2.1, jspdf-autotable@5.0.8]
  patterns:
    - "Pure, framework-free PDF generation function returning a Blob, consuming computeClassRankings() output directly (mirrors ranking.ts's pure-function style)"
    - "Browser download trigger via URL.createObjectURL + anchor click + URL.revokeObjectURL"

key-files:
  created:
    - src/lib/utils/pdfExport.ts
    - src/lib/utils/pdfExport.test.ts
    - e2e/pdfExport.spec.ts
  modified:
    - package.json
    - package-lock.json
    - src/lib/views/Results.svelte
    - src/lib/i18n/strings.de.ts

key-decisions:
  - "Exposed buildResultsPdfDoc() (returns the jsPDF instance) alongside generateResultsPdf() (returns the Blob) so tests can assert doc.getNumberOfPages() directly instead of round-tripping through a Blob, per the plan's Task 1 behavior spec."
  - "e2e helper omits a 'Speichern' click after filling the custom rounds/passes fields — the Setup page's Runden-und-Passen section now auto-saves on blur (post-v1.0 polish, 260706-9iv), so the plan's presetExportImport.spec.ts-style helper needed a small adaptation (blur instead of click) to avoid a stale-selector timeout."

patterns-established:
  - "PDF export as a pure function returning a Blob, independent of Svelte component state — reusable for Phase 6 certificates without rewriting."

requirements-completed: [PDF-01, PDF-04, PDF-05, PDF-06, PDF-07]

duration: ~45min
completed: 2026-07-06
---

# Phase 5 Plan 02: PDF Export Vertical Slice Summary

**jsPDF + jspdf-autotable installed as production dependencies; a pure `generateResultsPdf()` function producing a paginated, per-class Rank/Name/Gesamt PDF from `computeClassRankings()` output, wired into the Results view via a working "PDF exportieren" button and include-incomplete checkbox, verified end-to-end including fully offline.**

## Performance

- **Tasks:** 2 completed
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- `src/lib/utils/pdfExport.ts`: `generateResultsPdf()`, `buildResultsPdfDoc()`, `buildClassTableRows()`, and `resultsPdfFilename()` — pure, framework-free functions producing an A4-portrait PDF with one page-break per class, a striped Rank/Name/Gesamt table via `jspdf-autotable`, optional title line and left/right logo images from the Plan 01 settings Blob fields, and `includeIncomplete`-aware row filtering (default: exclude).
- 8 unit tests covering: Blob type/size, exact 3-column row shape, include/exclude-incomplete filtering, filename format, and page-count-per-class behavior (via `getNumberOfPages()`).
- `Results.svelte`: new PDF export GlassCard section (checkbox + button) between the results grid and the "Neues Turnier starten" reset button, reading `db.settings` via `liveQuery`, triggering a real browser download via `URL.createObjectURL` + anchor click, with error feedback reusing the existing `errorFeedback` state variable.
- `e2e/pdfExport.spec.ts`: two Playwright tests against the production build — filename format assertion, and a second test with `context.setOffline(true)` proving the export has zero network dependency (PDF-06).

## Task Commits

1. **Task 1: Install jsPDF/jspdf-autotable + pure PDF generation function** - `84583bb` (feat)
2. **Task 2: Wire export button + checkbox into Results view** - `a0290ae` (feat)

## Files Created/Modified
- `src/lib/utils/pdfExport.ts` - Pure PDF generation: `generateResultsPdf()`, `buildResultsPdfDoc()`, `buildClassTableRows()`, `resultsPdfFilename()`.
- `src/lib/utils/pdfExport.test.ts` - 8 unit tests covering Blob output, column shape, include-incomplete filtering, filename format, and per-class pagination.
- `package.json` / `package-lock.json` - Adds `jspdf@4.2.1` and `jspdf-autotable@5.0.8` as production dependencies.
- `src/lib/views/Results.svelte` - Adds the PDF export controls section (checkbox + button), `settingsQuery`/`includeIncomplete` state, and `handleExport()`.
- `src/lib/i18n/strings.de.ts` - Adds the `resultsPdf` strings section (exportButton, includeIncompleteLabel, includeIncompleteHelper, exportError) per 05-UI-SPEC.md's Copywriting Contract.
- `e2e/pdfExport.spec.ts` - New Playwright spec: filename-format assertion + offline-mode assertion.

## Decisions Made
- **`buildResultsPdfDoc()` exposed alongside `generateResultsPdf()`:** the plan's Task 1 behavior spec required asserting `doc.getNumberOfPages()` directly against a real jsPDF instance rather than inferring page count from Blob size, so the doc-building logic was factored into its own exported function that `generateResultsPdf()` calls before serializing to a Blob.
- **e2e setup helper uses `blur()` instead of a `Speichern` click** after filling the Runden/Passen fields — the Setup page's rounds config auto-saves on blur since the 260706-9iv v1.0 polish pass (predates this plan), so the `Speichern` button referenced in the plan's e2e-pattern guidance no longer exists in that section. Adapted to match current behavior, verified the helper reliably reaches the Ergebnisse view with complete results.

## Deviations from Plan

None - plan executed exactly as written, aside from the two decisions above (both necessary adaptations to keep the plan's described behavior working against the current codebase state, not scope changes).

## Issues Encountered
- Initial e2e run timed out waiting for a `Speichern` button in the "Runden und Passen" section that no longer exists (removed post-v1.0 in favor of auto-save). Fixed by replacing the click with a `.blur()` call on the last filled field, confirmed both e2e tests then pass.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The full "trainer exports ranked results as a PDF" vertical slice is complete and verified, including offline operation.
- `generateResultsPdf()` is a pure function independent of Svelte state — ready for Phase 6 (certificates) to reuse the same settings/logo-Blob plumbing without rewriting PDF logic.
- No blockers identified.

---
*Phase: 05-pdf-export*
*Completed: 2026-07-06*
