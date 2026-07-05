---
phase: 03-score-entry
plan: 02
subsystem: ui
tags: [svelte, svelte5-runes, sorting, accessibility, vitest]

# Dependency graph
requires:
  - phase: 03-score-entry
    provides: "ScoreTable.svelte's exported ScoreRow type and ScoreEntry.svelte's rows $derived.by block (Plan 03-01)"
provides:
  - "sortComparators.ts: compareByLine/Name/Class/Sum + sortRows(rows, column, direction), fully unit-tested"
  - "Clickable Linie/Name/Klasse/Summe column headers in ScoreTable.svelte with ▲/▼ indicator and aria-sort"
  - "Ephemeral (non-persisted) sortBy/sortDir $state in ScoreEntry.svelte replacing the Plan 03-01 inline by-line sort"
affects: [04-results]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure comparator-lookup-object pattern for column sorting (column -> comparator function), reversed via .reverse() for desc — mirrors modeDetection.ts's plain-function testing style"
    - "Column-header-as-button pattern: <th aria-sort=...><button onclick=...>{label}{indicator}</button></th> for accessible sortable table headers"

key-files:
  created:
    - src/lib/utils/sortComparators.ts
    - src/lib/utils/sortComparators.test.ts
  modified:
    - src/lib/components/ScoreTable.svelte
    - src/lib/views/ScoreEntry.svelte
    - src/lib/i18n/strings.de.ts
    - src/lib/views/ScoreEntry.test.ts

key-decisions:
  - "Sort state (sortBy/sortDir) lives as ephemeral Svelte 5 $state in ScoreEntry.svelte, never written to Dexie — matches must_haves truth that reload resets to default (by Linie, ascending)"
  - "Arrow-number (1..N) column headers deliberately excluded from sorting — SCORE-04's sortable set is explicitly Linie/Name/Klasse/Summe only"
  - "Added sr-only screen-reader text (sortAscending/sortDescending strings) alongside the visual ▲/▼ glyph and aria-sort, since the glyph itself has no accessible text alternative"

patterns-established:
  - "sortComparators.ts: pure, framework-agnostic sort module importing types from a .svelte file's <script module> export (ScoreRow), fully unit-tested independent of component rendering"

requirements-completed: [SCORE-04]

# Metrics
duration: ~20min
completed: 2026-07-05
---

# Phase 3 Plan 02: Sortable Score Table Column Headers Summary

**Clickable Linie/Name/Klasse/Summe column-header sorting on the live score table, backed by a fully unit-tested pure sortComparators module and ephemeral (non-persisted) Svelte 5 $state.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-05T13:08:59Z
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments
- `sortComparators.ts` exports `SortColumn`/`SortDirection` types, four pure comparator functions (`compareByLine`, `compareByName`, `compareByClass`, `compareBySum`) with correct null/tie handling, and a `sortRows()` combinator — all covered by 8 unit tests.
- `ScoreTable.svelte`'s Linie/Name/Klasse/Summe `<th>` elements are now clickable `<button>`s showing a `▲`/`▼` indicator plus `aria-sort` and an `sr-only` screen-reader label; the per-arrow-number headers remain plain text with no click handler.
- `ScoreEntry.svelte` now drives sorting via ephemeral `$state<SortColumn>`/`$state<SortDirection>` and a `handleSort()` toggle function, replacing Plan 03-01's temporary inline by-line sort.

## Task Commits

Each task was committed atomically:

1. **Task 1: Sort comparator functions** - `858836e` (feat)
2. **Task 2: Wire clickable column-header sorting into the score table** - `1cd74be` (feat)

**Plan metadata:** committed separately by the orchestrator after wave completion (worktree mode — this executor does not write STATE.md/ROADMAP.md).

## Files Created/Modified
- `src/lib/utils/sortComparators.ts` - SortColumn/SortDirection types, 4 comparators, sortRows()
- `src/lib/utils/sortComparators.test.ts` - unit tests for all 6 plan behaviors (line/name/class/sum comparators + sortRows asc/desc)
- `src/lib/components/ScoreTable.svelte` - clickable sortable headers with ▲/▼ indicator, aria-sort, sr-only label
- `src/lib/views/ScoreEntry.svelte` - ephemeral sortBy/sortDir $state, handleSort(), sortRows() call replacing inline sort
- `src/lib/i18n/strings.de.ts` - added scoring.sortAscending / scoring.sortDescending strings
- `src/lib/views/ScoreEntry.test.ts` - added sort-interaction test (click Name -> ascending, click again -> descending, click Linie -> resets to line/ascending)

## Decisions Made
- Ephemeral sort state confirmed as Svelte 5 `$state` only, never persisted to IndexedDB, per the plan's `must_haves.truths` and 03-CONTEXT.md D-04.
- Added `sr-only` screen-reader text next to the `▲`/`▼` glyph (Rule 2 — the plan defined `sortAscending`/`sortDescending` strings but didn't specify exact usage; the glyph alone has no text alternative for assistive tech, so the strings are used as the accessible label).

## Deviations from Plan

None - plan executed exactly as written. The `sr-only` label addition uses the strings the plan itself specified (`sortAscending`/`sortDescending`) for their evident purpose (screen-reader announcement of sort state), not a scope addition.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `sortComparators.ts` is a pure, independently-tested module; Phase 4 (Results) can reuse the same comparator-lookup pattern (or comparators directly) for results-view sorting if column-sortable results tables are needed there.
- Pre-existing, unrelated `tsc -p tsconfig.node.json` failure on `vite.config.ts` (module resolution for `./src/lib/config/app.config`) remains open — already logged in `.planning/phases/03-score-entry/deferred-items.md` from Plan 03-01; not touched by this plan.
- No blockers for Plan 03-03 or Phase 4.

---
*Phase: 03-score-entry*
*Completed: 2026-07-05*

## Self-Check: PASSED

All created/modified files verified present on disk; all three task/summary commit hashes (858836e, 1cd74be, 7bdf1dd) verified present in git log.
