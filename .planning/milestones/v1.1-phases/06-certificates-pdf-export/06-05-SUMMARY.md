---
phase: 06-certificates-pdf-export
plan: 05
subsystem: testing
tags: [playwright, e2e, certificates, pdf, zip, offline]

requires:
  - phase: 06-certificates-pdf-export
    provides: bulk ZIP certificate export button ("Urkunden erstellen") and per-row single-PDF certificate export button (aria-label "Urkunde") in the Ergebnisse view
provides:
  - Playwright e2e coverage proving bulk certificate ZIP download works online and offline
  - Playwright e2e coverage proving per-row single certificate PDF download works for the correct shooter
affects: [06-certificates-pdf-export]

tech-stack:
  added: []
  patterns:
    - "Reused setUpTournamentWithResults(page) helper pattern from e2e/pdfExport.spec.ts, copied verbatim into each new spec file (no shared e2e helper module existed yet)"

key-files:
  created:
    - e2e/certificateBulkExport.spec.ts
    - e2e/certificateSingleExport.spec.ts
  modified: []

key-decisions:
  - "Copied setUpTournamentWithResults helper verbatim into both new spec files rather than factoring into a shared module, matching the plan's stated fallback option and the existing e2e/ directory convention of self-contained spec files"
  - "Scoped the per-row certificate button lookup to the specific table row containing 'Anna' (row.getByRole('button', { name: 'Urkunde' })) rather than a bare page-level lookup, to make the test robust to future multi-shooter fixtures even though only one shooter exists in this setup"

patterns-established: []

requirements-completed: [D-01, D-02, D-03, D-04]

duration: 12min
completed: 2026-07-06
---

# Phase 6 Plan 05: E2E Certificate Export Coverage Summary

**Playwright end-to-end tests proving both bulk ZIP and per-row single-PDF certificate export work in a real browser, including bulk export under zero network connectivity**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-06T21:13:00Z
- **Completed:** 2026-07-06T21:25:00Z
- **Tasks:** 2
- **Files modified:** 2 (both created)

## Accomplishments
- `e2e/certificateBulkExport.spec.ts`: proves clicking "Urkunden erstellen" downloads `Urkunden_YYYY-MM-DD.zip`, both online and with `context.setOffline(true)` set
- `e2e/certificateSingleExport.spec.ts`: proves clicking the per-row certificate action (aria-label "Urkunde") downloads `Urkunde_Anna_YYYY-MM-DD.pdf` for the clicked shooter

## Task Commits

Each task was committed atomically:

1. **Task 1 & 2: E2E tests for bulk ZIP export and per-row single certificate export** - `47b2a65` (test)

_Note: both spec files were authored together and verified as a pair before committing since they share the identical setup helper and verification command; no code changes were needed between them, so they were committed in one atomic commit._

## Files Created/Modified
- `e2e/certificateBulkExport.spec.ts` - Playwright spec: bulk ZIP download assertion (online + offline variants)
- `e2e/certificateSingleExport.spec.ts` - Playwright spec: per-row single PDF download assertion scoped to shooter "Anna"

## Decisions Made
- Reused the `setUpTournamentWithResults` helper verbatim in each new spec file, matching the existing `e2e/pdfExport.spec.ts` convention of self-contained spec files with no shared helper module
- Scoped the single-certificate button lookup to the table row containing "Anna" for robustness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Two pre-existing, unrelated e2e tests (`e2e/results.spec.ts:120` and `e2e/scoring.spec.ts:94`) failed intermittently when run as part of the full `npm run test:all` suite (30s timeouts / disabled-button race conditions unrelated to certificate export). Re-running `npx playwright test e2e/results.spec.ts e2e/scoring.spec.ts` in isolation showed all 8 tests passing, confirming this is pre-existing test flakiness under full-suite load, not a regression introduced by this plan. Out of scope per the deviation rules' scope boundary (files unrelated to this plan's changes) — logged here, not fixed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
Both certificate export UI entry points (bulk ZIP and per-row single PDF) now have real-browser e2e proof matching the rigor already established for Phase 5's PDF export, including offline operation for the bulk path. Phase 6 test coverage is complete for D-01 through D-04.

---
*Phase: 06-certificates-pdf-export*
*Completed: 2026-07-06*
