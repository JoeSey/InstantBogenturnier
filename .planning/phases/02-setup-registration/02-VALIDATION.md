---
phase: 2
slug: setup-registration
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| 02-0X-0X | TBD | TBD | SETUP-01 | — | Class form accepts age-group/bow-type/distance with custom escape hatch | component | `npm run test -- src/lib/components/ClassForm.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SETUP-02 | — | Class name suggestion generated from tuple; collision auto-suffixed | unit | `npm run test -- src/lib/utils/classNameGenerator.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SETUP-03 | — | Shooting line count persists to DB | unit | `npm run test -- src/lib/db/schema.test.ts -t "shootingLines"` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SETUP-04 | — | WA presets load; custom rounds/passes config saves | component | `npm run test -- src/lib/views/SetupRounds.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SETUP-05 | — | Preset save with name, checks collision, confirms overwrite | component | `npm run test -- src/lib/components/PresetSave.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | SETUP-06 | — | Preset load/delete removes old setup, applies selected preset | integration | `npm run test -- src/lib/views/PresetList.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | REG-01 | — | Shooter form accepts name, class (dropdown), optional line (dropdown) | component | `npm run test -- src/lib/components/ShooterForm.test.ts` | ❌ W0 | ⬜ pending |
| 02-0X-0X | TBD | TBD | REG-02 | — | AB/AB-CD mode computed from shooter count vs. line count, updates live | unit | `npm run test -- src/lib/utils/modeDetection.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs, plan IDs, and waves will be filled in by the planner once PLAN.md files are created.*

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
