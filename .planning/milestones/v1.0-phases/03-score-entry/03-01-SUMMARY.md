---
phase: 03-score-entry
plan: 01
subsystem: ui
tags: [svelte5, dexie, indexeddb, livequery, score-entry, autosave]

# Dependency graph
requires:
  - phase: 02-setup-registration
    provides: db.classes/db.shooters/db.rounds/db.shootingLines schema, liveQuery + $derived reactive pattern, ConfirmDialog/AutoAssignModal component conventions
provides:
  - Dexie v3 schema scores table with compound-key upsert semantics ([shooterId+roundIndex+passeIndex+arrowIndex])
  - arrowScoreValue/calculatePasseSum pure functions (M=0, X=10 per WA convention)
  - ScorePicker.svelte (13-button tap picker), RoundPasseSelector.svelte, ScoreTable.svelte (exports canonical ScoreRow type)
  - ScoreEntry.svelte view wired into App.svelte nav, replacing ScoringPlaceholder
affects: [03-02-sorting, 03-03-finalize-lock, 04-results]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compound Dexie primary key ([shooterId+roundIndex+passeIndex+arrowIndex]) gives upsert-by-cell semantics for autosave without manual existence checks"
    - "Non-blocking db.scores.put(...).catch(...) autosave — no await, errors surfaced via errorFeedback (WR-04) without blocking further cell entry"
    - "Full-table liveQuery + in-memory filter (allScores.filter(roundIndex/passeIndex)) instead of scoped Dexie .where() queries for the current-passe view"

key-files:
  created:
    - src/lib/components/ScorePicker.svelte
    - src/lib/components/RoundPasseSelector.svelte
    - src/lib/components/ScoreTable.svelte
    - src/lib/views/ScoreEntry.svelte
    - src/lib/views/ScoreEntry.test.ts
    - src/lib/db/schema.test.ts (v3 describe block, added in prior session)
    - src/lib/utils/scoreCompletion.ts (added in prior session)
    - src/lib/utils/scoreCompletion.test.ts (added in prior session)
  modified:
    - src/lib/db/schema.ts (v3 scores table + ScoreRecord/ScoreValue types, added in prior session)
    - src/lib/db/testHelpers.ts (resetDb extended for db.scores.clear(), added in prior session)
    - src/lib/i18n/strings.de.ts (scoring section)
    - src/App.svelte (ScoreEntry replaces ScoringPlaceholder in scoring nav slot)

key-decisions:
  - "Default row sort is inline ascending-by-line in ScoreEntry.svelte's $derived.by block, deliberately temporary — Plan 03-02 replaces it with the full clickable-column sortRows() feature (SCORE-04)."
  - "ScorePicker reuses GlassCard (glass-treated modal per 03-UI-SPEC.md), while ScoreTable itself stays fully opaque (Phase 1 D-11) — these are two different Phase-1 visual contracts applied correctly to two different surfaces in the same feature."

requirements-completed: [SCORE-01, SCORE-02, SCORE-03, SCORE-05]

# Metrics
duration: ~35min (this session, Task 2 only; Task 1 committed in a prior crashed session)
completed: 2026-07-05
---

# Phase 3 Plan 01: Score Entry Vertical Slice Summary

**Tap-button (0-10/X/M) autosave score table wired into the Erfassung nav tab, backed by a new Dexie v3 `scores` table with compound-key upsert semantics — every tap writes to IndexedDB immediately with no save button.**

## Performance

