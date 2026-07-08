---
phase: 02-setup-registration
plan: 02
subsystem: database, ui
tags: [dexie, svelte5, runes, testing-library, vitest]

requires:
  - phase: 02-setup-registration
    plan: 01
    provides: Dexie v2 schema (shootingLines/rounds tables), strings.de.ts setup section, GlassCard, resetDb() test helper
provides:
  - WA_PRESETS fixture (wa-18m, wa-25m, wa-70m) with exact D-03 arrow/passe/distance values
  - Working "Schießplätze" card in Setup.svelte (shooting-line count, persists to db.shootingLines)
  - Working "Runden und Passen" card (SetupRounds.svelte): WA preset or custom rounds/passes config, live summary, persists to db.rounds
affects: [02-03, 02-04]

tech-stack:
  added: []
  patterns:
    - "liveQuery() + $derived($query?.field ?? default) for a singleton Dexie row bound to a form input (shootingLines count), mirroring the existing classes-list liveQuery pattern from Plan 01"
    - "$derived.by() to resolve a two-mode form (preset vs. custom) into a single persistable shape before save"

key-files:
  created:
    - src/lib/fixtures/waPresets.ts
    - src/lib/views/SetupRounds.svelte
    - src/lib/views/SetupRounds.test.ts
  modified:
    - src/lib/views/Setup.svelte (added Shooting Lines card + Rounds/Passes card wired to SetupRounds)
    - src/lib/db/schema.test.ts (shootingLines and rounds singleton roundtrip tests)
    - src/lib/i18n/strings.de.ts (added setup.saveButton)

key-decisions:
  - "Shooting-line input uses a read-only $derived display value (from liveQuery) plus an onchange handler that validates and writes directly to db.shootingLines, rather than a two-way-bound $state — avoids fighting the liveQuery-driven value on every keystroke/reload while still satisfying the plan's 'bound to $state, clamped 1-10, persist on valid change' requirement functionally."
  - "SetupRounds.svelte resolves preset-vs-custom mode into one resolvedConfig object via $derived.by(), so the summary line and the save handler share a single source of truth — matches the plan's exact resolvedConfig shape (arrowsPerPasse/passesPerRound/numberOfRounds/distance/presetId)."

patterns-established:
  - "$derived.by() two-mode form resolution: reusable for any future Setup/Registration form with a preset-vs-custom toggle (matches how RoundConfig unifies preset and custom paths)."

requirements-completed: [SETUP-03, SETUP-04]

duration: ~25min
completed: 2026-07-04
---

# Phase 2 Plan 02: Shooting Lines & Rounds/Passes Configuration Summary

**Shooting-line count input and a WA-preset-or-custom rounds/passes configurator, both persisting to their singleton Dexie rows and driving a live summary line before save.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-04T18:33:01Z
- **Tasks:** 2 of 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments

- `WA_PRESETS` fixture ships the exact WA 18m/25m/70m catalog from CONTEXT.md D-03 (10×3=30 Pfeile at 18m/25m; 6×6=36 Pfeile at 70m), consumed only by `SetupRounds.svelte`.
- Setup view's "Schießplätze" card lets the trainer set 1–10 shooting lines; the value persists to `db.shootingLines` (singleton row `id:1`) and survives a simulated reload (re-read via `liveQuery`).
- `SetupRounds.svelte` gives the trainer a preset/custom radio toggle: three WA preset radios or four custom number/text fields (rounds, passes/round, arrows/passe, distance), a live summary line, and a "Speichern" button that writes the resolved configuration to `db.rounds` (singleton row `id:1`).
- Both Dexie tables now have roundtrip tests in `schema.test.ts`; `SetupRounds.svelte` has two component tests covering the WA-preset path and the custom path (including `presetId: undefined` for custom saves).

## Task Commits

1. **Task 1: Shooting-line count input + WA preset fixture data** — `c7ecfea` (feat)
2. **Task 2: Rounds/passes configuration slice** — `05e8caf` (feat)

## Files Created/Modified

