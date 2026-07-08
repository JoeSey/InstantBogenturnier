---
phase: 02-setup-registration
reviewed: 2026-07-04T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - e2e/presetExportImport.spec.ts
  - src/App.svelte
  - src/lib/components/AutoAssignModal.svelte
  - src/lib/components/ClassForm.svelte
  - src/lib/components/ClassForm.test.ts
  - src/lib/components/ConfirmDialog.svelte
  - src/lib/components/DropdownWithCustom.svelte
  - src/lib/components/PresetSave.svelte
  - src/lib/components/PresetSave.test.ts
  - src/lib/components/ShooterForm.svelte
  - src/lib/components/ShooterForm.test.ts
  - src/lib/db/schema.test.ts
  - src/lib/db/schema.ts
  - src/lib/db/testHelpers.ts
  - src/lib/fixtures/classOptions.ts
  - src/lib/fixtures/waPresets.ts
  - src/lib/i18n/strings.de.ts
  - src/lib/utils/classNameGenerator.test.ts
  - src/lib/utils/classNameGenerator.ts
  - src/lib/utils/modeDetection.test.ts
  - src/lib/utils/modeDetection.ts
  - src/lib/utils/shooterAutoAssignment.test.ts
  - src/lib/utils/shooterAutoAssignment.ts
  - src/lib/views/PresetList.svelte
  - src/lib/views/PresetList.test.ts
  - src/lib/views/Registration.svelte
  - src/lib/views/SetupRounds.svelte
  - src/lib/views/SetupRounds.test.ts
  - src/lib/views/Setup.svelte
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the Phase 2 (Setup & Registration) implementation: Dexie schema, class/rounds/lines setup UI, shooter registration with auto-assignment, and the preset save/load/export/import flow. Unit and component tests are present and mostly meaningful (they exercise the documented behaviors), but they only cover the happy paths described in the plan documents — none of the tests exercise the >8-preset trim-on-import path, class deletion with dependent shooters, or repeated preset loads across differing class ID spaces. Tracing the actual logic (not just the tests) turned up three provable correctness bugs that silently corrupt or lose data with no error surfaced to the trainer, plus several validation and error-handling gaps. Given the project's stated core value ("Score entry and results ranking must work correctly ... during a live tournament"), the referential-integrity gaps between `classes` and `shooters` are especially concerning because Phase 4 (Results) will rank by class.

## Critical Issues

### CR-01: Preset import cap-at-8 logic deletes the newest presets instead of the oldest

**File:** `src/lib/views/PresetList.svelte:153-164`
**Issue:** After import, when more than 8 valid presets exist, the code is supposed to "cap at 8 valid presets, keeping the 8 most recently created" (see the comment on line 153). It sorts **ascending** by `createdAt` (oldest first) and then does `.slice(8)` — which returns everything *after* the 8th element, i.e. the **newest** entries in an ascending-sorted array — and deletes those:
```ts
const sorted = [...validPresets].sort(
  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);
const excessIds = sorted
  .slice(8)                       // <-- these are the NEWEST records in ascending order
  .map((p) => p.id)
  .filter((id): id is number => id !== undefined);
await db.presets.bulkDelete(excessIds);
```
If a trainer imports a file containing 9+ presets, the freshly-imported (and typically most relevant) presets are the ones silently deleted, while stale old ones are kept — the exact opposite of the stated intent and of what `importSuccess` feedback implies happened. This is not covered by any existing test (`presetExportImport.spec.ts` only ever has a single preset in flight).
**Fix:**
```ts
const sorted = [...validPresets].sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // newest first
);
const excessIds = sorted
  .slice(8) // everything past the 8 newest
  .map((p) => p.id)
  .filter((id): id is number => id !== undefined);
await db.presets.bulkDelete(excessIds);
```

### CR-02: Deleting a class leaves shooters with a dangling `classId`, silently, with no warning

