---
phase: 02-setup-registration
plan: 03
subsystem: ui
tags: [svelte5, runes, dexie, indexeddb, liveQuery, testing-library, vitest]

requires:
  - phase: 02-setup-registration
    provides: "Dexie v2 schema (classes/shootingLines/shooters tables), strings.de.ts registration section, resetDb() test helper (Plan 01)"
provides:
  - "modeDetection.ts (detectMode) and shooterAutoAssignment.ts (assignShootersToLines, previewAssignmentSummary) — pure, framework-free, reusable by Phase 3/4"
  - "Working Registration view: shooter form, live AB/AB-CD mode indicator, transparent auto-assignment preview modal, responsive shooter list with edit/delete"
  - "ShooterForm.svelte and AutoAssignModal.svelte components wired into App.svelte, replacing RegistrationPlaceholder"
affects: [03-scoring, 04-results]

tech-stack:
  added: []
  patterns:
    - "Non-dismissible glass-card overlay modal pattern (AutoAssignModal) for review-before-commit flows"
    - "Roster entries with optional `id` (already-persisted, update()'d on commit) vs. no `id` (staged, bulkAdd()'ed on commit) — lets a single save action handle both pre-existing unassigned records and newly staged ones without duplicate inserts"
    - "Structurally-duplicated local TS interfaces across two Svelte 5 instance scripts (RosterEntry in both ShooterForm.svelte and AutoAssignModal.svelte) since Svelte 5 instance scripts only expose $props()-declared props, not plain `export` bindings — shared types for component-to-component data need either a shared .ts module or duplication"

key-files:
  created:
    - src/lib/utils/modeDetection.ts
    - src/lib/utils/modeDetection.test.ts
    - src/lib/utils/shooterAutoAssignment.ts
    - src/lib/utils/shooterAutoAssignment.test.ts
    - src/lib/components/ShooterForm.svelte
    - src/lib/components/ShooterForm.test.ts
    - src/lib/components/AutoAssignModal.svelte
    - src/lib/views/Registration.svelte
  modified:
    - src/App.svelte (Registration replaces RegistrationPlaceholder)

key-decisions:
  - "AutoAssignModal computes the round-robin preview from only the shooters missing a manual line entry (blankEntries), not the full roster — manually-entered lines are kept as-is with flight: null, matching the plan's Task 2 action text verbatim."
  - "Roster entries carry an optional `id`: entries with an id (defensive support for already-registered-but-unassigned shooters) are persisted via db.shooters.update(); entries without an id (the newly staged shooter from the form) are collected and persisted via db.shooters.bulkAdd() — avoids double-inserting already-existing records while still honoring the plan's 'query the full unassigned set' instruction."
  - "Edit path in ShooterForm bypasses the auto-assign modal entirely (direct db.shooters.update()), per the plan's explicit note that line reassignment on edit is a single-shooter correction, not a new registration."

patterns-established:
  - "modeDetection.ts / shooterAutoAssignment.ts as the canonical pure-logic modules for tournament mode and line-balancing math — Phase 3/4 scoring and results views can import detectMode/assignShootersToLines directly without touching Svelte component state."

requirements-completed: [REG-01, REG-02]

duration: 45min
completed: 2026-07-04
---

# Phase 2 Plan 03: Shooter Registration Vertical Slice Summary

**Shooter registration with a non-dismissible, transparent round-robin auto-assignment preview modal and a live AB/AB-CD mode indicator computed via `shooterCount > 2 x lineCount`.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-07-04T18:40:39Z
- **Tasks:** 2 of 2
- **Files modified:** 9 (8 created, 1 modified)

## Accomplishments

