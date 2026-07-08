---
phase: 02-setup-registration
fixed_at: 2026-07-04T22:18:28Z
review_path: .planning/phases/02-setup-registration/02-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-07-04T22:18:28Z
**Source review:** .planning/phases/02-setup-registration/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 critical, 5 warning; fix_scope = critical_warning, Info findings excluded)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Preset import cap-at-8 logic deletes the newest presets instead of the oldest

**Files modified:** `src/lib/views/PresetList.svelte`
**Commit:** fb444cb
**Applied fix:** Sorted the import-cap comparator descending by `createdAt` (newest first) before slicing off index 8+, so the 8 retained presets are actually the most recently created ones, matching the documented intent and the `importSuccess` feedback shown to the trainer.

### CR-02: Deleting a class leaves shooters with a dangling `classId`, silently, with no warning

**Files modified:** `src/lib/components/ClassForm.svelte`, `src/lib/i18n/strings.de.ts`
**Commit:** 8549db0
**Applied fix:** `requestDelete` now checks `db.shooters.where('classId').equals(id).count()` before allowing a delete to proceed to confirmation. If shooters reference the class, the confirm-delete row is replaced with an explicit count-based warning (new `strings.setup.classDeleteBlocked` string) and the delete is blocked until the trainer reassigns/removes those shooters.

### CR-03: Loading a preset can silently reassign existing shooters to the wrong class via ID collision

**Files modified:** `src/lib/views/PresetList.svelte`
**Commit:** 705dd61
**Applied fix:** `confirmLoad` now strips `id` from every `preset.classes` entry before `bulkAdd`, so Dexie always allocates fresh auto-increment ids instead of trusting ids captured on a possibly different device/session. Before clearing, it records an old-id -> class-name map, then after the fresh ids are assigned it remaps any shooter's `classId` whose old class name still exists in the new preset to the new id — a shooter whose class no longer exists is left alone rather than silently repointed at an unrelated, same-numbered class (the exact collision bug being fixed).

### WR-01: `DropdownWithCustom` snaps out of custom-entry mode when the custom text is cleared to empty

**Files modified:** `src/lib/components/DropdownWithCustom.svelte`
**Commit:** bf2d4d5
**Applied fix:** Added a `lastEmittedValue` tracker updated by both `handleSelectChange` and `handleCustomInput`. The reset `$effect` now only forces `isCustom = false` when the incoming empty `value` does NOT match what the component itself last emitted — i.e. it still resets on a genuine external clear (e.g. after form submit resets the bound prop directly) but no longer resets when the empty value is just the echo of the user backspacing the custom field to ''.
**Note:** This is a state-tracking/logic fix (not a pure syntax change) — flagged for human verification per the reviewer's own edge-case reasoning; Tier 1/2 verification (re-read + `tsc --noEmit` + existing `ClassForm.test.ts` suite) passed, but the specific backspace-to-empty interaction is not covered by an automated test and should be manually confirmed in the running app.

### WR-02: `autoSuffixOnCollision` doesn't re-check the disambiguated name against the rest of the class list

**Files modified:** `src/lib/utils/classNameGenerator.ts`
**Commit:** ae4185e
**Applied fix:** Each semantic-disambiguator branch (distance / bowType / ageGroup) now builds its candidate name and checks it against the full `existingNames` set before returning; if that candidate is itself already taken, it falls through to the next disambiguator, and ultimately to the pre-existing numeric-suffix loop. Verified against the existing `classNameGenerator.test.ts` suite (all 3 `autoSuffixOnCollision` cases still pass) plus a targeted re-read; the reviewer's own 3-existing-class collision scenario is now handled correctly by the fallthrough.

### WR-03: `SetupRounds`'s custom-mode fields are persisted without validation

**Files modified:** `src/lib/views/SetupRounds.svelte`
**Commit:** 666959a
**Applied fix:** Added `isValidResolvedConfig()`, mirroring `Setup.svelte`'s shooting-line-count guard, validating `numberOfRounds` (1-20), `passesPerRound` (1-30), and `arrowsPerPasse` (1-20) are all integers in range. `save()` now returns early without writing to `db.rounds` if the resolved config fails this check, preventing an emptied number input (which Svelte's binding resolves to `NaN`) from being silently persisted.

### WR-04: Systemic missing error handling around Dexie writes

**Files modified:** `src/lib/components/ClassForm.svelte`, `src/lib/components/ShooterForm.svelte`, `src/lib/components/PresetSave.svelte`, `src/lib/views/PresetList.svelte`, `src/lib/components/AutoAssignModal.svelte`, `src/lib/views/Registration.svelte`, `src/lib/i18n/strings.de.ts`
**Commit:** 22db901
**Applied fix:** Added a shared `strings.common.saveError` message and wrapped every previously-unguarded async Dexie write in try/catch across all six cited components/views (`ClassForm.addClass`/`confirmDelete`, `ShooterForm.handleSubmit`'s edit path, `PresetSave.performSave`, `PresetList.confirmLoad`/`confirmDelete`, `AutoAssignModal.handleSave`, `Registration.deleteShooter`), rendering the caught error inline (reusing the existing `errorFeedback` text style already established in `PresetList.svelte`) instead of failing silently.

### WR-05: Import re-validation only checks top-level field types, not nested shape

**Files modified:** `src/lib/views/PresetList.svelte`
**Commit:** df3460a
**Applied fix:** Added `isValidPresetRecord()`, which extends the existing outer-container-type check with nested validation: every `classes[i].name` must be a string, and every `roundsConfig` numeric field (`arrowsPerPasse`, `passesPerRound`, `numberOfRounds`) must be a finite number. A structurally-valid-but-corrupted import (e.g. `classes: [{"name": 123}]`) is now caught and the record is deleted in the same post-import defensive sweep, rather than being persisted and silently breaking later code that assumes `ClassRecord.name` is always a string.

## Skipped Issues

None — all 8 in-scope findings (CR-01 through CR-03, WR-01 through WR-05) were fixed. Info findings (IN-01 through IN-04) were out of scope for this run (`fix_scope: critical_warning`) and were not attempted.

## Verification Notes

- Every fix was re-read in place (Tier 1) after editing.
- TypeScript syntax/type checking (`npx tsc --noEmit -p tsconfig.app.json`) was run after each fix; no new errors were introduced in any modified file (Tier 2).
- The full Vitest unit/component suite (`npx vitest run`, 10 test files / 34 tests) was run after all fixes were applied and passes cleanly, including the pre-existing `PresetList.test.ts`, `ClassForm.test.ts`, `SetupRounds.test.ts`, `classNameGenerator.test.ts`, `PresetSave.test.ts`, and `ShooterForm.test.ts` suites that exercise the fixed code paths.
- WR-01 (`DropdownWithCustom`) is flagged above as requiring human/manual verification of the specific backspace-to-empty interaction, since no automated test currently exercises that exact sequence.
- The Playwright e2e suite (`e2e/presetExportImport.spec.ts`) was not run (out of scope for this fixer's syntax/component-level verification tier; excluded from Vitest by `vitest.config.ts`).

---

_Fixed: 2026-07-04T22:18:28Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