**File:** `src/lib/components/ClassForm.svelte:59-63`
**Issue:** `confirmDelete` unconditionally calls `db.classes.delete(id)` with no check for whether any `ShooterRecord` still references that class via `classId`:
```ts
async function confirmDelete(id: number | undefined) {
  if (id === undefined) return;
  await db.classes.delete(id);
  confirmDeleteId = null;
}
```
Once the class is gone, `Registration.svelte`'s `className(classId)` (line 39-41) returns `''` for any shooter still pointing at the deleted id — the roster silently shows a blank class column, with no confirmation dialog warning the trainer that shooters are affected, and no cascading update/reassignment. Since class membership drives per-class results ranking (Phase 4), this is a real data-integrity defect, not just cosmetic.
**Fix:** Before deleting, check `db.shooters.where('classId').equals(id).count()`; if non-zero, block the delete (or route through `ConfirmDialog` with an explicit warning naming the affected shooter count), consistent with the destructive-action pattern already used elsewhere in this phase (`ConfirmDialog`'s `destructive` prop).

### CR-03: Loading a preset can silently reassign existing shooters to the wrong class via ID collision

**File:** `src/lib/views/PresetList.svelte:45-58`
**Issue:** `confirmLoad` clears `db.classes` and re-populates it verbatim from `preset.classes`, which was captured directly from `db.classes.toArray()` at save time (`PresetSave.svelte:20`) and therefore still carries the **original numeric `id`s** from whatever session/device saved the preset:
```ts
await db.classes.clear();
await db.classes.bulkAdd(preset.classes); // preset.classes[i].id is preserved verbatim
```
`db.shooters.classId` is a plain foreign key (not FK-constrained by Dexie) into `db.classes`. If a preset saved on a different device/session (or an imported preset) happens to reuse the same numeric class ids that the *current* device's shooters already reference, loading it will silently repoint every existing shooter at a class with a **different name/tuple** than the one they were actually registered under — with zero warning, since the code comment only promises "never touches db.shooters," not "never invalidates shooter class references." `PresetList.test.ts`'s own roundtrip test only asserts the shooter's *name* survives, not that its class assignment still resolves to a sane class — masking this exact failure mode.
**Fix:** Either (a) strip `id` from `preset.classes` before `bulkAdd` so Dexie always assigns fresh auto-increment ids, and remap any shooters whose `classId` referenced the old ids to the new ones by matching on class `name`/tuple, or (b) warn the trainer explicitly ("Loading this preset may change the class assigned to already-registered shooters") and reconcile `shooters.classId` values that no longer resolve to any class after the load.

## Warnings

### WR-01: `DropdownWithCustom` snaps out of custom-entry mode when the custom text is cleared to empty

**File:** `src/lib/components/DropdownWithCustom.svelte:27-32`
**Issue:**
```ts
$effect(() => {
  if (value === '') {
    isCustom = false;
    customInput = '';
  }
});
```
This effect is meant to reset the component when the parent externally clears its bound `value` (e.g. after form submit). But `handleCustomInput` (line 45-48) also calls `onchange(customInput)` on every keystroke, including when the user backspaces the custom field down to an empty string mid-edit. That flows back into the `value` prop, which becomes `''`, which re-triggers this same effect and forces `isCustom = false` — kicking the user out of custom-entry mode (hiding the text input) while they're still trying to type a custom value. This affects all three `DropdownWithCustom` usages in `ClassForm.svelte` (age group, bow type, distance).
**Fix:** Distinguish "externally reset" from "user cleared the custom field" — e.g. only reset `isCustom` from an explicit `reset()` callback/prop rather than from a generic effect on `value`, or track a separate `wasReset` flag set by the parent instead of inferring intent from `value === ''`.

### WR-02: `autoSuffixOnCollision` doesn't re-check the disambiguated name against the rest of the class list

**File:** `src/lib/utils/classNameGenerator.ts:30-56`
**Issue:** The function only ever looks up a single collision (`existingClasses.find((c) => c.name === baseName)`) and, on finding a differing field, returns `${baseName}-${differingValue}` without verifying that *this new candidate name* doesn't also already exist as a different class:
```ts
if (tuple.distance && tuple.distance !== collision.distance) {
  return `${baseName}-${tuple.distance}`; // not re-checked against existingClasses
}
```
Given two existing classes `"RCV-U14"` (18m) and `"RCV-U14-25m"` (25m), adding a third class with the same tuple as the second (`RCV`, `U14`, `25m`) collides with the first entry, take the distance branch, and returns `"RCV-U14-25m"` — which is already taken by the second class. Since `classes: '++id, name'` has no unique index, `db.classes.add` will happily insert a second row with an identical `name`, defeating the entire purpose of D-07's collision handling.
**Fix:** After computing a candidate suffix, loop (or recurse) until the candidate is unique against the full `existingClasses` list, falling through to the numeric-suffix branch if all semantic disambiguators are exhausted.

### WR-03: `SetupRounds`'s custom-mode fields are persisted without validation

**File:** `src/lib/views/SetupRounds.svelte:15-18, 42-44, 96-125`
**Issue:** `customRounds`, `customPassesPerRound`, and `customArrowsPerPasse` are bound via `bind:value` to `<input type="number" min="1" ...>`, but `min`/`max` are only HTML hints — Svelte's number binding on an emptied input yields `NaN`, and nothing in `save()` validates the resolved values before writing:
```ts
async function save() {
  await db.rounds.put({ id: 1, ...resolvedConfig }); // no validation of resolvedConfig fields
}
```
Contrast with `Setup.svelte`'s `handleLineCountChange`, which explicitly guards `Number.isInteger(value) && value >= 1 && value <= 10` before writing. A trainer who clears a numeric field and clicks "Speichern" will silently persist `NaN` into `db.rounds`, corrupting the round configuration that later scoring/results phases will depend on.
**Fix:** Validate `resolvedConfig` (integer, `>= 1`, sane upper bounds) before the `db.rounds.put` call in `save()`, mirroring the pattern already used for the shooting-line count.

### WR-04: Systemic missing error handling around Dexie writes

**File:** `src/lib/components/ClassForm.svelte:27-48`, `src/lib/components/ShooterForm.svelte:66-94`, `src/lib/components/PresetSave.svelte:18-46, 74-76`, `src/lib/views/PresetList.svelte:45-58, 70-74`, `src/lib/components/AutoAssignModal.svelte:42-86`, `src/lib/views/Registration.svelte:34-37`
**Issue:** None of the async Dexie operations across these components are wrapped in `try/catch`, and none surface a failure to the trainer. `PresetList.confirmImport` is the sole exception with a `try/catch`. A write failure — e.g., storage quota exceeded (a documented risk for this PWA per `CLAUDE.md`'s iOS Safari IndexedDB eviction notes) or a blocked version upgrade — fails silently: the promise rejects, Svelte logs to the console, and the UI simply doesn't update, with no indication to the trainer that their class/shooter/preset was *not* actually saved. This directly conflicts with the project's stated core value that score/roster entry "must work correctly ... during a live tournament."
**Fix:** Wrap DB writes in `try/catch` and surface a visible error state (reusing the `errorFeedback` pattern already established in `PresetList.svelte`) consistently across all Phase 2 write paths.

### WR-05: Import re-validation only checks top-level field types, not nested shape

**File:** `src/lib/views/PresetList.svelte:136-151`
**Issue:** The post-import defensive check only validates that `p.name` is a string, `p.classes` is an array, `p.shootingLineCount` is a number, and `p.roundsConfig` is a non-null object:
```ts
.filter(
  (p) =>
    typeof p.name !== 'string' ||
    !Array.isArray(p.classes) ||
    typeof p.shootingLineCount !== 'number' ||
    typeof p.roundsConfig !== 'object' ||
    p.roundsConfig === null
)
```
It never validates the *items inside* `p.classes` (e.g., that each has a string `name`) or the fields inside `p.roundsConfig` (e.g., that `arrowsPerPasse`/`passesPerRound`/`numberOfRounds` are numbers). A hand-edited or corrupted-but-structurally-valid import JSON (e.g. `classes: [{"name": 123}]`) passes this check and gets persisted, then breaks any later code that assumes `ClassRecord.name` is always a string (e.g. `.trim()` calls, string rendering).
**Fix:** Validate the nested shape (each `classes[i].name` is a string, each `roundsConfig` numeric field is a finite number) as part of the same filter, not just the outer container types.

## Info

### IN-01: `assignShootersToLines` has no guard against `lineCount <= 0`

**File:** `src/lib/utils/shooterAutoAssignment.ts:15-28`
**Issue:** `(index % lineCount) + 1` divides by `lineCount` with no validation; a `lineCount` of `0` produces `NaN` line numbers. Currently unreachable because every caller clamps the line count to 1-10 via the UI (`Setup.svelte`'s `handleLineCountChange`, and the `?? 2` fallback used elsewhere), but the pure function itself has no defensive check, so a future caller (e.g. a bulk-import path) could silently produce `NaN` assignments.
**Fix:** Add an early guard, e.g. `if (lineCount < 1) return [];` or throw, to make the precondition explicit rather than implicit in every caller.

### IN-02: Manual shooting-line input has no upper-bound / range check against configured `lineCount`

**File:** `src/lib/components/ShooterForm.svelte:140-145`
**Issue:** The line-number input only sets `min="1"` with no `max`, and no validation against the currently configured `lineCount` is performed on submit. A trainer can type a line number that doesn't correspond to any configured shooting line (e.g. line `99` when only 2 lines exist) with no feedback.
**Fix:** Consider a soft warning (not necessarily a hard block, since manual override is intentional) when the entered value exceeds `lineCount`.

### IN-03: Loose `==` null/undefined check without an explanatory comment

**File:** `src/lib/components/ShooterForm.svelte:82`
**Issue:** `allShooters.filter((s) => s.lineAssignment == null)` intentionally matches both `null` and `undefined`, but the loose-equality operator is easy to misread as a mistake (and is called out generically as worth double-checking in this codebase's own review checklist).
**Fix:** Either use `s.lineAssignment === null || s.lineAssignment === undefined` or add a one-line comment noting the intentional dual-match, to avoid a future refactor "fixing" it into `===` and breaking the `undefined` case.

### IN-04: Hardcoded `NON_PRESET_TABLES` list will drift from the schema

**File:** `src/lib/views/PresetList.svelte:19`
**Issue:** `const NON_PRESET_TABLES = ['classes', 'shootingLines', 'rounds', 'shooters'];` is a hand-maintained mirror of every non-`presets` table in the Dexie schema. If a later phase adds a new table (e.g. `scores`) and this constant isn't updated in lockstep, `exportDB`/`importInto` will silently include/clear a table that should have been excluded from the preset export/import boundary.
**Fix:** Derive the skip list programmatically, e.g. `db.tables.map((t) => t.name).filter((n) => n !== 'presets')`, so it can't drift from the schema.

---

_Reviewed: 2026-07-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
