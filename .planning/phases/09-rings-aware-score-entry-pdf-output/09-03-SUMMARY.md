---
phase: 09-rings-aware-score-entry-pdf-output
plan: 03
subsystem: scoring-ui
tags: [svelte5-runes, testing-library, i18n, ux]

# Dependency graph
requires:
  - phase: 09-rings-aware-score-entry-pdf-output
    plan: 01
    provides: "scoreColorCategory(value, rings), arrowScoreValue/calculatePasseSum(values, rings) pure-logic contracts"
provides:
  - "Rings-aware ScorePicker.svelte: 5-ring mode renders exactly 1-5/X/M buttons, darkblue color category for 4-1, keyboard no-ops for 6-9/0, rings-correct X aria-label"
  - "ScoreEntry.svelte threads roundsConfig.rings into both ScorePicker and its own row-sum calculatePasseSum call"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: ["module-level SCORE_VALUES/KEY_TO_SCORE constants converted to $derived.by() keyed on a rings prop, since Svelte 5 module-level const doesn't react to prop changes"]

key-files:
  created:
    - src/lib/components/ScorePicker.test.ts
  modified:
    - src/lib/components/ScorePicker.svelte
    - src/lib/i18n/strings.de.ts
    - src/lib/views/ScoreEntry.svelte
    - src/lib/views/ScoreEntry.test.ts

key-decisions:
  - "darkblue button class uses border-blue-900/bg-blue-800 (vs existing blue branch's border-blue-400/bg-blue-500) for a shade genuinely distinct at a glance, per locked decision 7's judgment call"
  - "pickerAriaX converted from a static string to a (points: number) => string function so the X aria-label reports 5 or 10 points correctly per rings mode; only call site (ScorePicker.svelte) and its test usages were updated"

requirements-completed: [TARGET-05, TARGET-06, TARGET-08, TARGET-09]

# Metrics
duration: 25min
completed: 2026-07-12
---

# Phase 9 Plan 3: Rings-Aware ScorePicker/ScoreEntry UI Wiring Summary

**Threaded the rings prop from ScoreEntry.svelte's roundsConfig into ScorePicker.svelte's value set, colors, keyboard map, and X aria-label, plus into ScoreEntry's own row-sum calculation — completing the UI half of TARGET-05/06/08/09 on top of Plan 09-01's pure-logic contracts.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 4 modified, 1 created

## Accomplishments
- `ScorePicker.svelte` gained a `rings: 10 | 5 = 10` prop; `SCORE_VALUES` and `KEY_TO_SCORE` converted from module-level `const` to `$derived.by()` so they react to the prop per Svelte 5 runes rules
- 5-ring mode renders exactly 1,2,3,4,5,X,M buttons (no 6-10); X/5 render white, 4-1 render a new distinct dark-blue shade (`border-blue-900 bg-blue-800`) via a new `darkblue` branch in `buttonClass`
- Keyboard map in 5-ring mode omits `6`-`9`/`0` entirely (true no-ops), while 10-ring keyboard behavior (including `0` -> `'10'`) is unchanged
- `strings.scoring.pickerAriaX` converted from a static string to `(points: number) => string`; the X button's aria-label now correctly reports "5 Punkte" or "10 Punkte" per rings mode
- `ScoreEntry.svelte` passes `rings={roundsConfig.rings ?? 10}` to `<ScorePicker>` (mirrors the existing `arrowsPerPasse` prop-threading pattern) and to its own `calculatePasseSum` row-sum call, so displayed row sums for a 5-ring passe with an X now show 5 points, not 10
- New `ScorePicker.test.ts` (6 tests) closes the Wave 0 test gap flagged in research: covers value set, color classes, keyboard no-ops/behavior, and aria-label under both rings modes

## Task Commits

Each task was committed atomically:

1. **Task 1: Rings-aware ScorePicker value set, colors, keyboard map, and X aria-label** - `be4d27b` (feat)
2. **Task 2: Wire rings from ScoreEntry.svelte's roundsConfig into ScorePicker and calculatePasseSum** - `b36da37` (feat)

## Files Created/Modified
- `src/lib/components/ScorePicker.svelte` - `rings` prop added; `SCORE_VALUES`/`KEY_TO_SCORE` converted to `$derived.by()`; `buttonClass` calls `scoreColorCategory(value, rings)` with new `darkblue` branch; `ariaLabelFor`'s X branch calls the now-function `pickerAriaX(rings === 5 ? 5 : 10)`
- `src/lib/components/ScorePicker.test.ts` - new file: 6 component tests covering both rings modes (button count/set, color classes, keyboard behavior, aria-label)
- `src/lib/i18n/strings.de.ts` - `pickerAriaX` converted from static string to `(points: number) => string`
- `src/lib/views/ScoreEntry.svelte` - `<ScorePicker>` gains `rings={roundsConfig.rings ?? 10}`; row-sum `$derived` block's `calculatePasseSum` call gains the same second argument
- `src/lib/views/ScoreEntry.test.ts` - updated `pickerAriaX` usage to call the new function signature (`pickerAriaX(10)`)

## Decisions Made
- Kept the `darkblue` Tailwind shade a deliberate judgment call (locked decision 7) — chose `border-blue-900 bg-blue-800` specifically distinct from the existing 10-ring blue branch's `border-blue-400 bg-blue-500`/`bg-blue-600`, verified visually distinct via a dedicated color-class test assertion (`not.toContain('bg-blue-500')`).
- Did not touch `ScoreTable.svelte` per locked decision 6 — only the picker dialog and the row-sum value it already displays change this phase.
- Test file follows the existing project pattern of `not.toBeNull()`/`toBeNull()` assertions rather than `@testing-library/jest-dom` matchers (no jest-dom setup present in this repo's vitest config), matching conventions observed in `ScoreEntry.test.ts`/`Results.test.ts`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

TARGET-05/06/08/09 are now fully implemented end-to-end: pure logic (09-01), PDF export (09-02, landed on master ahead of this plan), and score-entry UI (this plan). Full test suite (214 tests) and `tsc --noEmit` are clean. No blockers for closing out Phase 9.

---
*Phase: 09-rings-aware-score-entry-pdf-output*
*Completed: 2026-07-12*

## Self-Check: PASSED
