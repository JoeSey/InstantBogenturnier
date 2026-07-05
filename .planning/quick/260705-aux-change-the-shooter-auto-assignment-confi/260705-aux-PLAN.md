---
phase: quick
plan: 260705-aux
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/components/AutoAssignModal.svelte
  - src/lib/components/ShooterForm.svelte
  - src/lib/components/ShooterForm.test.ts
autonomous: true
requirements: [REG-01, REG-02]
must_haves:
  truths:
    - "The trainer sees the AutoAssignModal confirmation exactly once during a Registration session — the first time a shooter registration needs auto-assignment."
    - "Every subsequent registration that needs auto-assignment (same session) is written to db.shooters immediately, with no modal, using the same round-robin/flight logic as before."
    - "Manually-entered line numbers (lineNum !== null) with no unassigned carry-over never trigger the modal, regardless of session state."
    - "The round-robin continuity fix (startIndex / alreadyAssignedCount from a fresh db.shooters.toArray() query) still applies identically whether the modal path or the silent path is taken."
    - "Reloading the page resets the once-per-session flag (next registration needing auto-assignment shows the modal again)."
  artifacts:
    - path: "src/lib/components/AutoAssignModal.svelte"
      provides: "Exported applyRosterAssignments(roster, lineCount, mode, alreadyAssignedCount) in a <script module> block, used by both the modal's own Speichern action and ShooterForm's silent path."
    - path: "src/lib/components/ShooterForm.svelte"
      provides: "Once-per-session hasShownAutoAssignOnce flag gating whether handleSubmit shows AutoAssignModal or calls applyRosterAssignments directly."
    - path: "src/lib/components/ShooterForm.test.ts"
      provides: "Updated round-robin and mode-indicator tests reflecting modal-once behavior, plus a new regression test asserting the second auto-assigned registration does not reopen the modal."
  key_links:
    - from: "src/lib/components/ShooterForm.svelte"
      to: "src/lib/components/AutoAssignModal.svelte"
      via: "import { applyRosterAssignments, type RosterEntry } from './AutoAssignModal.svelte'"
      pattern: "import.*applyRosterAssignments.*AutoAssignModal"
    - from: "src/lib/components/AutoAssignModal.svelte"
      to: "src/lib/utils/shooterAutoAssignment.ts"
      via: "assignShootersToLines(blankEntries.length, lineCount, mode, alreadyAssignedCount) called inside applyRosterAssignments"
      pattern: "assignShootersToLines\\("
---

<objective>
Change the AutoAssignModal confirmation UX in Registration so it appears only once per session (the first time a shooter registration needs round-robin auto-assignment), instead of on every registration. Subsequent auto-assigned registrations in the same session write directly to `db.shooters` using the exact same round-robin/flight logic, with no modal.

