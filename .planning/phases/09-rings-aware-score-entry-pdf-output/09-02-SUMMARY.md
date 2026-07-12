---
phase: 09-rings-aware-score-entry-pdf-output
plan: 02
subsystem: pdf-export
tags: [vitest, jspdf, autotable, dfbv]

# Dependency graph
requires:
  - phase: 09-01
    provides: "RankedRow.count5/count4to1/countM widened fields (mode-agnostic, computed unconditionally)"
provides:
  - "Rings-aware buildClassTableRows(rows, includeIncomplete, numberOfRounds, rings=10) — 5-ring rows combine X+5 into one number, followed by count4to1, then countM"
  - "buildResultsPdfDoc/generateResultsPdf roundsConfig Pick<> widened to include 'rings'; head column switches between 'X/10/9' and 'X+5/4-1/M'"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["rings: 10 | 5 = 10 optional-parameter default in buildClassTableRows mirrors the same pattern used in 09-01's pure scoring functions"]

key-files:
  created: []
  modified:
    - src/lib/utils/pdfExport.ts
    - src/lib/utils/pdfExport.test.ts

key-decisions:
  - "No code change needed in Results.svelte (Task 2) — its existing call site already passes the full $derived roundsConfig object (which carries .rings at runtime since Phase 8); only pdfExport.ts's type annotations needed widening, confirmed via a clean npx tsc --noEmit."
  - "Tests assert on jspdf-autotable's runtime-attached doc.lastAutoTable.head[0].raw (the raw header row array) rather than .settings.head, since .settings does not carry a head field on the attached lastAutoTable object — verified empirically via a throwaway debug test before writing the real assertions."

requirements-completed: [TARGET-07, TARGET-09]

# Metrics
duration: 25min
completed: 2026-07-12
---

# Phase 9 Plan 2: Rings-Aware PDF Header/Row Output Summary

**Results-list PDF's hit-count column now switches between the unchanged 10-ring 'X/10/9' header/values and a distinct 5-ring 'X+5/4-1/M' header combining X+5 hits into one number, per the locked decision — completing TARGET-07 and the PDF-output half of TARGET-09.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-07-12T13:40:00Z
- **Completed:** 2026-07-12T14:05:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `buildClassTableRows` gained a `rings: 10 | 5 = 10` parameter; 5-ring output combines `row.countX + row.count5` into the first number, followed by `row.count4to1` and `row.countM`
- `buildResultsPdfDoc`/`generateResultsPdf` widened their `roundsConfig` parameter type from `Pick<RoundConfig, 'numberOfRounds'>` to `Pick<RoundConfig, 'numberOfRounds' | 'rings'>`, computing `rings = roundsConfig?.rings ?? 10` alongside the existing `numberOfRounds` line
- The PDF table's head row's hit-count column literal now branches: `rings === 5 ? 'X+5/4-1/M' : 'X/10/9'`
- 10-ring output confirmed byte-identical to pre-phase behavior via regression-guard tests (both omitted `roundsConfig` and explicit `rings: 10`)
- Confirmed `Results.svelte`'s existing `generateResultsPdf(...)` call site requires zero runtime code changes — it already forwards the full `$derived` `RoundConfig` object (which carries `.rings` since Phase 8) — verified via a clean `npx tsc --noEmit`

## Task Commits

Each task was committed atomically:

1. **Task 1: Rings-aware hit-count header and row values in pdfExport.ts** - `ae6ab57` (feat)
2. **Task 2: Confirm Results.svelte's roundsConfig plumbing needs no runtime change** - no code change required; verified via `npx tsc --noEmit` (clean), folded into this plan's metadata commit

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/utils/pdfExport.ts` - `buildClassTableRows` gains `rings` param and 5-ring branch; `buildResultsPdfDoc`/`generateResultsPdf` widen `roundsConfig` type and thread `rings` through to the head/body construction
- `src/lib/utils/pdfExport.test.ts` - `makeRow` test helper widened with `count5`/`count4to1`/`countM` defaults; new tests for the 5-ring row format, the 10-ring regression guard (both omitted and explicit `rings: 10`), and head-row assertions for both rings modes via `doc.lastAutoTable.head[0].raw`

## Decisions Made
- Confirmed (rather than modified) `Results.svelte`'s call site per the plan's explicit instruction: `roundsConfig` is already the full `$derived($roundsQuery)` object, so widening the `Pick<>` type in `pdfExport.ts` alone was sufficient — no behavioral or structural change to the view.
- Discovered via a throwaway debug test (removed before commit) that jspdf-autotable's runtime-attached `doc.lastAutoTable` object exposes the header row array at `.head[0].raw`, not `.settings.head` as initially assumed from the plan's suggested assertion pattern — adjusted test assertions accordingly to match the library's actual attached shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected head-row assertion path in tests**
- **Found during:** Task 1 (writing the head-row regression/5-ring tests)
- **Issue:** The plan's suggested assertion pattern (`doc.lastAutoTable.settings.head[0]`) does not exist on jspdf-autotable's runtime-attached `lastAutoTable` object — `.settings` has no `head` field there. Asserting against it threw `TypeError: Cannot read properties of undefined`.
- **Fix:** Wrote a throwaway debug test to inspect the actual `lastAutoTable` shape at runtime, found the raw header row lives at `.head[0].raw`, and updated the three affected tests (`getAutoTableHeadRow` helper) to read from that path instead.
- **Files modified:** `src/lib/utils/pdfExport.test.ts`
- **Commit:** `ae6ab57`

## Issues Encountered
None beyond the test-assertion-path deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 9's PDF-output half is complete. Plan 09-03 (score entry UI, running in parallel on ScorePicker.svelte/ScoreEntry.svelte) is unaffected by this plan's file set. Full project test suite (214 tests across 24 files) passes; `npx tsc --noEmit` is clean.

---
*Phase: 09-rings-aware-score-entry-pdf-output*
*Completed: 2026-07-12*

## Self-Check: PASSED
