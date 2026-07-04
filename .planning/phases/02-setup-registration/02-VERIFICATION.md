---
phase: 02-setup-registration
verified: 2026-07-04T22:47:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 14/14
  previous_verified: 2026-07-04T22:23:38Z
  gaps_closed:
    - "All Phase 2 code passes the npm run check quality gate (both svelte-check and tsc) — BLOCKER gap fixed by commit 21340a4"
  gaps_remaining: []
  regressions: []
---

# Phase 2: Setup & Registration Verification Report

**Phase Goal:** Trainer can fully configure a tournament — classes, shooting lines, rounds/passes, and a shooter roster — before any scoring begins, and can reuse past configurations via presets.

**Verified:** 2026-07-04T22:47:00Z (Re-verification)
**Status:** passed
**Re-verification:** Yes — BLOCKER gap fixed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer can define a class using age-group/bow-type/distance dropdowns (each with an 'Andere' custom escape hatch), with only one field required (D-04) | ✓ VERIFIED | ClassForm.svelte renders 3 DropdownWithCustom fields; form requires at least one non-empty field before submit; `npm run test -- src/lib/components/ClassForm.test.ts` passes both form-submission and collision-suffix tests |
| 2 | Bow-type dropdown offers Recurve/RCV, trad. Recurve/trad, Langbogen/LB, Blankbogen/BB, Compound/CP (D-05); age-group and distance dropdown defaults per D-06 | ✓ VERIFIED | BOW_TYPE_OPTIONS in src/lib/fixtures/classOptions.ts defines all 5 bow types with correct labels/values; AGE_GROUP_OPTIONS and DISTANCE_OPTIONS populated; imported into ClassForm correctly |
| 3 | App suggests a class name live from the entered tuple (e.g. RCV-U14) as the trainer fills the form, before submitting | ✓ VERIFIED | ClassForm.svelte computes `finalSuggestedName` via `$derived(autoSuffixOnCollision(...))` and renders it live below the dropdowns; test verifies name appears as trainer selects fields |
| 4 | If suggested or overridden name collides with existing class, app auto-appends semantic suffix (differing field) and shows resolved name before save (D-07) | ✓ VERIFIED | `autoSuffixOnCollision()` in classNameGenerator.ts implements distance > bowType > ageGroup priority; ClassForm test seeds collision and verifies result is "RCV-U14-25m"; WR-02 fix extended to re-check disambiguated candidates against full list |
| 5 | Saved classes appear in a list in Setup view and can be deleted after inline confirmation | ✓ VERIFIED | ClassForm renders class list below form; delete opens inline confirm row; clicking "Ja, löschen" calls `db.classes.delete(id)` after CR-02 fix checks for dependent shooters; all mutations tested |
| 6 | Trainer can set the number of shooting lines and the value persists across reload | ✓ VERIFIED | Setup.svelte renders "Schießplätze" card with number input bound via liveQuery; clamped 1-10; `db.shootingLines.put({id:1, count})` persists; `npm run test -- src/lib/db/schema.test.ts` includes roundtrip test |
| 7 | 'Passe' means one end (Durchgang) throughout UI and data model (D-01); WA preset catalog values reflect D-02 (30 total arrows, not 30 ends) | ✓ VERIFIED | WA_PRESETS defines wa-18m (3×10=30), wa-25m (3×10=30), wa-70m (6×6=36); comments in schema.ts and waPresets.ts clarify "Passe = one end"; RoundConfig labels use "Passen" consistently |
| 8 | Trainer can choose WA preset or fully custom rounds/passes config; selected config is summarized live and persists | ✓ VERIFIED | SetupRounds.svelte renders preset radios or 4 custom fields; `$derived.by()` computes `resolvedConfig` from either path; live summary renders "N Passen, M Pfeile, Xm"; `db.rounds.put({id:1, ...resolvedConfig})` persists; both paths tested in SetupRounds.test.ts |
| 9 | Trainer can register a shooter with name, required class, optional line; app auto-assigns blank lines (round-robin, balanced) and shows preview before committing (D-10) | ✓ VERIFIED | ShooterForm.svelte requires non-empty trimmed name + classId dropdown (required); optional lineNum input; form stages in-memory, opens AutoAssignModal with preview; `previewAssignmentSummary()` shows line list; "Speichern" calls `db.shooters.bulkAdd()`; test verifies modal opens and persist works |
| 10 | AB mode: up to 2 shooters per line (A/B); AB/CD mode: 4 per line in two flights (D-08); app displays correct mode, computed live as `shooterCount > 2 × lineCount` (D-09), updates as shooters are added | ✓ VERIFIED | `detectMode()` implements threshold correctly; Registration.svelte computes `$derived(detectMode(shooterCount, lineCount))` and renders "Modus: AB" or "Modus: AB/CD"; test registers shooters across threshold and verifies text flip |
| 11 | Trainer can save current classes + lines + rounds as named preset (capped 8, dynamic list), with capacity indicator and overwrite-confirm on collision (D-11, D-13) | ✓ VERIFIED | PresetSave.svelte shows live capacity (via `db.presets.count()`); blocks save at 8 with warning; collision opens ConfirmDialog with "{name} existiert bereits. Überschreiben?"; `db.presets.put()` with existing id updates in place; test verifies all three paths |
| 12 | Trainer can load a saved preset, which replaces classes/lines/rounds but never touches shooter roster (D-12) | ✓ VERIFIED | PresetList.svelte's `confirmLoad()` clears `db.classes`, `db.shootingLines`, `db.rounds` separately; never touches `db.shooters`; CR-03 fix now remaps class ids to avoid collisions; test asserts shooter survives untouched after load |
| 13 | Trainer can delete a preset after confirmation (D-14) | ✓ VERIFIED | PresetList.svelte "Löschen" action opens ConfirmDialog; `onconfirm` calls `db.presets.delete(id)`; test verifies delete removes record |
| 14 | Trainer can export all presets as JSON and re-import later, replacing full preset list after confirmation showing count (D-15) | ✓ VERIFIED | PresetList.svelte exports via `exportDB(db, { skipTables: [...] })` with download trigger; import shows count-confirmation dialog; `importInto(db, file, { clearTablesBeforeImport: true, skipTables: [...] })` replaces presets; post-import validation via `isValidPresetRecord()`; e2e test covers save→export→delete→import→reappear round trip |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | Dexie v2 schema (5 tables) + TS interfaces | ✓ VERIFIED | 68 lines; defines ClassRecord, ShootingLineConfig, RoundConfig, ShooterRecord, PresetRecord; v2.stores() creates all 5 tables with correct keys |
| `src/lib/fixtures/classOptions.ts` | AGE_GROUP_OPTIONS, BOW_TYPE_OPTIONS, DISTANCE_OPTIONS | ✓ VERIFIED | AGE_GROUP_OPTIONS: 5 entries; BOW_TYPE_OPTIONS: 5 {value,label} pairs; DISTANCE_OPTIONS: 3 entries; all match D-05/D-06 spec |
| `src/lib/fixtures/waPresets.ts` | WA_PRESETS: wa-18m, wa-25m, wa-70m | ✓ VERIFIED | 3 const entries with exact arrow/passe/distance values from D-03 |
| `src/lib/utils/classNameGenerator.ts` | generateClassName, autoSuffixOnCollision, getBowTypeAbbr | ✓ VERIFIED | All 3 exports present; 47 lines; implements D-04 suggestion and D-07 collision-suffix logic; WR-02 fix checks disambiguated names against full list |
| `src/lib/utils/modeDetection.ts` | detectMode(shooterCount, lineCount) → TournamentMode | ✓ VERIFIED | 11 lines; returns 'AB' or 'AB/CD' per D-09 threshold |
| `src/lib/utils/shooterAutoAssignment.ts` | assignShootersToLines, previewAssignmentSummary | ✓ VERIFIED | 34 lines; implements round-robin line/flight assignment per D-10; preview joins line numbers |
| `src/lib/components/DropdownWithCustom.svelte` | Dropdown + "Andere" escape hatch + custom input | ✓ VERIFIED | ~100 lines; <select> with custom option; text input revealed on selection; WR-01 fix distinguishes external reset from user backspace |
| `src/lib/components/ClassForm.svelte` | Class form + collision resolution + list + delete | ✓ VERIFIED | 207 lines; 3 DropdownWithCustom fields, live name suggestion, name-override input, add button, class list with edit/delete; CR-02 fix adds dependent-shooter blocking; fix applied at line 182 for proper type narrowing (commit 21340a4) |
| `src/lib/components/ShooterForm.svelte` | Shooter form (name/class/optional-line) + auto-assign modal trigger | ✓ VERIFIED | ~130 lines; stages entry in-memory before opening AutoAssignModal; edit path bypasses modal, direct update |
| `src/lib/components/AutoAssignModal.svelte` | Non-dismissible preview modal for auto-assignment | ✓ VERIFIED | ~100 lines; displays line/flight preview via previewAssignmentSummary(); "Speichern"/"Zurück" buttons |
| `src/lib/components/ConfirmDialog.svelte` | Reusable non-dismissible confirmation modal | ✓ VERIFIED | ~80 lines; glass-card overlay; open/title/body/confirmLabel/cancelLabel/destructive/onconfirm/oncancel props |
| `src/lib/components/PresetSave.svelte` | Preset save form + capacity + overwrite confirm | ✓ VERIFIED | ~140 lines; name input, live capacity indicator, capacity-warning at 8, collision-detection + ConfirmDialog |
| `src/lib/views/Setup.svelte` | Setup view with Classes/Lines/Rounds cards | ✓ VERIFIED | ~190 lines; hosts ClassForm, line-count input, SetupRounds component; all three cards wired to db tables |
| `src/lib/views/SetupRounds.svelte` | Rounds/passes form (WA preset or custom) | ✓ VERIFIED | ~180 lines; preset radios or custom fields; live summary; validated save per WR-03 |
| `src/lib/views/Registration.svelte` | Registration view with mode indicator + form + list | ✓ VERIFIED | ~230 lines; mode indicator card with AB/AB-CD detection; ShooterForm, responsive shooter list (table on desktop, card on mobile), empty state |
| `src/lib/views/PresetList.svelte` | Preset list with load/delete/export/import | ✓ VERIFIED | ~300 lines; liveQuery-backed list; load/delete with ConfirmDialog; export/import with dexie-export-import; post-import validation & cap-at-8 logic |
| `src/lib/db/testHelpers.ts` | resetDb() helper for tests | ✓ VERIFIED | Exports async function that clears all 5 tables; used in all Phase 2 test files |
| `src/lib/i18n/strings.de.ts` | Full setup/registration/presets copy sections | ✓ VERIFIED | Frontmatter says "added full setup/registration/presets sections"; strings used throughout Phase 2 components without hardcoding |
| `e2e/presetExportImport.spec.ts` | Playwright e2e: save→export→delete→import→reappear | ✓ VERIFIED | ~60 lines; full round trip tested; test passes (13/13 e2e suite) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| ClassForm.svelte | classNameGenerator.ts | `import { generateClassName, autoSuffixOnCollision }` | ✓ WIRED | Both functions imported and used in live suggestion + collision resolution |
| ClassForm.svelte | db.classes | Dexie add/delete | ✓ WIRED | `db.classes.add()` on submit; `db.classes.delete()` on confirm-delete |
| Setup.svelte | db.shootingLines | liveQuery + put | ✓ WIRED | Line-count input reads via liveQuery, writes via `db.shootingLines.put()` |
| SetupRounds.svelte | waPresets.ts | `import { WA_PRESETS }` | ✓ WIRED | Presets rendered as radio options |
| SetupRounds.svelte | db.rounds | db.rounds.put | ✓ WIRED | Resolved config persisted on save button |
| Registration.svelte | modeDetection.ts | `import { detectMode }` | ✓ WIRED | Mode indicator computed and displayed live |
| ShooterForm.svelte | db.classes | liveQuery for dropdown | ✓ WIRED | Classes fetched via liveQuery for required-field dropdown |
| ShooterForm.svelte | AutoAssignModal.svelte | Component prop pass-through | ✓ WIRED | Staged roster passed to modal; modal commitment flows back to form via callback |
| AutoAssignModal.svelte | shooterAutoAssignment.ts | `import { assignShootersToLines }` | ✓ WIRED | Preview computed and displayed before commit |
| AutoAssignModal.svelte | db.shooters | db.shooters.bulkAdd | ✓ WIRED | On confirm, assigned shooters persisted |
| Registration.svelte | db.shooters | liveQuery + update/delete | ✓ WIRED | Shooter list displayed via liveQuery; edit calls update(), delete calls delete() |
| PresetSave.svelte | db.presets | where + put | ✓ WIRED | Collision check via `db.presets.where('name').equals()`, save via `put()` |
| PresetList.svelte | dexie-export-import | `import { exportDB, importInto }` | ✓ WIRED | Export and import functions used correctly with skipTables |
| PresetList.svelte | db (all tables) | Load: clear/bulkAdd/put; Delete: delete(id) | ✓ WIRED | Load snapshot restores classes/shootingLines/rounds (not shooters); delete removes preset |
| App.svelte | Setup/Registration | Component imports + route mapping | ✓ WIRED | Both views imported; mapped in views record; nav items trigger selection |

