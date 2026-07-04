---
phase: 02-setup-registration
plan: 01
subsystem: database, ui
tags: [dexie, indexeddb, svelte5, runes, i18n, testing-library, vitest, fake-indexeddb]

requires:
  - phase: 01-foundation
    provides: Glassmorphism shell (GlassCard, nav), Dexie v1 empty scaffold, centralized strings.de.ts, Svelte 5 runes patterns
provides:
  - Dexie v2 schema (classes, shootingLines, rounds, shooters, presets tables) with typed ClassRecord/ShootingLineConfig/RoundConfig/ShooterRecord/PresetRecord interfaces
  - classNameGenerator.ts (generateClassName, autoSuffixOnCollision, getBowTypeAbbr) — pure, framework-free, reusable by later Phase 2 plans
  - resetDb() test helper for every later Dexie-touching test file in Phase 2
  - Full Phase 2 strings.de.ts sections (setup, registration, presets) — later plans only import, never edit
  - Working Classes card in the Setup view (add/list/delete with live name suggestion + collision auto-suffix)
  - fake-indexeddb test infrastructure + vitest.config.ts browser resolve-condition fix, enabling all future Dexie/component tests under jsdom
affects: [02-02, 02-03, 02-04]

tech-stack:
  added: [fake-indexeddb@^6.2.5]
  patterns:
    - "Dexie v2 schema with typed Table<Interface, number> properties on the Dexie subclass"
    - "liveQuery() + $derived($query ?? []) for reactive Dexie-backed lists in Svelte 5 components"
    - "DropdownWithCustom.svelte: dropdown-with-'Andere'-escape-hatch reusable input pattern"
    - "resolve.conditions: ['browser'] in vitest.config.ts required for @testing-library/svelte render() under Vitest+jsdom"

key-files:
  created:
    - src/lib/db/schema.ts (expanded to v2)
    - src/lib/db/testHelpers.ts
    - src/lib/db/schema.test.ts
    - src/lib/fixtures/classOptions.ts
    - src/lib/utils/classNameGenerator.ts
    - src/lib/utils/classNameGenerator.test.ts
    - src/lib/components/DropdownWithCustom.svelte
    - src/lib/components/ClassForm.svelte
    - src/lib/components/ClassForm.test.ts
    - src/lib/views/Setup.svelte
  modified:
    - package.json (fake-indexeddb devDependency, test:all script)
    - vitest-setup.ts (fake-indexeddb/auto import)
    - vitest.config.ts (resolve.conditions browser fix)
    - src/lib/i18n/strings.de.ts (setup/registration/presets sections added)
    - src/App.svelte (Setup replaces SetupPlaceholder; selectSection type fix)

key-decisions:
  - "getBowTypeAbbr accepts either a full label ('Recurve') or an already-abbreviated value ('RCV'), returning custom/unrecognized text unchanged — keeps generateClassName robust whether callers pass dropdown values or raw labels."
  - "autoSuffixOnCollision only appends a numeric -2/-3 suffix when the full tuple (ageGroup/bowType/distance) is identical to the colliding record; any differing field (distance > bowType > ageGroup priority) is preferred per D-07."
  - "strings.de.ts Phase 2 sections copied verbatim from 02-UI-SPEC.md, with additional classDelete* keys added for the Classes card's inline delete-confirmation row (not present in the UI-SPEC's own verbatim block but required by this plan's Task 2 action text)."

patterns-established:
  - "Dexie table interfaces + Table<T, number> typed properties: the canonical shape for all future Phase 2 tables (shootingLines/rounds/shooters/presets already typed, ready for Plans 02-04)."
  - "DropdownWithCustom.svelte as the shared dropdown-with-custom-escape-hatch component for all Setup/Registration form fields."

requirements-completed: [SETUP-01, SETUP-02]

duration: 35min
completed: 2026-07-04
---

# Phase 2 Plan 01: Dexie Schema & Classes Vertical Slice Summary

**Dexie v2 schema (5 tables) plus a fully working Classes card: live app-suggested class names (bow-abbr/age/distance tuple) with semantic collision auto-suffixing, backed by fake-indexeddb-tested Dexie CRUD.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-07-04T18:24:38Z
- **Tasks:** 2 of 3 (Task 0 checkpoint was pre-approved by the human before this run started)
- **Files modified:** 13 (5 created test/infra files, 5 created feature files, 3 modified existing files)

## Accomplishments

- Dexie v2 schema defines all 5 tables (`classes`, `shootingLines`, `rounds`, `shooters`, `presets`) with typed TS interfaces, ready for Plans 02/03/04 to consume without touching `schema.ts` again
- `classNameGenerator.ts` implements live name suggestion (D-04) and semantic collision auto-suffixing (D-07: distance > bowType > ageGroup priority, numeric fallback only on a fully identical tuple)
- Trainer-facing Classes card: 3 dropdown-with-custom fields, live suggested name, name override, add/list/delete-with-inline-confirm — all wired to `db.classes` via `liveQuery`
- `strings.de.ts` now holds the full Phase 2 `setup`/`registration`/`presets` copy sections, so Plans 02-04 only ever import from it
- Test infrastructure: `fake-indexeddb` wired into `vitest-setup.ts`, `resetDb()` helper for all future Dexie-touching tests, and a `vitest.config.ts` fix that unblocks `@testing-library/svelte` component rendering under Vitest+jsdom project-wide

## Task Commits

Each task was committed atomically (TDD RED/GREEN for Task 1, single commit for Task 2):

