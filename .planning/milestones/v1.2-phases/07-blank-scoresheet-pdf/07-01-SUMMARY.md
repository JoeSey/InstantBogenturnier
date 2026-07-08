---
phase: 07-blank-scoresheet-pdf
plan: 01
subsystem: pdf-export
tags: [jspdf, pdf, scoresheet, a5]

requires:
  - phase: 05-pdf-export
    provides: pdfExport.ts's containFit()/blobToDataUri() header-logo scaling pattern
  - phase: 06-certificates-pdf-export
    provides: certificateExport.ts's builder/generator split convention, reused verbatim
provides:
  - Pure, framework-free scoresheet PDF builder/generator (scoresheetExport.ts)
  - Blank A5-portrait grid sized to RoundConfig (rounds x passes x arrows)
  - Handwriting header fields (Name/Klasse/Schießplatz/Schreiber) and signature footer
affects: [07-02 (UI entry point in Einrichtung/Setup)]

tech-stack:
  added: []
  patterns:
    - "buildXxxPdfDoc/generateXxxPdf split (mirrors pdfExport.ts/certificateExport.ts) — testable without touching the Blob output layer"
    - "blobToDataUri copied verbatim per-module (not exported by pdfExport.ts) — matches existing certificateExport.ts convention"

key-files:
  created: [src/lib/utils/scoresheetExport.ts, src/lib/utils/scoresheetExport.test.ts]
  modified: []

key-decisions:
  - "Grid cell sizing computed dynamically from RoundConfig bounds so the whole grid always fits within one A5 page's remaining vertical space, grouping multiple passes side-by-side per row when needed instead of overflowing to page 2."

patterns-established:
  - "A5 portrait format used only by this module — all header logo scaling constants reduced proportionally (18mm/14mm vs A4's 25mm/20mm) to match A5's smaller page size."

requirements-completed: [SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-05, SHEET-06, SHEET-07]

duration: 15min
completed: 2026-07-07
---

# Phase 7 Plan 1: Blank Scoresheet PDF Generation Summary

**Pure `scoresheetExport.ts` module generating a single-page A5-portrait blank scoresheet PDF, grid sized to the current rounds/passes/arrows config, reusing Settings header/logo treatment from pdfExport.ts.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-07-07T07:33:00Z
- **Completed:** 2026-07-07T07:34:53Z
- **Tasks:** 1
- **Files modified:** 2 (both created)

## Accomplishments
- `scoresheetExport.ts` exports `scoresheetPdfFilename`, `buildScoresheetPdfDoc`, `generateScoresheetPdf`
- Blank A5-portrait grid (rounds × passes × arrows) drawn with plain `doc.rect()` cells — no `jspdf-autotable` dependency
- Handwriting header fields (Name, Klasse, Schießplatz, Schreiber) and signature footer lines (Unterschrift Schütze/Schreiber)
- Reuses `containFit()` from pdfExport.ts and a locally-duplicated `blobToDataUri()` for the Settings title/logo header, scaled down proportionally for A5
- Grid layout dynamically groups passes side-by-side per row so any valid RoundConfig (1-20 rounds, 1-30 passes, 1-20 arrows) fits on a single page

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1 (RED): add failing tests for scoresheet PDF generation** - `a38b5b3` (test)
2. **Task 1 (GREEN): implement blank scoresheet PDF generation** - `9ea0bb0` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/utils/scoresheetExport.ts` - Pure scoresheet PDF builder/generator (blank A5 grid, header fields, signature lines)
- `src/lib/utils/scoresheetExport.test.ts` - Unit tests: filename formatting, blob type/size, single-page A5 output across multiple RoundConfig shapes

## Decisions Made
- Grid row grouping (multiple passes per physical row) is computed algorithmically from available height/width rather than fixed layout constants, so it scales correctly across the full valid RoundConfig range without needing per-config tuning.

## Deviations from Plan

None - plan executed exactly as written. TDD RED/GREEN gate followed per plan's `tdd="true"` task.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `scoresheetExport.ts`'s three exports are ready for Plan 02 to wire into a Svelte UI entry point in Einrichtung (Setup), next to the rounds/passes config.
- No blockers.

---
*Phase: 07-blank-scoresheet-pdf*
*Completed: 2026-07-07*

## Self-Check: PASSED
