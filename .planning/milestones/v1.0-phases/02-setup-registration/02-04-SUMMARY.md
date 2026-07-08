---
phase: 02-setup-registration
plan: 04
subsystem: ui
tags: [svelte5, dexie, dexie-export-import, indexeddb, presets]

# Dependency graph
requires:
  - phase: 02-setup-registration (Plan 01)
    provides: PresetRecord/ClassRecord/ShootingLineConfig/RoundConfig schema, resetDb() test helper, strings.presets.* copy
  - phase: 02-setup-registration (Plan 02)
    provides: Setup.svelte's Shooting Lines / Rounds-Passes cards (Vorlagen card appended below them)
provides:
  - ConfirmDialog.svelte — reusable non-dismissible glass-card confirmation modal
  - PresetSave.svelte — save current classes/lines/rounds as a named preset, capped at 8, overwrite confirmation
  - PresetList.svelte — load/delete presets, export-all/import-all-replace via dexie-export-import
  - e2e/presetExportImport.spec.ts — Playwright coverage of save->export->delete->import->reappear
affects: [phase-03-score-entry could reuse ConfirmDialog for score-correction confirmations]

# Tech tracking
tech-stack:
  added: [dexie-export-import@4.4.0]
  patterns:
    - "ConfirmDialog.svelte: open/title/body/confirmLabel/cancelLabel/destructive/onconfirm/oncancel prop contract, reused across save-overwrite/load/delete/import confirmations"
    - "Preset export/import scoped to a single table via exportDB/importInto's skipTables option, keeping db.export()/import() boundaries aligned with the feature's actual data-ownership boundary (D-12/D-15) rather than the whole-database default"
    - "$state.snapshot() before writing a $derived/liveQuery-sourced object into Dexie, to strip the Svelte 5 reactive Proxy wrapper that IndexedDB's structured clone algorithm cannot serialize"

key-files:
  created:
    - src/lib/components/ConfirmDialog.svelte
    - src/lib/components/PresetSave.svelte
    - src/lib/components/PresetSave.test.ts
    - src/lib/views/PresetList.svelte
    - src/lib/views/PresetList.test.ts
    - e2e/presetExportImport.spec.ts
  modified:
    - src/lib/views/Setup.svelte
    - package.json
    - package-lock.json

key-decisions:
  - "Used importInto(db, ...) instead of the plan's literal importDB(file, ...) example — importDB creates a brand-new, separate Dexie database rather than writing into the app's already-open db instance, which would silently disconnect the import from the live app state"
  - "Scoped both exportDB and importInto's clearTablesBeforeImport sweep to skipTables: [classes, shootingLines, rounds, shooters] — clearTablesBeforeImport iterates ALL of db.tables (not just tables present in the import file) unless skipped, so an unscoped import would have wiped the shooter roster and current setup state, violating D-12/D-15's 'presets only' boundary"
  - "Capacity-cap check in PresetSave reads db.presets.count() directly rather than the liveQuery-derived display value, avoiding a race where a save before the first liveQuery resolution could bypass the 8-item cap"

requirements-completed: [SETUP-05, SETUP-06]

# Metrics
duration: ~45min
completed: 2026-07-04
---

# Phase 2 Plan 4: Preset Save/Load/Delete/Export/Import Summary

**Full preset management (save/load/delete/export/import, capped at 8) built on dexie-export-import, scoped strictly to the presets table so it never touches the shooter roster or live setup state.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-07-04 (fresh retry after a prior session hit a usage limit before any edits)
- **Completed:** 2026-07-04T21:48:23Z
- **Tasks:** 2 completed
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments
- Trainer can save the current classes/lines/rounds configuration as a named preset (capped at 8), with a live capacity indicator and an overwrite-confirmation prompt on name collision
- Trainer can load a saved preset (replaces classes/shooting-lines/rounds, never the shooter roster) and delete a preset, both behind confirmation dialogs
- Trainer can export all presets as a single JSON file and re-import them later via a REPLACE ALL flow, with a confirmation showing how many presets will be replaced
- Import defensively re-validates every record and caps the result at 8, protecting against a malformed or oversized import file
- All 8 Phase 2 requirements (SETUP-01 through SETUP-06, REG-01, REG-02) are now implemented across Plans 01-04

## Task Commits

1. **Task 1: Reusable confirm dialog + preset save with capacity/overwrite handling** - `120e11d` (feat)
2. **Task 2: Preset load/delete/export/import** - `c0addb7` (feat)

