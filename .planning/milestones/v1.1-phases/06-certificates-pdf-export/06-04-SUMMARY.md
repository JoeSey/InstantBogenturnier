---
phase: 06-certificates-pdf-export
plan: 04
subsystem: results-ui
tags: [svelte, pdf-export, certificates, ui]
dependency-graph:
  requires: [06-02]
  provides: [D-01, D-02, D-03, D-04]
  affects: [src/lib/views/Results.svelte, src/lib/components/ResultsTable.svelte]
tech-stack:
  added: []
  patterns:
    - "Reused Phase 5 WR-04 anchor-download pattern (append to DOM before .click(), revoke object URL after) for both new export paths"
    - "Callback prop (oncertexport) on ResultsTable.svelte lets the parent supply class-name-aware handlers without RankedRow needing a className field"
key-files:
  created: []
  modified:
    - src/lib/components/ResultsTable.svelte
    - src/lib/components/ResultsTable.test.ts
    - src/lib/i18n/strings.de.ts
    - src/lib/views/Results.svelte
decisions:
  - "className passed to handleSingleCertExport is read from the exact same in-scope variable (cls.name on desktop, classesWithResults lookup by selectedClassId on mobile) the row was rendered from — no cross-class lookup (T-6-08)"
metrics:
  duration: "~20 min"
  completed: 2026-07-06
---

# Phase 6 Plan 4: Wire Certificate Export UI Summary

Wired the two Phase 6 certificate-export entry points (bulk ZIP and per-row single PDF) into the existing Results view, reusing Plan 02's `certificateExport.ts` functions and the Phase 5 WR-04 download pattern verbatim.

## What Was Built

- **`ResultsTable.svelte`**: added a required `oncertexport: (row: RankedRow) => void` callback prop, a new "Urkunde" column (`strings.results.columnCertificate`, added to `strings.de.ts`), and a per-row 44x44px certificate action button (`FileDown` icon, `aria-label` from `strings.certificateExport.singleButton`).
- **`Results.svelte`**: added `handleBulkCertExport()` (calls `generateBulkCerts`, downloads a ZIP via `zipFilename()`) and `handleSingleCertExport(row, className)` (calls `generateSingleCertPdf`, downloads via `certificatePdfFilename(row.name)`), both mirroring `handleExport()`'s settings-fetch-and-download structure exactly, including WR-04's append-before-click / revoke-after pattern.
- Added a second button ("Urkunden erstellen", `strings.certificateExport.bulkButton`) next to the existing "PDF exportieren" button, both wrapped in a `flex flex-col gap-2 md:flex-row` container per 06-UI-SPEC.md.
- Wired `oncertexport` at both `ResultsTable` call sites: mobile (looks up the selected class's name from `classesWithResults`) and desktop per-class grid (`cls.name` already in scope).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Updated `ResultsTable.test.ts` render calls**
- **Found during:** Task 1
- **Issue:** Adding the required `oncertexport` prop broke all existing `render(ResultsTable, ...)` calls in the component's test suite (`npm run check` type errors).
- **Fix:** Added `oncertexport: () => {}` to every `render()`/initial-props call in `ResultsTable.test.ts`.
- **Files modified:** `src/lib/components/ResultsTable.test.ts`
- **Commit:** d42267e

## Deferred / Out-of-Scope Issues

- `src/lib/utils/pdfExport.test.ts` has 5 pre-existing `npm run check` type errors (unrelated `SettingsRecord` `id` property shape mismatch) — not touched by this plan's files, out of scope per the scope-boundary rule.

## Verification

- `npm run check`: 0 errors in any file touched by this plan (5 pre-existing errors remain only in `pdfExport.test.ts`, unrelated).
- `npx vitest run src/lib/components/ResultsTable.test.ts`: 5/5 passed.
- `npx vitest run src/lib/views/Results.test.ts`: 6/6 passed.

## Self-Check

- `src/lib/components/ResultsTable.svelte` — FOUND (modified)
- `src/lib/views/Results.svelte` — FOUND (modified)
- Commit d42267e — FOUND
- Commit c241e10 — FOUND

## Self-Check: PASSED