1. **Task 0: Verify fake-indexeddb package legitimacy** — pre-approved by the human before this execution run (no new commit; approval documented in the orchestrator's prior session)
2. **Task 1 (RED): add failing tests for Dexie v2 schema and classNameGenerator** - `778b005` (test)
3. **Task 1 (GREEN): implement Dexie v2 schema and class-name generation logic** - `9eaba4e` (feat)
4. **Task 2: wire the Classes vertical slice into the Setup view** - `a814c8f` (feat)

_Note: Task 1 used the TDD RED→GREEN cycle since it is marked `tdd="true"`; no REFACTOR commit was needed._

## Files Created/Modified

- `src/lib/db/schema.ts` - Dexie v2 schema (5 tables) + typed interfaces
- `src/lib/db/testHelpers.ts` - `resetDb()` shared test helper
- `src/lib/db/schema.test.ts` - table-existence + CRUD roundtrip tests
- `src/lib/fixtures/classOptions.ts` - AGE_GROUP_OPTIONS/BOW_TYPE_OPTIONS/DISTANCE_OPTIONS reference data
- `src/lib/utils/classNameGenerator.ts` - `generateClassName`/`autoSuffixOnCollision`/`getBowTypeAbbr`
- `src/lib/utils/classNameGenerator.test.ts` - 7 behavior-case tests
- `src/lib/components/DropdownWithCustom.svelte` - dropdown + "Andere" escape hatch
- `src/lib/components/ClassForm.svelte` - class add/list/delete form wired to Dexie
- `src/lib/components/ClassForm.test.ts` - name-suggestion + collision-suffix component tests
- `src/lib/views/Setup.svelte` - new Setup view hosting the Classes card
- `package.json` - `fake-indexeddb` devDependency, `test:all` script
- `vitest-setup.ts` - `fake-indexeddb/auto` polyfill import
- `vitest.config.ts` - `resolve.conditions: ['browser']` fix
- `src/lib/i18n/strings.de.ts` - full `setup`/`registration`/`presets` sections
- `src/App.svelte` - `Setup` replaces `SetupPlaceholder`; `selectSection` type fix

## Decisions Made

- `getBowTypeAbbr` treats already-abbreviated values as pass-through (matches on either `label` or `value`), so `generateClassName` works whether the caller holds a full label or an abbreviation.
- Collision suffix priority is distance > bowType > ageGroup, matching the plan's explicit worked example; numeric fallback (`-2`, `-3`, ...) is reserved strictly for a fully-identical tuple.
- Added `classDelete*` string keys beyond the UI-SPEC's literal verbatim block, since the Classes card's inline delete-confirmation copy ("Klasse '{name}' löschen?" / "Ja, löschen" / "Abbrechen") is specified in the plan's Task 2 action text but not present in 02-UI-SPEC.md's own Strings Module Extension code block.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `resolve.conditions: ['browser']` to vitest.config.ts**
- **Found during:** Task 2 (ClassForm.test.ts)
- **Issue:** `@testing-library/svelte`'s `render()` failed with `Svelte error: lifecycle_function_unavailable — mount(...) is not available on the server`. Vitest runs in Node, so Vite's default dependency resolution used the "node" export condition, resolving Svelte's SSR build even though the test environment is jsdom.
- **Fix:** Added `resolve: { conditions: ['browser'] }` to `vitest.config.ts`, forcing Svelte's client build to resolve under Vitest.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npm run test -- src/lib/components/ClassForm.test.ts` — both tests pass
- **Committed in:** `a814c8f` (Task 2 commit)

**2. [Rule 1 - Bug] Fixed pre-existing type error in App.svelte**
- **Found during:** Task 2 (`npm run check` after editing App.svelte)
- **Issue:** `selectSection(id: SectionId)` didn't satisfy `BottomTabBar`/`Sidebar`'s `onselect: (id: string) => void` prop contract, producing a pre-existing `svelte-check` TS error (confirmed present before this plan's changes via `git diff HEAD~2 -- src/App.svelte`, which showed no prior diff).
- **Fix:** Widened `selectSection`'s parameter to `string` and narrowed with `as SectionId` internally.
- **Files modified:** `src/App.svelte`
- **Verification:** `npm run check` — `svelte-check` now reports 0 errors (0 warnings, 0 files with problems)
- **Committed in:** `a814c8f` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking build-config fix, 1 pre-existing bug fix)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria (`npm run test` and `npm run check` passing) and touched only files already in scope for this plan (`vitest.config.ts` is shared test infra; `App.svelte` is a `files_modified` entry for Task 2). No scope creep.

## Issues Encountered

- `npm run check`'s second sub-command (`tsc -p tsconfig.node.json`) fails with `vite.config.ts(5,54): error TS2307: Cannot find module './src/lib/config/app.config'`. Confirmed pre-existing via `git diff` against the worktree's base commit — `vite.config.ts` and `tsconfig.node.json` are unchanged and were not touched by this plan (not in its `files_modified` list). Logged to `.planning/phases/02-setup-registration/deferred-items.md` rather than fixed, per the scope-boundary rule. The `svelte-check` half of `npm run check` (the part covering every `.svelte`/`.ts` file this plan actually touches) passes with 0 errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema and class-name-generation interfaces are stable and typed; Plans 02 (shooting lines + rounds), 03 (registration), 04 (presets) can build directly against `src/lib/db/schema.ts` and import from `strings.de.ts` without any further edits to either file.
- `resetDb()` is available for all future Dexie-touching test files.
- Known pre-existing `tsconfig.node.json`/`vite.config.ts` type error remains open — tracked in `deferred-items.md`, not blocking for Plans 02-04.

---
*Phase: 02-setup-registration*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 10 created files verified present on disk; all 3 task commits (`778b005`, `9eaba4e`, `a814c8f`) verified present in `git log --oneline --all`.