- `src/lib/fixtures/waPresets.ts` - `WA_PRESETS` reference data (wa-18m, wa-25m, wa-70m)
- `src/lib/views/SetupRounds.svelte` - rounds/passes configuration form (WA preset or custom), live summary, persists to `db.rounds`
- `src/lib/views/SetupRounds.test.ts` - WA-preset-path and custom-path component tests
- `src/lib/views/Setup.svelte` - added "Schießplätze" card (line-count input) and "Runden und Passen" card (hosts `SetupRounds`)
- `src/lib/db/schema.test.ts` - `shootingLines` and `rounds` singleton roundtrip tests
- `src/lib/i18n/strings.de.ts` - added `setup.saveButton` ("Speichern")

## Decisions Made

- Line-count input renders a `$derived` display value sourced from `liveQuery(() => db.shootingLines.get(1))` and writes via an `onchange` handler that validates the integer is in range 1–10 before calling `db.shootingLines.put`. This is functionally equivalent to the plan's described `$state`-bound approach but avoids a stale-input/liveQuery race on every keystroke, since the input is never the sole source of truth — the DB is.
- `SetupRounds.svelte` centralizes preset-vs-custom resolution in a single `$derived.by()` (`resolvedConfig`), which both the summary line and the save handler read from — guarantees the persisted config always matches what the trainer sees on screen before clicking save.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing `strings.setup.saveButton` string constant**
- **Found during:** Task 2 (writing the SetupRounds save button)
- **Issue:** The plan's Task 2 action text references `strings.setup.save` as the save button's label, but no `save` (or `saveButton`) key existed under `setup` in `strings.de.ts` (Plan 01 populated `setup` with the UI-SPEC's verbatim block, which lists "Primary button: Save rounds/passes → Speichern" in prose but never added a corresponding code key). Building against the referenced key would throw a runtime error (`strings.setup.save` is `undefined`), and hardcoding the literal string "Speichern" would violate the UI-SPEC's "no hardcoded strings" checklist item.
- **Fix:** Added `saveButton: 'Speichern'` under `setup` in `strings.de.ts`, matching the UI-SPEC's canonical copy and the existing naming convention (`presets.saveButton` already uses this exact pattern).
- **Files modified:** `src/lib/i18n/strings.de.ts`
- **Verification:** `SetupRounds.test.ts` asserts on `screen.getByRole('button', { name: strings.setup.saveButton })` — both tests pass.
- **Committed in:** `05e8caf` (Task 2 commit)

**2. [Rule 3 - Blocking] Ran `npm install` — worktree `node_modules` was not populated**
- **Found during:** Task 1 (`npm run test -- src/lib/db/schema.test.ts` failed to resolve `fake-indexeddb/auto`)
- **Issue:** This git worktree's `node_modules` only contained a `.vite` cache directory; none of the packages listed in `package.json` (already correct from Plan 01, including `fake-indexeddb`) were actually installed.
- **Fix:** Ran `npm install` (no `package.json`/`package-lock.json` changes — the dependency was already declared correctly by Plan 01).
- **Files modified:** none (only `node_modules`, not tracked/committed)
- **Verification:** `npm run test -- src/lib/db/schema.test.ts` passes after install.

---

**Total deviations:** 2 auto-fixed (1 missing-string-constant fix, 1 environment/install fix)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria to pass and stayed within this plan's scope (the string addition is the minimal fix for a plan-authored reference; the `npm install` touched no tracked files).

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `db.shootingLines` (singleton, `count`) is populated and readable — Plan 03 (Registration) can read it directly for AB/AB-CD mode detection (`shooterCount > 2 × lineCount`).
- `db.rounds` (singleton, full `RoundConfig` shape including `presetId`) is populated and readable — Plan 04 (Presets) can snapshot it alongside `db.shootingLines` and `db.classes` without further schema changes.
- `WA_PRESETS` fixture is stable and exported for reuse if Plan 04's preset save/load flow needs to re-derive or display preset names.

---
*Phase: 02-setup-registration*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 3 created files verified present on disk (`src/lib/fixtures/waPresets.ts`, `src/lib/views/SetupRounds.svelte`, `src/lib/views/SetupRounds.test.ts`); both task commits (`c7ecfea`, `05e8caf`) verified present in `git log --oneline --all`.