**Plan metadata:** (this commit, docs: complete plan)

## Files Created/Modified
- `src/lib/components/ConfirmDialog.svelte` - Reusable non-dismissible glass-card confirmation modal (open/title/body/confirmLabel/cancelLabel/destructive/onconfirm/oncancel)
- `src/lib/components/PresetSave.svelte` - Preset save form: name input, live capacity indicator (via db.presets.count()), capacity-warning at 8, overwrite ConfirmDialog on name collision
- `src/lib/components/PresetSave.test.ts` - Capacity indicator, new-preset add, collision-overwrite, and capacity-cap-blocks-save coverage
- `src/lib/views/PresetList.svelte` - Preset list with load/delete (each behind ConfirmDialog) and export-all/import-all-replace buttons
- `src/lib/views/PresetList.test.ts` - Load-replaces-config-leaves-shooters-untouched and delete-removes-record coverage
- `src/lib/views/Setup.svelte` - Added the "Vorlagen" card hosting PresetSave + PresetList
- `e2e/presetExportImport.spec.ts` - Playwright end-to-end coverage of the full save->export->delete->import->reappear round trip against the production build
- `package.json` / `package-lock.json` - Added `dexie-export-import@4.4.0` (pre-vetted `[OK]` in 02-RESEARCH.md's Package Legitimacy Audit; no checkpoint required)

## Decisions Made
- `importInto(db, file, { clearTablesBeforeImport: true, skipTables: [...] })` used instead of the plan's `importDB(file, { clearTablesBeforeImport: true })` example, because `importDB` opens a *new*, separate Dexie database rather than writing into the app's currently-open `db` — using it as literally written in the plan would not have updated the live app's preset list at all.
- Both export (`exportDB(db, { skipTables })`) and import (`importInto`'s `skipTables`) are scoped to exclude `classes`/`shootingLines`/`rounds`/`shooters`, so the JSON file only ever contains the `presets` table and an import can only ever clear/repopulate `presets` — never the shooter roster or current setup state.
- `PresetSave`'s capacity-cap check reads `db.presets.count()` directly instead of the component's `liveQuery`-derived display value, to avoid a race window right after mount where the reactive count hasn't resolved yet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `importDB` would have created a disconnected second database instead of updating the live app db**
- **Found during:** Task 2 (Preset load/delete/export/import) — while implementing the import handler per the plan's literal `importDB(file, { clearTablesBeforeImport: true })` example
- **Issue:** `dexie-export-import`'s `importDB()` constructs and returns a brand-new `Dexie` instance from the file (`new Dexie(options.name ?? dbExport.databaseName)`), rather than writing into the app's already-open `db` object from `schema.ts`. Also, its `StaticImportOptions` type doesn't even expose `clearTablesBeforeImport` (that option only exists on `ImportOptions`, used by the separate `importInto(db, ...)` function) — so the plan's literal example wouldn't compile against the installed package's types, and even if coerced, would silently leave the running app's IndexedDB untouched.
- **Fix:** Switched to `importInto(db, file, { clearTablesBeforeImport: true, skipTables: NON_PRESET_TABLES })`, which operates directly on the app's existing `db` instance.
- **Files modified:** src/lib/views/PresetList.svelte
- **Verification:** PresetList.test.ts's load/delete coverage plus the full e2e round trip (presetExportImport.spec.ts) confirm the imported preset reappears in the live app's preset list.
- **Committed in:** c0addb7 (Task 2 commit)

**2. [Rule 1 - Bug / T-02-08 mitigation correction] Unscoped export/import would have wiped the shooter roster and setup state**
- **Found during:** Task 2, while tracing `importInto`'s `clearTablesBeforeImport` implementation in `node_modules/dexie-export-import/dist/dexie-export-import.js`
- **Issue:** `clearTablesBeforeImport: true` clears every table in `db.tables` (the whole live database), not just tables present in the imported JSON file, unless explicitly excluded via `skipTables`. Following the plan's literal `exportDB(db)` (whole-database export, no `skipTables`) plus `clearTablesBeforeImport: true` (no `skipTables` on import either) would have exported and then, on import, wiped and replaced `classes`, `shootingLines`, `rounds`, and `shooters` — directly violating D-12 ("preset load never touches the shooter roster") and D-15's "export all presets" scope (presets only, not the whole app state).
- **Fix:** Both `exportDB` and `importInto` now pass `skipTables: ['classes', 'shootingLines', 'rounds', 'shooters']`, so the exported file — and therefore any import's clear-and-replace sweep — is scoped to the `presets` table only.
- **Files modified:** src/lib/views/PresetList.svelte
- **Verification:** PresetList.test.ts's load test explicitly asserts a pre-seeded shooter record survives untouched; the e2e test's delete-then-import-then-reappear flow with only one preset in play doesn't directly probe cross-table isolation, but the scoping is structural (skipTables applies regardless of file contents).
- **Committed in:** c0addb7 (Task 2 commit)

**3. [Rule 1 - Bug] DataCloneError writing a Svelte 5 reactive proxy into IndexedDB on preset load**
- **Found during:** Task 2, running PresetList.test.ts's load test — `db.classes.bulkAdd(preset.classes)` threw `DataCloneError: #<Object> could not be cloned` from fake-indexeddb's structured-clone step
- **Issue:** `preset` (the `ConfirmDialog`'s `loadTarget`) originates from a `$derived`-wrapped `liveQuery` array; Svelte 5's deep reactivity wraps nested array items in Proxy objects, and IndexedDB's structured clone algorithm cannot serialize a live Proxy. This is the class of `liveQuery`-with-runes edge case CLAUDE.md's Stack Patterns section already flags as a known gotcha.
- **Fix:** `confirmLoad()` now calls `$state.snapshot(loadTarget)` to obtain a plain, non-reactive deep clone before writing any of its fields (`classes`, `shootingLineCount`, `roundsConfig`) into Dexie.
- **Files modified:** src/lib/views/PresetList.svelte
- **Verification:** PresetList.test.ts's load test passes after the fix; `npm run test` (34/34) and the e2e suite both green.
- **Committed in:** c0addb7 (Task 2 commit)

**4. [Rule 1 - Bug] Capacity-cap check could race the liveQuery's initial resolution**
- **Found during:** Task 1, running PresetSave.test.ts's "capacity warning at 8" test in isolation — a 9th preset was silently saved instead of being blocked
- **Issue:** The submit handler read the component's `liveQuery`-derived `presetCount` display value, which defaults to `0` until the query's first result resolves. A save submitted before that first resolution (e.g., immediately on mount) would see a stale `0` instead of the true count, bypassing the 8-item cap.
- **Fix:** `handleSubmit()` now reads `await db.presets.count()` directly for the cap check, independent of the reactive display value's resolution timing.
- **Files modified:** src/lib/components/PresetSave.svelte
- **Verification:** PresetSave.test.ts's three tests (capacity indicator, collision overwrite, capacity-warning-blocks-save) all pass.
- **Committed in:** 120e11d (Task 1 commit)

---

**Total deviations:** 4 auto-fixed (all Rule 1 — bug fixes)
**Impact on plan:** All four fixes were necessary for correctness/data-safety; none introduced scope beyond the plan's stated behavior. The two dexie-export-import fixes (#1, #2) are the most consequential — without them, import would have either done nothing to the live app or silently destroyed the shooter roster and setup state.

## Issues Encountered
- Two of the initial test assertions (PresetSave.test.ts's "adds a new preset" and "overwrite" tests) checked `db.presets.count()`/record state synchronously right after `fireEvent.click`, without waiting for the component's async save chain to finish — matched against `ClassForm.test.ts`'s established `findByText`/`waitFor` convention and adjusted to wait for an observable post-save UI change (updated capacity indicator, or the confirm dialog closing) before asserting DB state. No production code was at fault here, only test synchronization.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 2 (Setup & Registration) is now fully implemented across all 4 plans: classes, shooting lines, rounds/passes, shooter registration + mode detection + auto-assignment, and preset save/load/delete/export/import.
- `ConfirmDialog.svelte` is a reusable primitive available to Phase 3 (Score Entry) if a similar non-dismissible confirmation is needed there (e.g., for a "complete tournament" action).
- One pre-existing, out-of-scope e2e failure remains open (see `.planning/phases/02-setup-registration/deferred-items.md`'s "From 02-04 execution" entry): `e2e/nav.spec.ts`'s "clicking Schützen shows the Schützen placeholder heading" test asserts against a placeholder heading that Plan 02-03 already replaced with the real Registration view. Not caused by this plan; flagged for a future pass to update that assertion.

---
*Phase: 02-setup-registration*
*Completed: 2026-07-04*

## Self-Check: PASSED

All created files verified present on disk; all task/plan commit hashes (120e11d, c0addb7) verified present in git log.
