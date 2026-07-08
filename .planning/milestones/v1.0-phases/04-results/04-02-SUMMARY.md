---
phase: 04-results
plan: 02
subsystem: ui
tags: [svelte, dexie, indexeddb, confirm-dialog, transaction]

# Dependency graph
requires:
  - phase: 04-results (Plan 01)
    provides: Results.svelte view with liveQuery-driven rankings, results i18n strings section (including reset* keys)
provides:
  - "Neues Turnier starten" destructive reset button on the Results view
  - Atomic Dexie transaction clearing only shooters+scores, leaving classes/shootingLines/rounds/presets untouched
  - Non-dismissible ConfirmDialog confirmation gate before the destructive clear
affects: [04-03 (destructive-edit guard, shares this file's reset semantics)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reused ConfirmDialog (destructive=true, non-dismissible) for a second irreversible-action confirm, mirroring ScoreEntry.svelte's finalize flow"
    - "db.transaction('rw', tableA, tableB, async () => {...}) to guarantee atomic multi-table clears"

key-files:
  created: []
  modified:
    - src/lib/views/Results.svelte
    - src/lib/views/Results.test.ts
    - e2e/results.spec.ts

key-decisions:
  - "Reset button placed at the bottom of the Results view (below both phone/grid branches), always rendered regardless of empty/non-empty results state, since a trainer may want to reset even from the empty state"
  - "resetSuccessMessage is cleared when the reset button is clicked again (openResetDialog), so re-opening the dialog after a prior success starts with a clean success row"

patterns-established:
  - "Destructive Dexie clear operations must be wrapped in db.transaction('rw', ...) listing only the tables being written, per Dexie's API — this is now the established pattern for any future multi-table clear/reset action"

requirements-completed: [RES-05]

# Metrics
duration: 7min
completed: 2026-07-05
---

# Phase 4 Plan 2: Tournament Reset Summary

**Destructive "Neues Turnier starten" reset button on Results.svelte, atomically clearing only shooters+scores via a single Dexie transaction, gated behind a reused non-dismissible ConfirmDialog.**

## Performance

- **Duration:** ~7 min (03b1820 to 12a7db8)
- **Started:** 2026-07-05T19:52:59Z (base commit 0057f59)
- **Completed:** 2026-07-05T19:58:59Z
- **Tasks:** 2 completed
- **Files modified:** 3

## Accomplishments
- Trainer can start a new same-shaped tournament directly from the Results view via a clearly destructive-styled button (RotateCcw icon, red styling matching ClassForm's delete-confirm token)
- Reset requires explicit confirmation via the reused, non-dismissible ConfirmDialog (no backdrop-click/Escape bypass)
- The clear is atomic: `db.transaction('rw', db.shooters, db.scores, ...)` ensures shooters and scores are cleared together or not at all, never leaving scores orphaned mid-operation
- Classes, shooting lines, rounds, and presets are provably untouched (unit-tested directly against Dexie counts, e2e-tested via the Einrichtung view after a reload)
- A thrown error during the transaction surfaces via the existing `errorFeedback` red-text row instead of failing silently

## Task Commits

Each task was committed atomically:

1. **Task 1: Reset button, ConfirmDialog wiring, atomic transaction handler** - `03b1820` (feat)
2. **Task 2: Reset flow test coverage (unit + e2e)** - `12a7db8` (test)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/views/Results.svelte` - Added reset button, resetDialogOpen/resetSuccessMessage state, handleResetConfirm/handleResetCancel, ConfirmDialog wiring
- `src/lib/views/Results.test.ts` - Added `describe('reset (RES-05, D-10)', ...)` covering cancel (no-op) and confirm (atomic clear + success message) paths
- `e2e/results.spec.ts` - Added `reset flow (RES-05)` test: full tournament -> reset -> empty state -> reload -> Einrichtung retains classes/lines/rounds

## Decisions Made
- None beyond what's captured in `key-decisions` above — plan's exact code shapes (handler body, button classes, ConfirmDialog props) were followed as specified in the plan's `<action>` blocks.

## Deviations from Plan

None - plan executed exactly as written. Both acceptance-criteria greps (`db.transaction('rw', db.shooters, db.scores`, and the zero-count check for `db.classes.clear|db.shootingLines.clear|db.rounds.clear|db.presets.clear`) pass exactly as specified.

## Issues Encountered

None. The e2e test initially used `page.getByRole('cell', ...)` to assert class retention in Einrichtung, but Setup's class list is rendered as a `<ul><li>` list, not a table — corrected to `page.locator('ul li').first()` before running (caught during test-writing, not a plan deviation since this is implementation detail within Task 2's own test-writing step, not a change to plan behavior).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `npm run test` (114/114 unit tests) and `npx playwright test` (21/21 e2e tests) both pass with no regressions to Plan 01's breakpoint/ranking tests or any other phase's tests
- Plan 04-03 (destructive-edit guard, RES-06) can build on this same reset pattern/file without further changes needed here

---
*Phase: 04-results*
*Completed: 2026-07-05*

## Self-Check: PASSED

- FOUND: src/lib/views/Results.svelte
- FOUND: src/lib/views/Results.test.ts
- FOUND: e2e/results.spec.ts
- FOUND commit: 03b1820
- FOUND commit: 12a7db8
