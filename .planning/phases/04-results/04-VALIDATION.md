---
phase: 4
slug: results
status: draft
nyquist_compliant: false
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
| 04-01-01 | 01 | 0 | RES-01/RES-02 | — | N/A | unit | `npx vitest run src/lib/utils/ranking.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | RES-06 | T-4-01 | Guard is UX-only, not a security boundary (single trusted device) | unit | `npx vitest run src/lib/utils/scoreCompletion.test.ts -t "computeIsFinalized"` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | RES-01/RES-02/RES-03 | — | N/A | unit | `npx vitest run src/lib/views/Results.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | RES-03/RES-04 | — | N/A | e2e | `npx playwright test e2e/results.spec.ts -g "phone|desktop"` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | RES-05 | T-4-03 | Atomic `db.transaction('rw', shooters, scores)` prevents orphaned records on interruption | unit + e2e | `npx vitest run src/lib/views/Results.test.ts -t "reset"` / `npx playwright test e2e/results.spec.ts -g "reset"` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 1 | RES-06 | T-4-01 / T-4-02 | Reset confirmation reuses non-dismissible `ConfirmDialog` (D-09); guard blocks delete/config-edit while finalized | unit | `npx vitest run src/lib/views/Registration.test.ts -t "finalized"` | ❌ W0 (new file) | ⬜ pending |

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

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