- `modeDetection.ts` and `shooterAutoAssignment.ts` implement the D-08/D-09/D-10 tournament-mode and round-robin line/flight logic as pure, fully-unit-tested functions
- `ShooterForm.svelte` validates name (required, trimmed) + class (required dropdown) + optional line, stages the new shooter in-memory, and opens `AutoAssignModal` before any `db.shooters` write happens
- `AutoAssignModal.svelte` is a non-dismissible glass-card overlay showing the exact line/flight preview ("{N} Schützen werden automatisch zugewiesen: Schießplätze: ...") with "Speichern" (commit) / "Zurück" (discard) actions
- `Registration.svelte` computes the AB/AB-CD mode indicator live via `$derived(detectMode(...))`, renders a responsive shooter roster (opaque HTML table on desktop, glass-card list on phone per Phase 1's "no glass on data tables" contract), and supports edit (pre-fills the form, direct `db.shooters.update()`, no modal) and delete
- Wired into `App.svelte`, replacing `RegistrationPlaceholder`

## Task Commits

Each task was committed atomically (TDD RED/GREEN for Task 1, single commit for Task 2):

1. **Task 1 (RED): add failing tests for mode detection and shooter auto-assignment** - `776621b` (test)
2. **Task 1 (GREEN): implement mode detection and shooter auto-assignment logic** - `fd1c089` (feat)
3. **Task 2: shooter registration vertical slice with auto-assignment preview** - `e5439fa` (feat)

_Note: Task 1 used the TDD RED→GREEN cycle since it is marked `tdd="true"`; no REFACTOR commit was needed._

## Files Created/Modified

- `src/lib/utils/modeDetection.ts` - `detectMode(shooterCount, lineCount): TournamentMode`
- `src/lib/utils/modeDetection.test.ts` - 3 behavior-case tests
- `src/lib/utils/shooterAutoAssignment.ts` - `assignShootersToLines`, `previewAssignmentSummary`
- `src/lib/utils/shooterAutoAssignment.test.ts` - 3 behavior-case tests
- `src/lib/components/ShooterForm.svelte` - name/class/optional-line form, staging + modal trigger, edit-mode direct update
- `src/lib/components/ShooterForm.test.ts` - no-op-on-empty-name, modal-open-and-persist, and (adjacent describe block) Registration mode-flip tests
- `src/lib/components/AutoAssignModal.svelte` - non-dismissible auto-assignment preview + commit logic
- `src/lib/views/Registration.svelte` - mode indicator card, ShooterForm host, responsive shooter list with edit/delete, empty state
- `src/App.svelte` - `Registration` replaces `RegistrationPlaceholder`

## Decisions Made

- `AutoAssignModal` only computes auto-assignments for roster entries with `lineNum === null`; entries with a manually-entered line are persisted as-is with `flight: null` — matches the plan's Task 2 action text exactly.
- Roster entries use an optional `id` field to distinguish already-persisted-but-unassigned shooters (updated via `db.shooters.update()`) from newly staged ones (collected and persisted via a single `db.shooters.bulkAdd()`), so the acceptance criteria's "persists exactly one record" holds even though the design defensively queries the full unassigned set.
- Editing an existing shooter bypasses the auto-assign modal entirely per the plan's explicit guidance (single-shooter correction, not new registration).
- `RosterEntry` is a structurally-duplicated local interface in both `ShooterForm.svelte` and `AutoAssignModal.svelte` rather than a shared export, since Svelte 5 instance scripts only expose `$props()`-declared bindings — a plain `export interface` in an instance script is not a valid cross-component TS import path.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Ran `npm install` in the worktree before any test could execute**
- **Found during:** Task 1 setup (before writing the RED tests)
- **Issue:** The git worktree had no `node_modules` (not checked out; gitignored), so `npm run test` would fail immediately on any file.
- **Fix:** Ran `npm install` inside the worktree to populate `node_modules` from the existing `package.json`/`package-lock.json` (no dependency versions changed).
- **Files modified:** none (node_modules is gitignored, no lockfile drift)
- **Verification:** `npm run test` runs successfully afterward.
- **Committed in:** n/a (no file changes to commit)

**2. [Rule 1 - Bug] Fixed a liveQuery race condition in the ShooterForm test's class-dropdown interaction**
- **Found during:** Task 2 (writing `ShooterForm.test.ts`)
- **Issue:** `db.classes.toArray()` is fetched via `liveQuery()`, whose first emission is asynchronous — firing `fireEvent.change` on the class `<select>` immediately after `render()` selected against a dropdown that still only contained the placeholder option (the real class option hadn't rendered yet), so the modal never opened.
- **Fix:** Added `await screen.findByRole('option', { name: 'RCV-U14' })` before interacting with the class dropdown in both the direct `ShooterForm` test and the `Registration` mode-indicator test.
- **Files modified:** `src/lib/components/ShooterForm.test.ts`
- **Verification:** All 3 tests in the file pass reliably across repeated runs.
- **Committed in:** `e5439fa` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking environment fix, 1 test-timing bug)
**Impact on plan:** Both fixes were necessary for the plan's own acceptance criteria (`npm run test` passing) and touched only files already in scope for this plan (the test file itself) or no tracked files at all (node_modules). No scope creep.

## Issues Encountered

- Same pre-existing `tsconfig.node.json`/`vite.config.ts` type error documented in `02-01-SUMMARY.md` (`vite.config.ts(5,54): error TS2307: Cannot find module './src/lib/config/app.config'`) reproduces here too — confirmed unrelated to this plan's changes (not in `files_modified`), left untouched per the scope-boundary rule. `svelte-check` (the half of `npm run check` covering every file this plan touches) passes with 0 errors/warnings.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `modeDetection.ts`/`shooterAutoAssignment.ts` are stable, pure, and framework-free — Phase 3 (Score Entry) can import `detectMode` directly if it needs to display mode during scoring without any further changes to these files.
- `ShooterRecord`'s `lineAssignment`/`flight` fields are now populated end-to-end by real registration flow (previously only typed in schema.ts), ready for Phase 3's line-based score-entry grouping.
- Known pre-existing `tsconfig.node.json`/`vite.config.ts` type error remains open — tracked in `deferred-items.md` (Plan 01), not blocking for this or later plans.

---
*Phase: 02-setup-registration*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 8 created files verified present on disk; all 3 task commits (`776621b`, `fd1c089`, `e5439fa`) verified present in `git log --oneline --all`.