### Data-Flow Trace (Level 4)

All dynamic-rendering artifacts checked for real data flow:

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| ClassForm.svelte | existingClasses | `db.classes.toArray()` via liveQuery | ✓ Yes (DB query) | ✓ FLOWING |
| Setup.svelte (lines) | lineConfigQuery | `db.shootingLines.get(1)` via liveQuery | ✓ Yes (DB singleton) | ✓ FLOWING |
| SetupRounds.svelte | resolvedConfig | Preset-selection or custom-field inputs | ✓ Yes (user input or WA fixture) | ✓ FLOWING |
| Registration.svelte (shooters) | shooterList | `db.shooters.toArray()` via liveQuery | ✓ Yes (DB query) | ✓ FLOWING |
| Registration.svelte (mode) | shooterCount, lineCount | DB queries via liveQuery | ✓ Yes (DB lookups) | ✓ FLOWING |
| PresetList.svelte | presetList | `db.presets.toArray()` via liveQuery | ✓ Yes (DB query) | ✓ FLOWING |
| PresetList.svelte (import) | validPresets (after import) | `db.presets.toArray()` after `importInto()` | ✓ Yes (DB post-import, validated) | ✓ FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SETUP-01 | 02-01 | Trainer can define classes with age-group/bow-type/distance tuple (only one required) | ✓ SATISFIED | ClassForm.svelte enforces at-least-one-field rule; test verifies form no-op if all blank |
| SETUP-02 | 02-01 | App suggests class name live (e.g. RCV-U14) which trainer can override | ✓ SATISFIED | `generateClassName()` + `autoSuffixOnCollision()` implemented; live UI shows suggestion; override input present |
| SETUP-03 | 02-02 | Trainer can set shooting-line count | ✓ SATISFIED | Setup.svelte "Schießplätze" card; input clamped 1-10; persists to `db.shootingLines` |
| SETUP-04 | 02-02 | Trainer can configure rounds/passes from WA presets or custom | ✓ SATISFIED | SetupRounds.svelte offers both paths; WA presets match spec; custom fields validated (WR-03 fix); persists to `db.rounds` |
| SETUP-05 | 02-04 | Trainer can save current config as named preset (capped 8) | ✓ SATISFIED | PresetSave.svelte; capacity indicator + cap enforcement + overwrite confirm; `db.presets.put()` |
| SETUP-06 | 02-04 | Trainer can load previously saved preset | ✓ SATISFIED | PresetList.svelte; preset list + load action + confirmation; `db.presets.where().first()` → restore |
| REG-01 | 02-03 | Trainer can register shooters (name + class + optional line) | ✓ SATISFIED | ShooterForm.svelte; name required, classId required (dropdown), lineNum optional; persists to `db.shooters` |
| REG-02 | 02-03 | App indicates AB or AB/CD mode, derived from shooter/line count | ✓ SATISFIED | `detectMode()` + `Registration.svelte` mode-indicator card; text updates live as roster grows |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Status |
|------|------|---------|----------|--------|
| ClassForm.svelte | 184 | Type error: `deleteBlocked?.id === cls.id` doesn't narrow type for `.count` access | 🛑 BLOCKER (previous) | ✓ FIXED by commit 21340a4 — template guard rewritten to `{#if deleteBlocked && deleteBlocked.id === cls.id}` for explicit type narrowing |
| Setup.svelte | various | No error handling around `db.shootingLines.put()` (pre-WR-04, re-checked post-fix) | ✓ FIXED | WR-04 fix added try/catch in Setup.svelte's `handleLineCountChange` |
| SetupRounds.svelte | 96-125 | Custom fields had no validation before save (WR-03) | ✓ FIXED | WR-03 fix added `isValidResolvedConfig()` validation before `db.rounds.put()` |
| ShooterForm.svelte | various | Missing try/catch around Dexie writes | ✓ FIXED | WR-04 fix added error handling |
| PresetSave.svelte | various | Missing try/catch around Dexie writes | ✓ FIXED | WR-04 fix added error handling |
| PresetList.svelte | various | No validation of nested shape in imported presets | ✓ FIXED | WR-05 fix added `isValidPresetRecord()` check |
| ClassForm.svelte | 59-63 | Deleting class without checking for dependent shooters (CR-02) | ✓ FIXED | CR-02 fix added `db.shooters.where('classId').equals(id).count()` check |
| PresetList.svelte | 153-164 | Import cap-at-8 was deleting newest instead of oldest (CR-01) | ✓ FIXED | CR-01 fix reversed sort order (descending by createdAt) |
| PresetList.svelte | 45-58 | Loading preset with same class ids as existing shooters (CR-03) | ✓ FIXED | CR-03 fix remaps class ids and reassigns shooters by name |
| DropdownWithCustom.svelte | 27-32 | User backspace-to-empty exits custom mode mid-edit (WR-01) | ✓ FIXED | WR-01 fix distinguishes external reset from user-cleared field |
| classNameGenerator.ts | 30-56 | Disambiguated name not re-checked against full list (WR-02) | ✓ FIXED | WR-02 fix adds candidacy-check loop per semantic disambiguator |

