---
phase: 07-blank-scoresheet-pdf
plan: 02
subsystem: scoresheet-pdf-ui
tags: [svelte, pdf, e2e, i18n]
dependency-graph:
  requires: [src/lib/utils/scoresheetExport.ts]
  provides: [scoresheet-download-ui, scoresheetExport-e2e-coverage]
  affects: [src/lib/views/SetupRounds.svelte]
tech-stack:
  added: []
  patterns:
    - "Results.svelte's handleExport settings-fetch + WR-04 append-before-click download sequence, replicated verbatim in SetupRounds.svelte"
key-files:
  created:
    - e2e/scoresheetExport.spec.ts
  modified:
    - src/lib/views/SetupRounds.svelte
    - src/lib/i18n/strings.de.ts
decisions: []
metrics:
  duration: ~20 min
  completed: 2026-07-07
---

# Phase 07 Plan 02: Wire Scoresheet PDF Download into Setup Summary

Wired the Plan 01 scoresheet PDF generator into a "Schießformular (PDF) drucken" download button in `SetupRounds.svelte`, driven by the existing `db.rounds` liveQuery, and added e2e coverage proving the download works both online and fully offline plus after a custom rounds/passes config change.

## What Was Built

- Added a `scoresheetExport` i18n section (`downloadButton`, `exportError`) to `src/lib/i18n/strings.de.ts`, following the existing `certificateExport` block's placement/comment convention.
- Added `handleScoresheetExport()` to `SetupRounds.svelte`, reusing the component's existing `existingConfig` liveQuery-derived value (no second query), guarding against a missing `db.rounds` row with an inline `errorFeedback` message, and replicating `Results.svelte`'s exact settings-fetch + object-URL + append-before-click (WR-04) + revoke download sequence.
- Added a `<FileDown>`-iconed download button (disabled while `existingConfig` is falsy) directly beneath the rounds/passes summary line, plus an `errorFeedback` paragraph, styled with the same teal-500/teal-600 + dark-variant classes used by `Results.svelte`'s export button.
- Created `e2e/scoresheetExport.spec.ts` with 3 Playwright tests: default-config download + filename assertion, offline-mode download (SHEET-07), and download after switching to a custom Runden=2/Passen=5/Pfeile=4 configuration (SHEET-02 reachability proof).

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx svelte-check --workspace .` — zero errors attributable to `SetupRounds.svelte`.
- `npx playwright test e2e/scoresheetExport.spec.ts` — all 3 tests pass, including the offline-mode test.

## Self-Check

- FOUND: src/lib/views/SetupRounds.svelte (modified, contains `handleScoresheetExport`)
- FOUND: src/lib/i18n/strings.de.ts (modified, contains `scoresheetExport`)
- FOUND: e2e/scoresheetExport.spec.ts
- FOUND commit 75cd5dd
- FOUND commit 0f0f473

## Self-Check: PASSED