Purpose: Reduce friction for the trainer registering many shooters during live tournament setup — the confirmation has already been seen and doesn't need repeating every time.
Output: `AutoAssignModal.svelte` exposes a shared, db-writing `applyRosterAssignments` helper via `<script module>`; `ShooterForm.svelte` gates modal display behind a component-instance `hasShownAutoAssignOnce` flag and calls the shared helper directly once that flag is set (or when there's nothing to auto-assign at all); tests updated/added to lock in the new behavior.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

<interfaces>
<!-- Current AutoAssignModal.svelte (full file already read) — the write logic in
handleSave (lines ~50-105) is what gets extracted into a <script module> export.
Current ShooterForm.svelte handleSubmit (lines ~75-122) is what gets rewritten. -->

From src/lib/utils/shooterAutoAssignment.ts (DO NOT MODIFY — read-only dependency):
```typescript
export interface LineAssignment {
  lineNum: number;
  flight: 'A/B' | 'C/D';
}
export function assignShootersToLines(
  unassignedCount: number,
  lineCount: number,
  mode: TournamentMode,
  startIndex = 0
): LineAssignment[];
export function previewAssignmentSummary(assignments: LineAssignment[]): string;
```

From src/lib/db/schema.ts:
```typescript
export interface ShooterRecord {
  id?: number;
  name: string;
  classId: number;
  lineAssignment: number | null;
  flight: 'A/B' | 'C/D' | null;
  // ...
}
db.shooters: Table<ShooterRecord, number>; // '++id, classId, lineAssignment'
```

Current `RosterEntry` shape (duplicated today in both files — Task 1 consolidates it
into one exported type in AutoAssignModal.svelte's module block):
```typescript
interface RosterEntry {
  id?: number;
  name: string;
  classId: number;
  lineNum: number | null; // null = needs auto-assignment
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extract shared applyRosterAssignments into AutoAssignModal.svelte's module context</name>
  <files>src/lib/components/AutoAssignModal.svelte</files>
  <action>
Add a `<script module lang="ts">` block to AutoAssignModal.svelte (Svelte 5 module context — exports from it are importable as named imports from other files, e.g. `import { applyRosterAssignments } from './AutoAssignModal.svelte'`). In that block:
- Import `db` from '../db/schema' and `assignShootersToLines` from '../utils/shooterAutoAssignment', plus `type { TournamentMode }` from '../utils/modeDetection'.
- Export the `RosterEntry` interface (id?, name, classId, lineNum) — this becomes the single source of truth for the shape; the instance script's existing local `interface RosterEntry {...}` declaration must be deleted (module-scoped declarations in the same file are visible to the instance script without re-importing — do not re-declare it).
- Export an async function `applyRosterAssignments(roster: RosterEntry[], lineCount: number, mode: TournamentMode, alreadyAssignedCount: number): Promise<void>` that reproduces exactly what today's `handleSave` body does: split `roster` into `manualEntries` (`lineNum !== null`) and `blankEntries` (`lineNum === null`), compute `assignShootersToLines(blankEntries.length, lineCount, mode, alreadyAssignedCount)`, then for each manual entry either `db.shooters.update(entry.id, { lineAssignment: entry.lineNum, flight: null })` (has `id`) or push `{ name, classId, lineAssignment: entry.lineNum, flight: null }` to a `toAdd` array; for each blank entry at index `i` either `db.shooters.update` with the computed assignment or push to `toAdd`; finally `if (toAdd.length > 0) await db.shooters.bulkAdd(toAdd)`. Let errors propagate (do not catch inside this function) — callers handle their own errorFeedback per WR-04.
- Simplify the instance script's `handleSave()` to call this shared function instead of inlining the loop: `await applyRosterAssignments(roster, lineCount, mode, alreadyAssignedCount)` inside the existing try/catch, then `onSave()`. Remove the now-redundant inline write loop and the local `toAdd` variable from the instance script — keep `manualEntries`/`blankEntries`/`computedAssignments`/`summary`/`count` derived values as-is (still used for the preview text).
- This task is a pure refactor with NO behavior change — do not touch handleModalBack, the template, or any strings.
  </action>
  <verify>
    <automated>npx vitest run src/lib/components/ShooterForm.test.ts</automated>
  </verify>
  <done>AutoAssignModal.svelte exports `applyRosterAssignments` and `RosterEntry` from a `<script module>` block; `handleSave` delegates to it; all existing ShooterForm.test.ts tests still pass unchanged (this task alone changes no observable behavior).</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Gate AutoAssignModal behind a once-per-session flag in ShooterForm and update tests</name>
  <files>src/lib/components/ShooterForm.svelte, src/lib/components/ShooterForm.test.ts</files>
  <behavior>
    - Test: rendering `Registration` and submitting 3 shooters with blank line numbers sequentially shows the "Speichern" confirmation button only after the 1st submission; the 2nd and 3rd submissions write directly to `db.shooters` (detected via `db.shooters.count()` increasing) with no "Speichern" button appearing — final `lineAssignment` values still equal `[1, 2, 1]` (lineCount=2, round-robin continuity preserved).
    - Test: rendering `Registration`, submitting a first blank-line shooter and confirming via "Speichern", then submitting a second blank-line shooter — after the second submission, `screen.queryByRole('dialog')` is `null` (modal never reopened) and `db.shooters.count()` is 2 with `lineAssignment` values `[1, 2]`.
    - Test: the "mode indicator" test (5 sequential registrations) only waits for/clicks "Speichern" on the first iteration; iterations 2-5 wait for `db.shooters.count()` to reach `i + 1` instead, and the mode still flips to "AB/CD" once shooterCount crosses `2 * lineCount`.
    - Existing "opens the auto-assign modal for one shooter and persists it on Speichern" test (renders a fresh `ShooterForm` instance) is unaffected — a freshly-rendered component always starts with the flag unset, so the modal still shows on that lone submission.
  </behavior>
  <action>
Update `src/lib/components/ShooterForm.svelte`:
- Import `applyRosterAssignments` and `type { RosterEntry }` from `'./AutoAssignModal.svelte'` (module-context export from Task 1); delete the local duplicated `interface RosterEntry {...}` declaration and its justifying comment (no longer needed — the type is now shared).
- Add `let hasShownAutoAssignOnce = $state(false);` near the other component state (`showModal`, `stagedRoster`) — a component-instance flag scoped to this ShooterForm instance's lifetime (i.e. the Registration view's lifetime, since ShooterForm is unconditionally mounted for as long as Registration is; resets only on a fresh render / full page reload — no DB persistence).
- Rewrite `handleSubmit`'s non-editing branch: after building `freshShooters`, `unassigned`, and `alreadyAssignedCount` (unchanged from today — still a fresh `db.shooters.toArray()` query, per the round-robin continuity fix from commit ab49025), build the `roster` array (`[...unassigned, newEntry]`) as before, then compute `const needsAutoAssign = roster.some((r) => r.lineNum === null);`. If `!needsAutoAssign || hasShownAutoAssignOnce`, call `applyRosterAssignments(roster, lineCount, mode, alreadyAssignedCount)` directly inside a try/catch (mirroring the existing WR-04 errorFeedback pattern used elsewhere in this file), then `resetForm()` and return — no modal. Otherwise (needs auto-assign AND not yet shown this session), keep today's behavior: set `stagedAlreadyAssignedCount`, `stagedRoster = roster`, `showModal = true`.
- In `handleModalSave`, set `hasShownAutoAssignOnce = true` before clearing `showModal`/`stagedRoster`/calling `resetForm()` — the flag flips only on a confirmed save (not on `handleModalBack`), so if the trainer clicks "Zurück" without saving, the modal still shows again on the next auto-assign-needing submission (nothing was actually auto-assigned yet).
- `handleModalBack` is unchanged.

Then update `src/lib/components/ShooterForm.test.ts`:
- Add `waitFor` to the `@testing-library/svelte` import (already used elsewhere in this codebase, e.g. PresetList.test.ts).
- In the "Registration round-robin regression" test, change the loop so only `i === 0` awaits/clicks the "Speichern" button (and waits for its removal); for `i > 0`, replace that block with `await waitFor(async () => { expect(await db.shooters.count()).toBe(i + 1); });`. Update the `it(...)` title to mention the modal-once behavior. Final assertion (`lineAssignment` sequence `[1, 2, 1]`) stays the same.
- In the "Registration mode indicator" test, apply the same `i === 0` vs `i > 0` split inside its 5-iteration loop.
- Add a new test (new `describe('Auto-assign once-per-session', ...)` block with its own `beforeEach(resetDb)`) per the `<behavior>` block above: registers a first blank-line shooter through the modal, then a second blank-line shooter, and asserts `screen.queryByRole('dialog')` is `null` after the second submission plus the resulting `lineAssignment` values.
  </action>
  <verify>
    <automated>npx vitest run src/lib/components/ShooterForm.test.ts && npm run check</automated>
  </verify>
  <done>ShooterForm shows AutoAssignModal only on the first registration (per session) that needs auto-assignment; every subsequent auto-assign-needing registration writes silently via `applyRosterAssignments` with identical round-robin/flight results; manual-only submissions with no carry-over never show the modal; all tests in ShooterForm.test.ts pass, including the new once-per-session regression test; `npm run check` passes with no type errors.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Trainer input -> IndexedDB | Form fields (name, classId, lineNum) written to local Dexie store; no network/server boundary in this client-only app. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | ShooterForm.svelte silent-write path | accept | Same validation (`trimmedName`, required `classId`) and same WR-04 try/catch error surfacing as the existing modal-confirmed path — no new input surface introduced, only the confirmation-UI gating changes. |
| T-quick-02 | Repudiation | hasShownAutoAssignOnce state | accept | In-memory only, single-device/single-trainer tool by design (per CLAUDE.md); no multi-user attribution concern for a session-scoped UX flag. |
</threat_model>

<verification>
Run `npx vitest run` (full suite) and `npm run check` after both tasks are complete — both must pass with zero failures/errors.
</verification>

<success_criteria>
- First shooter registration needing auto-assignment in a session shows AutoAssignModal; the trainer confirms via "Speichern".
- Every subsequent registration needing auto-assignment in the same session (same ShooterForm/Registration mount) writes directly to `db.shooters` with correct round-robin `lineAssignment`/`flight`, without showing the modal.
- Manual line-number entries with no unassigned carry-over never show the modal, regardless of session state.
- A full page reload resets the once-per-session flag.
- `npx vitest run` and `npm run check` both pass.
</success_criteria>

<output>
Create `.planning/quick/260705-aux-change-the-shooter-auto-assignment-confi/260705-aux-SUMMARY.md` when done
</output>
