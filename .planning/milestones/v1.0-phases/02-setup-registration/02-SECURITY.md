---
phase: 02
slug: setup-registration
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-05
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Trainer input → ClassForm state → db.classes | Untrusted free-text enters via "Andere" custom dropdowns and the name-override field | Class tuple (ageGroup/bowType/distance) + custom name string |
| Trainer input → ShooterForm state → db.shooters | Untrusted shooter names/class refs/line numbers enter via free text and dropdown | Shooter name, classId, lineAssignment |
| Trainer numeric input → db.shootingLines / db.rounds | Untrusted numeric entry feeds tables that Phase 3/4 read to build score-entry tables | Line count, rounds/passes/arrows config |
| Imported JSON file → dexie-export-import → IndexedDB | A file selected by the trainer is parsed and written directly into IndexedDB via a third-party library, bypassing the app's own form-level validation | Preset records (name, classes, shootingLineCount, roundsConfig) |
| npm install of new/unaudited dependencies (fake-indexeddb, dexie-export-import) | Third-party supply-chain surface introduced during Phase 2 | Build/test tooling and runtime import/export logic |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-01 | Tampering | ClassForm.svelte (ageGroup/bowType/distance/name-override inputs) | mitigate | At least one tuple field required before save (`ClassForm.svelte:31`); name-override capped at `maxlength="50"` (`ClassForm.svelte:133`); no `{@html}` used anywhere in `src/` — Svelte's default template interpolation auto-escapes `{cls.name}` (`ClassForm.svelte:181`), preventing stored-markup injection | closed |
| T-02-02 | Repudiation | Class create/delete actions | accept | Documented below in Accepted Risks Log | closed |
| T-02-03 | Information Disclosure | IndexedDB-stored class records | accept | Documented below in Accepted Risks Log | closed |
| T-02-SC-01 | Tampering | npm install of `fake-indexeddb` (new, unaudited dependency) | mitigate | `02-01-PLAN.md` Task 0 is a `type="checkpoint:human-verify" gate="blocking-human"` task requiring explicit human approval of the npm registry review before Task 1 may run `npm install`; `02-01-SUMMARY.md` confirms the checkpoint was resolved ("Task 0 checkpoint was pre-approved by the human before this run started"); `fake-indexeddb` verified present only in `package.json` `devDependencies` (not shipped to production) | closed |
| T-02-04 | Tampering | Shooting-line count & rounds/passes numeric inputs | mitigate | `Setup.svelte:17` clamps line count to `Number.isInteger(value) && value >= 1 && value <= 10` before `db.shootingLines.put`; `SetupRounds.svelte`'s `isValidResolvedConfig()` (lines 46-58) enforces `numberOfRounds` 1-20, `passesPerRound` 1-30, `arrowsPerPasse` 1-20, all integer, before `db.rounds.put` — bounds checked in JS, not just HTML `min`/`max` hints | closed |
| T-02-05 | Denial of Service | Unbounded numeric inputs (e.g. entering 999999 passes) | mitigate | Same bounds validation as T-02-04 (`Setup.svelte:17`, `SetupRounds.svelte:46-58`) caps values to reasonable competition ranges, preventing a runaway score-entry table | closed |
| T-02-06 | Tampering | ShooterForm.svelte (name, classId, lineAssignment inputs) | mitigate | `ShooterForm.svelte:69` requires non-empty trimmed name and non-empty `classId` (silent no-op otherwise); `classId` is populated exclusively from a `<select>` bound to `liveQuery(() => db.classes.toArray())` (lines 30-31, 139-147), so only existing `db.classes` ids are selectable; no `{@html}` used — shooter names rendered via default auto-escaping | closed |
| T-02-07 | Information Disclosure | AB/AB-CD mode & auto-assignment algorithm exposed in UI | accept | Documented below in Accepted Risks Log | closed |
| T-02-08 | Tampering | Imported JSON file (`importDB`/`importInto`) can write arbitrary/malformed records directly into IndexedDB, bypassing form-level validation | mitigate | `PresetList.svelte:204-245` wraps `importInto()` in try/catch; `isValidPresetRecord()` (lines 180-200) validates `name` is a string, `classes` is an array of objects with string `name`, `shootingLineCount` is a number, and `roundsConfig` is an object with finite numeric `arrowsPerPasse`/`passesPerRound`/`numberOfRounds`; invalid records are `bulkDelete`d (lines 211-218); `strings.presets.importError` surfaced on catch (lines 236-239) | closed |
| T-02-09 | Denial of Service | Oversized or malicious import file (e.g. thousands of fake presets) | mitigate | `PresetList.svelte:220-231` sorts valid presets by `createdAt` (newest first) and `bulkDelete`s everything past the first 8 after a successful import | closed |
| T-02-SC-04 | Tampering | npm install of `dexie-export-import` | accept | Documented below in Accepted Risks Log | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-02 | Single-device, single-operator tool with no accounts (per REQUIREMENTS.md "Out of Scope" — no athlete accounts, no multi-device); no audit trail needed for class create/delete actions. | Plan authors (02-01-PLAN.md threat_model) | 2026-07-04 |
| AR-02-02 | T-02-03 | IndexedDB-stored class records are local-only device storage, containing no PII beyond club-internal class labels, with no network exposure in this client-only app. | Plan authors (02-01-PLAN.md threat_model) | 2026-07-04 |
| AR-02-03 | T-02-07 | AB/AB-CD mode and the auto-assignment algorithm are purely local computational logic with no sensitive data; transparency of the algorithm to the trainer is an explicit UX requirement (02-RESEARCH.md Pitfall 4), not a security concern. | Plan authors (02-03-PLAN.md threat_model) | 2026-07-04 |
| AR-02-04 | T-02-SC-04 | `dexie-export-import` was already vetted `[OK]` in 02-RESEARCH.md's Package Legitimacy Audit table (official Dexie addon, 2+ years old, 100K+/week downloads); no additional blocking checkpoint was required before install, unlike the unaudited `fake-indexeddb` in Plan 01. Confirmed present in `package.json` dependencies at version `^4.4.0`, matching the audited entry. | Plan authors (02-04-PLAN.md threat_model) | 2026-07-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-05 | 11 | 11 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-05

---

## Unregistered Attack Surface (Informational)

No `## Threat Flags` sections were found in any of `02-01-SUMMARY.md`, `02-02-SUMMARY.md`, `02-03-SUMMARY.md`, or `02-04-SUMMARY.md` (confirmed via grep across all four files). No unregistered flags to report.

One item noted for awareness, not a threat-model gap: `PresetList.svelte`'s `confirmLoad()` (added as a deviation, not present in the original plan text) reconciles `shooters.classId` foreign keys after a preset load by matching class names between the old and new class sets. This is a data-integrity fix (CR-03) rather than a new attack surface — it operates only on already-trusted local data (the trainer's own prior classes/shooters), not on the untrusted import boundary, so it does not require a new threat entry.