- **Duration:** ~35 min (this session — Task 2 only; Task 1's data-model work was committed in a prior session that hit a provider quota/session-limit error and was resumed here)
- **Completed:** 2026-07-05T12:56:50Z
- **Tasks:** 2/2 complete
- **Files modified:** 7 (this session) + 5 (prior session, Task 1)

## Accomplishments
- Trainer can open Erfassung, see all registered shooters in a table for the selected Runde/Passe, tap any arrow cell, and pick a score (0-10, X, M) via a 13-button modal picker.
- Every tap immediately autosaves to `db.scores` (compound-key upsert, no separate save action, no "saved" indicator) — verified by test that a page-reload-equivalent liveQuery re-fetch shows the same entered scores.
- Summe column shows only the current passe's sum, correctly treating M as 0 and X as 10, and shows `–` until every arrow in the current passe is filled.
- "Turnier nicht konfiguriert" guard renders instead of a broken/empty table when no `db.rounds` record exists yet.
- `ScoreEntry` replaces `ScoringPlaceholder` in `App.svelte`'s nav.

## Task Commits

Each task was committed atomically:

1. **Task 1: Score data model + passe-sum calculation** — `2760fc8` (test, RED) + `b7253ab` (feat, GREEN) — committed in a prior session, verified already-complete in this session (not redone)
2. **Task 2: Score entry vertical slice — tap-button autosave table wired into nav** — `22317d3` (feat)

_Note: Task 1 was TDD (`tdd="true"`); this session confirmed both the RED and GREEN commits exist in git history and that all 6 of Task 1's tests still pass before starting Task 2._

## Files Created/Modified
- `src/lib/components/ScorePicker.svelte` - 13-button (0-10, X, M) modal picker; teal/amber/gray color coding per D-02; Escape + "Abbrechen" cancel paths; non-dismissible by backdrop click
- `src/lib/components/RoundPasseSelector.svelte` - Native Runde/Passe `<select>` dropdowns, 0-based value / 1-based label, disabled when finalized
- `src/lib/components/ScoreTable.svelte` - Fully opaque score table (no `glass-surface`), exports canonical `ScoreRow` type from `<script module>`
- `src/lib/views/ScoreEntry.svelte` - Orchestrates liveQuery reads (shooters/classes/rounds/scores), builds `ScoreRow[]`, non-blocking autosave, not-configured guard
- `src/lib/views/ScoreEntry.test.ts` - 4 tests: render shooter/class/line, tap-to-autosave round trip, sum-completion with M/X treatment, not-configured guard
- `src/lib/i18n/strings.de.ts` - Added `scoring` section (heading, notConfigured*, column/picker labels, aria strings)
- `src/App.svelte` - `ScoreEntry` replaces `ScoringPlaceholder` in the `scoring` nav slot

## Decisions Made
- Kept the default table sort as a simple inline ascending-by-line comparator inside `ScoreEntry.svelte`'s `$derived.by` block rather than building a full sort abstraction now — Plan 03-02 owns the clickable-column sort feature (SCORE-04) and will replace this block directly.
- Arrow cells carry no `aria-label` per cell (only `aria-disabled` when finalized) since the plan's action text didn't specify one; the `ScorePicker`'s buttons carry the accessible labels for the actual score-selection action instead.

## Deviations from Plan

None — Task 2 executed exactly as written in `03-01-PLAN.md`.

## Issues Encountered
- Two of the four `ScoreEntry.test.ts` assertions initially used `.toBeInTheDocument()`, which isn't available in this project (no `@testing-library/jest-dom` installed/configured in `vitest-setup.ts`). Replaced with `screen.findByText(...)` calls, which already assert presence (and correctly wait out the async `liveQuery` class-name/line-number re-render race that `getByText` synchronously missed). All 4 tests pass after the fix; no plan or production-code changes were needed.
- `npm run check`'s `tsc -p tsconfig.node.json` step fails on a pre-existing `vite.config.ts` module-resolution error unrelated to any file this plan touches (see `.planning/phases/03-score-entry/deferred-items.md`). `npm run test` (54/54 tests, including this plan's) and `svelte-check` both pass cleanly; left this out-of-scope issue for a future phase/quick-task per the scope-boundary rule.

## Next Phase Readiness
- `ScoreRow` (exported from `ScoreTable.svelte`) and the `scores` table's compound-key contract are now stable for Plan 03-02 (clickable-column sorting) and Plan 03-03 (finalize/lock UI) to build directly on top of, per the plan's `<interfaces>` block.
- No blockers. `deferred-items.md` created in the phase directory for the one pre-existing, out-of-scope `tsc` config issue noted above.

---
*Phase: 03-score-entry*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created files verified present on disk (`ScorePicker.svelte`, `RoundPasseSelector.svelte`, `ScoreTable.svelte`, `ScoreEntry.svelte`, `ScoreEntry.test.ts`, this SUMMARY, `deferred-items.md`). All referenced commit hashes (`2760fc8`, `b7253ab`, `22317d3`) confirmed present in `git log --oneline --all`.
