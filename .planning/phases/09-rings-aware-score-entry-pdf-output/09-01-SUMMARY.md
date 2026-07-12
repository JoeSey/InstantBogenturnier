---
phase: 09-rings-aware-score-entry-pdf-output
plan: 01
subsystem: scoring
tags: [vitest, pure-functions, ranking, dfbv]

# Dependency graph
requires:
  - phase: 08-rings-configuration
    provides: "RoundConfig.rings?: 10 | 5 schema field, already default-agnostic at the config layer"
provides:
  - "Rings-aware arrowScoreValue(value, rings=10) and calculatePasseSum(values, rings=10) — X resolves to 5 points under a 5-ring config"
  - "Rings-aware scoreColorCategory(value, rings=10) with a new 'darkblue' category for the 5-ring (DFBV) target face"
  - "Rings threaded through computeShooterSum/computeShooterRoundSums/computeClassRankings"
  - "RankedRow and computeShooterHitCounts widened with count5/count4to1/countM for the 5-ring PDF column"
affects: [09-02-pdf-export, 09-03-score-entry-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: ["rings: 10 | 5 = 10 optional-parameter default threaded through every pure scoring function so unmigrated call sites keep today's 10-ring behavior until the UI/PDF plans thread the real value"]

key-files:
  created: []
  modified:
    - src/lib/utils/scoreCompletion.ts
    - src/lib/utils/scoreCompletion.test.ts
    - src/lib/utils/scoreColor.ts
    - src/lib/utils/scoreColor.test.ts
    - src/lib/utils/ranking.ts
    - src/lib/utils/ranking.test.ts

key-decisions:
  - "arrowScoreValue/calculatePasseSum/scoreColorCategory/computeShooterSum/computeShooterRoundSums all default rings=10 so no existing call site (untouched by this plan) changes behavior — Plans 09-02/09-03 thread the real value at the UI/PDF boundary"
  - "computeShooterHitCounts always computes both the 10-ring (countX/count10/count9) and 5-ring (count5/count4to1/countM) count sets regardless of mode — the consuming PDF layer decides which subset to render, keeping this function mode-agnostic"

requirements-completed: [TARGET-09]

# Metrics
duration: 12min
completed: 2026-07-12
---

# Phase 9 Plan 1: Rings-Aware Pure Scoring/Ranking Logic Summary

**Fixed the TARGET-09 scoring bug at its source: arrowScoreValue now resolves X to 5 points under a 5-ring (DFBV) config instead of always defaulting to 10, threaded through scoreColorCategory and ranking.ts.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-12T13:30:00Z
- **Completed:** 2026-07-12T13:42:24Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `arrowScoreValue('X', 5)` now returns 5 (was silently always 10) — the core TARGET-09 correctness bug fixed at its source
- `scoreColorCategory` gained a rings-aware 5-ring branch (white for X/5, new `darkblue` category for 4-1) while every 10-ring classification stays byte-identical
- `ranking.ts`'s sum functions and `computeClassRankings` thread `roundsConfig.rings ?? 10` through to `arrowScoreValue`, so class rankings computed against a 5-ring tournament now sum correctly
- `RankedRow`/`computeShooterHitCounts` widened additively with `count5`/`count4to1`/`countM`, ready for Plan 09-02's 5-ring PDF column without touching the existing 10-ring fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Rings-aware arrowScoreValue and scoreColorCategory** - `1006eed` (feat)
2. **Task 2: Thread rings through ranking.ts sums and widen hit-count shape** - `a6cd3a7` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `src/lib/utils/scoreCompletion.ts` - `arrowScoreValue`/`calculatePasseSum` gain `rings: 10 | 5 = 10` parameter
- `src/lib/utils/scoreCompletion.test.ts` - new rings=5/rings=10 test cases
- `src/lib/utils/scoreColor.ts` - `ScoreColorCategory` gains `'darkblue'`; `scoreColorCategory` gains rings-aware branch
- `src/lib/utils/scoreColor.test.ts` - new rings=5 (DFBV) test suite plus explicit rings=10 regression coverage
- `src/lib/utils/ranking.ts` - `computeShooterSum`/`computeShooterRoundSums` gain `rings` param; `computeClassRankings` reads `roundsConfig.rings ?? 10`; `RankedRow`/`computeShooterHitCounts` gain `count5`/`count4to1`/`countM`
- `src/lib/utils/ranking.test.ts` - new rings=5 unit tests plus a `computeClassRankings` 5-ring integration test and a 10-ring regression guard

## Decisions Made
- Every rings-aware function defaults `rings = 10` (per the plan's threat model T-09-01) so any call site this plan doesn't touch (all UI/PDF call sites — deferred to 09-02/09-03) keeps compiling and behaving exactly as it does today, degrading safely rather than crashing or silently corrupting data in a new way.
- `computeShooterHitCounts` computes all six count fields unconditionally (no `rings` parameter) rather than accepting a mode flag — kept mode-agnostic per the plan's explicit instruction, with the PDF layer deciding which subset to display.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plans 09-02 (PDF export) and 09-03 (score entry UI) can now consume:
- `arrowScoreValue`/`calculatePasseSum` with a real `rings` argument for on-the-fly sum display
- `scoreColorCategory` with a real `rings` argument to render the correct tap-button color scheme
- `RankedRow.count5`/`count4to1`/`countM` for the 5-ring PDF column, alongside the untouched `countX`/`count10`/`count9` for the 10-ring column

No blockers. All 202 project tests pass; `tsc --noEmit` is clean.

---
*Phase: 09-rings-aware-score-entry-pdf-output*
*Completed: 2026-07-12*

## Self-Check: PASSED
