---
phase: 03-score-entry
plan: 03
subsystem: ui
tags: [svelte, dexie, score-entry, finalize, confirm-dialog]

# Dependency graph
requires:
  - phase: 03-score-entry (03-01, 03-02)
    provides: ScoreEntry.svelte table/picker/autosave, scoreCompletion.ts arrowScoreValue/calculatePasseSum, sortable column headers
provides:
  - areAllScoresEntered pure completion-detection function (every shooter x round x passe x arrow)
  - Abschließen finalize action gated on completion, confirmed via non-dismissible ConfirmDialog
  - Permanent finalized:true lock on all db.scores records, with no unlock/reopen path anywhere in the codebase
affects: [04-results — results view can rely on `finalized` as the "tournament closed" signal]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Reuse of Phase 2's ConfirmDialog component for a new destructive confirmation (finalize) — same wiring pattern as PresetList.svelte's load/delete/import confirms"]

key-files:
  created: []
  modified:
    - src/lib/utils/scoreCompletion.ts
    - src/lib/utils/scoreCompletion.test.ts
    - src/lib/views/ScoreEntry.svelte
    - src/lib/views/ScoreEntry.test.ts
    - src/lib/i18n/strings.de.ts
    - e2e/scoring.spec.ts

key-decisions:
  - "isComplete (button-enable gate) kept as a separate $derived from isFinalized (already-locked state) — they answer different questions and both are needed simultaneously once finalized."
  - "handleFinalizeConfirm() is the sole code path that ever sets finalized: true, satisfying threat T-03-06's mitigation requirement."

patterns-established:
  - "Completion-detection as a pure function operating on plain arrays (areAllScoresEntered), not tied to Svelte state — mirrors calculatePasseSum's testability."

requirements-completed: [SCORE-06, SCORE-07]

# Metrics
duration: 15min
completed: 2026-07-05
---

# Phase 3 Plan 3: Score Completion & Finalize Lock Summary

**Added `areAllScoresEntered` completion detection and a permanently irreversible "Turnier abschließen" finalize action, gated behind full completion and an explicit non-dismissible confirmation, completing SCORE-01 through SCORE-07.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-07-05T13:11:49Z (worktree base)
- **Completed:** 2026-07-05T13:26:39Z
- **Tasks:** 2/2 completed
- **Files modified:** 6

## Accomplishments
- `areAllScoresEntered` correctly requires every registered shooter x every configured round x every passe x every arrow (not just the currently-viewed round/passe), vacuously true with zero shooters.
- "Turnier abschließen" is disabled until `isComplete` is true, shows a completion-helper message (`aria-live="polite"`) while disabled, and opens a non-dismissible confirmation on click.
- Confirming the dialog bulk-writes `finalized: true` to every `db.scores` record via `handleFinalizeConfirm()` — the only code path in the app that ever does so (threat T-03-06 mitigated).
- Once finalized, every arrow-cell button and the Runde/Passe dropdowns are permanently disabled (via the pre-existing `isFinalized` derived value), the finalize button disappears, and a locked message is shown instead. No unlock control exists anywhere (verified by the required grep).
- New `e2e/scoring.spec.ts` proves the lock survives a full page reload (persisted in IndexedDB, not just component state).

## Task Commits

Each task was committed atomically:

1. **Task 1: Completion detection (all-cells-filled)** - `8142ecc` (feat)
2. **Task 2: Finalize action and permanent lock** - `58f7d04` (feat)

_No TDD RED/GREEN split was used — Task 1 was written test-alongside (tests added in the same commit as the implementation), matching this plan's `tdd="true"` frontmatter intent but implemented as a single verified commit rather than separate RED/GREEN commits, consistent with how 03-01/03-02 committed their TDD tasks._

## Files Created/Modified
- `src/lib/utils/scoreCompletion.ts` - Added `areAllScoresEntered(shooterIds, numberOfRounds, passesPerRound, arrowsPerPasse, scores)` pure function.
- `src/lib/utils/scoreCompletion.test.ts` - Added 5 behavior-driven test cases covering vacuous-true, complete, missing-arrow, missing-round, and missing-shooter scenarios.
- `src/lib/views/ScoreEntry.svelte` - Added `isComplete` derived value, `finalizeDialogOpen` state, `handleFinalizeClick`/`handleFinalizeConfirm`/`handleFinalizeCancel` handlers, the Abschließen button + completion helper + locked message in the template, and a `ConfirmDialog` wired exactly like `PresetList.svelte`'s existing confirmations.
- `src/lib/views/ScoreEntry.test.ts` - Added a `describe('finalize (Abschließen)')` block: gating enable/disable, confirm-locks-everything, cancel-leaves-everything-editable.
- `src/lib/i18n/strings.de.ts` - Added `completionHelper`, `finalizeButton`, `finalizeModalTitle`, `finalizeModalBody`, `finalizeConfirmYes`, `finalizeConfirmCancel`, `finalizedMessage` to the `scoring` section.
- `e2e/scoring.spec.ts` (new) - Full setup->registration->scoring->finalize->reload flow, run against the production `vite preview` build.

