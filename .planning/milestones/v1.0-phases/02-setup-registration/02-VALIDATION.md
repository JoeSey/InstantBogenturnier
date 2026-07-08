---
phase: 2
slug: setup-registration
status: verified
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (unit), @testing-library/svelte 5.4.2 (component), @playwright/test 1.61.1 (e2e) |
| **Config file** | `vitest.config.ts` (extends Vite config) |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test:all` |
| **Estimated runtime** | ~2 min (full suite incl. e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit/component); 120 seconds (full suite)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T2 | 02-01 | 1 | SETUP-01 | T-02-01 | Class form accepts age-group/bow-type/distance with custom escape hatch; requires at least one field before save | component | `npm run test -- src/lib/components/ClassForm.test.ts` | ✅ | ✅ green |
| 02-01-T1 | 02-01 | 1 | SETUP-02 | — | Class name suggestion generated from tuple; collision auto-suffixed | unit | `npm run test -- src/lib/utils/classNameGenerator.test.ts src/lib/db/schema.test.ts` | ✅ | ✅ green |
| 02-02-T1 | 02-02 | 2 | SETUP-03 | T-02-04, T-02-05 | Shooting line count persists to DB, clamped 1-10 | unit | `npm run test -- src/lib/db/schema.test.ts` | ✅ | ✅ green |
| 02-02-T2 | 02-02 | 2 | SETUP-04 | T-02-04, T-02-05 | WA presets load; custom rounds/passes config saves, bounds-validated | component | `npm run test -- src/lib/views/SetupRounds.test.ts src/lib/db/schema.test.ts` | ✅ | ✅ green |
| 02-04-T1 | 02-04 | 3 | SETUP-05 | — | Preset save with name, capacity indicator (cap 8), collision overwrite confirm | component | `npm run test -- src/lib/components/PresetSave.test.ts` | ✅ | ✅ green |
| 02-04-T2 | 02-04 | 3 | SETUP-06 | T-02-08, T-02-09 | Preset load/delete/export/import round trip; defensive validation + 8-item cap on import | integration + e2e | `npm run test -- src/lib/views/PresetList.test.ts && npm run test:e2e -- presetExportImport` | ✅ | ✅ green |
| 02-03-T2 | 02-03 | 2 | REG-01 | T-02-06 | Shooter form accepts name, class (dropdown), optional line (dropdown); auto-assign modal preview | component | `npm run test -- src/lib/components/ShooterForm.test.ts` | ✅ | ✅ green |
| 02-03-T1 | 02-03 | 2 | REG-02 | — | AB/AB-CD mode computed from shooter count vs. line count, updates live; round-robin auto-assignment | unit | `npm run test -- src/lib/utils/modeDetection.test.ts src/lib/utils/shooterAutoAssignment.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Also present, not requirement-mapped: `02-01-T0` (blocking human-verify checkpoint approving `fake-indexeddb` before install) — resolved, confirmed in `02-01-SUMMARY.md`.*

---

## Wave 0 Requirements

- [ ] `src/lib/components/ClassForm.test.ts` — covers SETUP-01, SETUP-02 (form input, name generation, collision detection)
- [ ] `src/lib/components/ShooterForm.test.ts` — covers REG-01 (name, class, line input)
- [ ] `src/lib/components/PresetSave.test.ts` — covers SETUP-05 (save, collision prompt, overwrite)
- [ ] `src/lib/views/PresetList.test.ts` — covers SETUP-06 (load, delete, export/import UI)
- [ ] `src/lib/views/SetupRounds.test.ts` — covers SETUP-04 (WA preset selection, custom config)
- [ ] `src/lib/utils/classNameGenerator.test.ts` — covers SETUP-02 (name generation from tuple, suffix logic)
- [ ] `src/lib/utils/modeDetection.test.ts` — covers REG-02 (mode threshold, live derivation)
- [ ] `src/lib/db/schema.test.ts` — covers SETUP-03 (shooting line count persistence, schema integrity)
- [ ] `src/lib/utils/shooterAutoAssignment.test.ts` — covers REG-01 (auto-assignment balancing, round-robin)
- [ ] `src/lib/e2e/presetExportImport.spec.ts` — covers SETUP-05/06 (export/import full workflow)
- [ ] Shared Dexie test DB fixture / transaction cleanup helper

*Framework already installed in Phase 1 (Vitest, @testing-library/svelte, @playwright/test) — Wave 0 adds test files only, no tooling install.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-07-05

---

## Validation Audit 2026-07-05

| Metric | Count |
|--------|-------|
| Requirements checked | 8 |
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 8 requirement test files existed and passed on full-suite run: `npm run test` (34/34 unit + component tests green) and `npm run test:e2e` (13/13 e2e tests green, incl. `presetExportImport.spec.ts`). No auditor spawn needed — reconstructed and confirmed directly from PLAN/SUMMARY artifacts and a live test run.
