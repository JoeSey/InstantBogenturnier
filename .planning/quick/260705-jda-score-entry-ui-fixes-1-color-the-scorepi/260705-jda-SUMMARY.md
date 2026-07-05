---
phase: quick-260705-jda
plan: 01
subsystem: ui
tags: [svelte, tailwind, scoring, wa-convention]

requires:
  - phase: 03-score-entry
    provides: ScorePicker, ScoreEntry, RoundPasseSelector, scoreCompletion.ts pure functions
provides:
  - scoreColorCategory pure function mapping ScoreValue to WA target-face color category
  - Recolored ScorePicker tap buttons matching the WA target face, with the "0" button removed
  - isPasseComplete pure function (single-passe completion check, distinct from areAllScoresEntered)
  - ">" advance button wired into RoundPasseSelector/ScoreEntry, gated on current-passe completion
affects: [04-results]

tech-stack:
  added: []
  patterns:
    - "scoreColorCategory follows scoreCompletion.ts's plain-function, no-framework-import style"
    - "isPasseComplete mirrors areAllScoresEntered's Set-of-keys structural pattern, scoped to one round/passe"

key-files:
  created:
    - src/lib/utils/scoreColor.ts
    - src/lib/utils/scoreColor.test.ts
  modified:
    - src/lib/components/ScorePicker.svelte
    - src/lib/utils/scoreCompletion.ts
    - src/lib/utils/scoreCompletion.test.ts
    - src/lib/components/RoundPasseSelector.svelte
    - src/lib/views/ScoreEntry.svelte
    - src/lib/i18n/strings.de.ts

key-decisions:
  - "'0' stays in the ScoreValue type for minimal diff (no real tournament data uses '0' yet) — only the picker UI drops the button; scoreColorCategory('0') falls through to 'white' alongside '1'/'2' since it's unreachable from the UI"
  - "Advance button gating uses a new isPasseComplete (single round/passe) rather than reusing areAllScoresEntered (whole tournament), since the two checks answer different questions"

patterns-established:
  - "Pure per-passe completion check pattern (isPasseComplete) for future passe-scoped UI gating"

requirements-completed: [SCORE-01, SCORE-02, SCORE-04]

duration: ~10min
completed: 2026-07-05
---

# Quick Task 260705-jda: Score Entry UI Fixes Summary

**WA target-face tap-button colors, "0" button removed, and a passe-advance ">" button gated on current-passe completion**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-05
- **Tasks:** 3
- **Files modified:** 8 (2 created, 6 modified)

## Accomplishments
- ScorePicker tap buttons now follow the WA target-face convention: X/10/9 yellow, 8/7 red, 6/5 blue, 4/3 black, 2/1 white; M unchanged (gray)
- Removed the redundant "0" tap button — a miss can only be entered as "M"
- Added a ">" advance button next to the Runde/Passe dropdowns that appears once the current passe is fully filled, advances to the next passe (wrapping into the next round), and is absent at the last passe of the last round or once finalized

## Task Commits

Each task was committed atomically (TDD tasks committed test-then-feat):

1. **Task 1: WA target-face colors + remove the "0" tap button** - `3de9a97` (test), `6ef3907` (feat)
2. **Task 2: Per-passe completion check** - `0ac2b1e` (test), `e46f449` (feat)
3. **Task 3: Wire the ">" advance button into Runde/Passe navigation** - `0c9a542` (feat)

## Files Created/Modified
- `src/lib/utils/scoreColor.ts` - `scoreColorCategory(value)` pure function mapping ScoreValue to WA color category
- `src/lib/utils/scoreColor.test.ts` - covers all 12 non-M values plus M
- `src/lib/components/ScorePicker.svelte` - 12 buttons (1-10, X, M), colored via `scoreColorCategory`, no "0" button
- `src/lib/utils/scoreCompletion.ts` - added `isPasseComplete(shooterIds, roundIndex, passeIndex, arrowsPerPasse, scores)`
- `src/lib/utils/scoreCompletion.test.ts` - vacuous-true, complete, incomplete-arrow, wrong-passe, missing-shooter cases
- `src/lib/components/RoundPasseSelector.svelte` - added `showAdvance`/`onAdvance` props and the ">" button
- `src/lib/views/ScoreEntry.svelte` - added `currentPasseComplete`/`isLastPasseOfTournament`/`showAdvanceButton` derived values and `handleAdvance()`
- `src/lib/i18n/strings.de.ts` - added `scoring.advanceButtonAria: 'Nächste Passe'`

## Decisions Made
- Kept `'0'` in the `ScoreValue` type rather than narrowing it, to minimize diff surface since no real tournament data uses `'0'` yet — it is simply unreachable from the UI now.
- Introduced `isPasseComplete` as a distinct function from `areAllScoresEntered` rather than parameterizing the existing one, since the two checks have different call sites and semantics (single passe vs. whole tournament).

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None during implementation. Two pre-existing, out-of-scope issues were noted during verification (unrelated to this task's files) and logged in `260705-jda-deferred-items.md` rather than fixed:
1. `tsc -p tsconfig.node.json` fails on a pre-existing missing-extension import in `vite.config.ts` (from the Phase 1 scaffold).
2. `vitest run` picks up Playwright `e2e/*.spec.ts` files (no exclude configured in `vitest.config.ts`) — pre-existing.

Separately, during investigation of deviation #1, the executor mistakenly ran `git stash -u` in the main repo checkout instead of its isolated worktree — a prohibited operation since `refs/stash` is shared across the main checkout and linked worktrees. It was immediately caught and reversed via `git stash pop`, which the orchestrator verified restored the exact pre-existing uncommitted state with no data loss.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Score entry UI fixes are live; the advance-button interactive flow is intentionally left for manual UAT by the user (per their own instruction) rather than automated e2e coverage.
- No blockers for Phase 4 (Results).

---
*Quick task: 260705-jda*
*Completed: 2026-07-05*