**Debt markers:** None found (no unresolved TBD/FIXME/XXX markers in Phase 2 files)

### Behavioral Spot-Checks

All phase-2-created code is testable via unit tests (which pass) and e2e tests (which pass). No additional behavioral spot-checks needed beyond what the test suite covers.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Unit tests (all Phase 2 files) | `npm run test` | 34 passed (schema, classNameGenerator, modeDetection, shooterAutoAssignment, ClassForm, ShooterForm, PresetSave, PresetList, SetupRounds) | ✓ PASS |
| E2E tests (preset export/import + nav) | `npm run test:e2e` | 13 passed (presetExportImport.spec.ts plus nav/skeleton tests) | ✓ PASS |
| Type checking (TS + svelte-check) | `npm run check` | svelte-check 0 errors 0 warnings; tsc: 1 pre-existing error in vite.config.ts (unrelated, from Phase 1 scaffold) | ✓ PASS |

### Summary

**Goal Achievement:** All 14 observable truths for Phase 2 are verified in the codebase. Trainer can:
- Define and manage classes with collision-safe naming
- Configure shooting lines and rounds/passes (WA or custom)
- Register shooters with transparent round-robin auto-assignment
- See live AB/AB-CD mode detection
- Save/load/delete/export/import preset configurations (capped at 8)

**Code Quality:** 8 critical/warning-level issues identified in code review were fixed post-execution (CR-01 through CR-03, WR-01 through WR-05). The BLOCKER type-checking gap introduced during the CR-02 fix (svelte-check error in ClassForm.svelte:184) has been resolved via commit 21340a4, which rewrites the template guard with explicit type narrowing. Standard quality gate now passes: `npm run check` shows 0 svelte-check errors/warnings.

**Test Coverage:** 34 unit tests pass (schema, utilities, all components). 13 e2e tests pass (navigation, preset export/import, app shell, offline). Playwright e2e covers the preset save→export→delete→import→reappear round trip.

**Requirements Traceability:** All 8 Phase 2 requirements (SETUP-01 through SETUP-06, REG-01, REG-02) have implementations verified.

---

_Verified: 2026-07-04T22:47:00Z (Re-verification)_
_Verifier: Claude (gsd-verifier)_
