---
phase: 4
slug: results
status: approved
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 (unit/component) + @testing-library/svelte 5.4.2 + Playwright 1.61.1 (e2e) — all already configured |
| **Config file** | `vitest.config.ts` (unit), `playwright.config.ts` (e2e) |
| **Quick run command** | `npm run test -- ranking` |
| **Full suite command** | `npm run test:all` (`npm run test && npm run test:e2e`) |
| **Estimated runtime** | ~30 seconds (unit) + ~60 seconds (e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test -- <touched-file-pattern>`
- **After every plan wave:** Run `npm run test:all`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-1 | 01 | 1 | RES-01/RES-02 | — | N/A | unit | `npx vitest run src/lib/utils/ranking.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-2 | 01 | 1 | RES-01/RES-02 | — | N/A | unit | `npx vitest run src/lib/components/ResultsTable.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-3 | 01 | 1 | RES-03/RES-04 | — | N/A | unit + e2e | `npx vitest run src/lib/views/Results.test.ts && npx playwright test e2e/results.spec.ts -g "phone\|desktop"` | ❌ W0 | ⬜ pending |
| 04-02-1 | 02 | 2 | RES-05 | T-4-03 | Atomic `db.transaction('rw', shooters, scores)` prevents orphaned records on interruption | unit | `npx vitest run src/lib/views/Results.test.ts -t "reset"` | ❌ W0 | ⬜ pending |
| 04-02-2 | 02 | 2 | RES-05 | T-4-03 | Reset confirmation reuses non-dismissible `ConfirmDialog` (D-09) | unit + e2e | `npx vitest run src/lib/views/Results.test.ts -t "reset" && npx playwright test e2e/results.spec.ts -g "reset"` | ❌ W0 | ⬜ pending |
| 04-03-1 | 03 | 2 | RES-06 | T-4-01 | Guard is UX-only, not a security boundary (single trusted device) | unit | `npx vitest run src/lib/utils/scoreCompletion.test.ts -t "computeIsFinalized" && npx vitest run src/lib/views/ScoreEntry.test.ts` | ❌ W0 | ⬜ pending |
| 04-03-2 | 03 | 2 | RES-06 | T-4-01 / T-4-02 | Guard blocks delete-shooter while finalized | unit | `npx vitest run src/lib/views/Registration.test.ts -t "finalized"` | ❌ W0 (new file) | ⬜ pending |
| 04-03-3 | 03 | 2 | RES-06 | T-4-01 / T-4-02 | Guard blocks rounds/passes config edits and class edits while finalized | unit | `npx vitest run src/lib/views/SetupRounds.test.ts && npx vitest run src/lib/components/ClassForm.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/utils/ranking.test.ts` — covers RES-01/RES-02 (tie handling, skip-next rank assignment, incomplete-sum flag, alphabetical row tiebreak)
- [ ] `src/lib/utils/scoreCompletion.test.ts` — extend with `computeIsFinalized` cases (vacuous-false-when-empty, true-when-all-finalized, false-when-mixed)
- [ ] `src/lib/views/Results.test.ts` — new file; empty state, in-progress marker, dual-render class presence (`md:hidden` / `hidden md:grid`), reset confirm/cancel flow against `fake-indexeddb`
- [ ] `src/lib/views/Registration.test.ts` — new file (Registration.svelte currently has zero unit tests); required to cover RES-06's guard on the delete-shooter button
- [ ] `e2e/results.spec.ts` — new file; real-viewport breakpoint proof (375px dropdown-only, 1024px 1-2 col grid, 1440px 3-col grid) and full reset-flow-with-reload proof

---

## Manual-Only Verifications

*None — all phase behaviors have automated verification coverage per the Wave 0 plan above.*

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-07-05 (gsd-plan-checker Dimension 8 pass against final 04-01/04-02/04-03 PLAN.md structure)