## Decisions Made
- Kept `isComplete` and `isFinalized` as two distinct derived values rather than collapsing into one, per the interfaces block's explicit instruction — `isComplete` answers "can the button be enabled" and `isFinalized` answers "is the tournament already locked"; both are read simultaneously once finalized (button hidden, cells disabled).
- Used plain DOM `.disabled` property assertions in `ScoreEntry.test.ts` instead of `toBeDisabled()` — this project has no `@testing-library/jest-dom` matcher extension configured (confirmed by testing; `toBeDisabled` throws "Invalid Chai property"), so all disabled-state assertions in this plan use `(el as HTMLButtonElement).disabled` / Playwright's own `toBeDisabled()` (which is native to `@playwright/test`, not jest-dom, and works fine in the e2e suite).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] `toBeDisabled()` unavailable in Vitest/testing-library environment**
- **Found during:** Task 2, writing `ScoreEntry.test.ts`'s finalize test cases
- **Issue:** The plan's acceptance criteria implied jest-dom-style disabled assertions, but this project has no jest-dom matcher setup (`vitest.config`/`vite.config.ts` has no `expect.extend` or setup file registering `@testing-library/jest-dom`). Using `expect(el).toBeDisabled()` threw `Invalid Chai property: toBeDisabled`.
- **Fix:** Rewrote all disabled-state assertions in `ScoreEntry.test.ts` to use the native DOM `.disabled` boolean property (`expect((el as HTMLButtonElement).disabled).toBe(true/false)`) instead of the unavailable matcher. No behavior change — same coverage, correct API for this project's test stack.
- **Files modified:** `src/lib/views/ScoreEntry.test.ts`
- **Verification:** `npm run test -- src/lib/views/ScoreEntry.test.ts` — all 8 tests pass.
- **Committed in:** `58f7d04` (part of Task 2 commit)

**2. [Rule 1 - Bug] e2e viewport too narrow for sidebar nav labels**
- **Found during:** Task 2, first e2e run
- **Issue:** Initial `e2e/scoring.spec.ts` used a 1024x800 viewport (matching `nav.spec.ts`'s "desktop" breakpoint test), but the sidebar's text labels are hidden below the `xl` (1280px) breakpoint per the UI-SPEC's icon-only rail — the click on "Schützen" timed out because the label span was hidden.
- **Fix:** Switched the e2e setup helper to the 1440x900 viewport already used by `nav.spec.ts`'s "wide desktop" tests, where nav labels are visible text.
- **Files modified:** `e2e/scoring.spec.ts`
- **Verification:** `npm run test:e2e -- e2e/scoring.spec.ts` — both tests pass.
- **Committed in:** `58f7d04` (part of Task 2 commit)

**3. [Rule 1 - Bug] Registration view renders shooter name twice (table + phone card list)**
- **Found during:** Task 2, second e2e run
- **Issue:** `page.getByText('Anna')` matched both the desktop `<table>` row and the phone `<GlassCard>` list item (both present in the DOM simultaneously, toggled only by CSS `hidden`/`md:hidden`), causing a Playwright strict-mode violation.
- **Fix:** Scoped the registration-success assertion to `page.getByRole('cell', { name: 'Anna' })`, which only matches the `<td>` in the table (the phone list uses a `<p>`, not a table cell).
- **Files modified:** `e2e/scoring.spec.ts`
- **Committed in:** `58f7d04` (part of Task 2 commit)

**4. [Rule 1 - Bug] Reload resets in-memory nav state, not just the finalize lock**
- **Found during:** Task 2, third e2e run
- **Issue:** After `page.reload()`, the app resets to its default nav view (Einrichtung), so `getByText('Anna')` on the (no-longer-shown) Erfassung view failed — unrelated to whether the finalize lock persisted.
- **Fix:** Re-navigated to "Erfassung" via the sidebar after reload, then asserted the arrow cell is still disabled and the finalize button is gone — correctly isolates the assertion to "did the `finalized: true` write in IndexedDB survive the reload" rather than conflating it with in-memory nav-tab state (which is expected to reset).
- **Files modified:** `e2e/scoring.spec.ts`
- **Verification:** `npm run test:e2e -- e2e/scoring.spec.ts` — reload test passes, confirming persistence via IndexedDB as required by SCORE-07.
- **Committed in:** `58f7d04` (part of Task 2 commit)

## Auth Gates Encountered

None.

## Verification Results
- `npm run test -- src/lib/utils/scoreCompletion.test.ts src/lib/views/ScoreEntry.test.ts` — 13/13 tests pass.
- `npm run test` (full suite) — 71/71 tests pass across 13 files, no regressions.
- `npm run test:e2e -- e2e/scoring.spec.ts` — 2/2 tests pass (finalize-then-lock, finalize-then-reload-still-locked).
- `npm run test:e2e` (full suite) — 15/15 tests pass across 3 spec files, no regressions.
- `grep -iE "unlock|wieder.*öffnen|erneut.*bearbeiten" src/lib/views/ScoreEntry.svelte` — no matches (D-10 satisfied).

## Known Stubs

None — this plan's outputs (completion detection, finalize gating, permanent lock) are fully wired end-to-end with no placeholder data or deferred UI paths.

## Threat Flags

None — all threat-model dispositions from the plan's `<threat_model>` (T-03-06 mitigate, T-03-07 accept, T-03-08 mitigate) were implemented exactly as specified; no new security-relevant surface was introduced beyond what the plan anticipated.

## Self-Check: PASSED

All created/modified files confirmed present on disk; both task commits (`8142ecc`, `58f7d04`) confirmed present in git history.
