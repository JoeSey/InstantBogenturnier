---
phase: 3
slug: score-entry
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.9 + @testing-library/svelte 5.4.2 (+ @playwright/test 1.61.1 for e2e) |
| **Config file** | `vitest.config.ts` (exists from Phase 1) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30s quick / ~2min full (incl. Playwright e2e) |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | TBD | 0 | SCORE-01 | — | Score value whitelist (0-10, X, M only) | component | `npm test -- lib/views/ScoreEntry.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | TBD | 0 | SCORE-02 | — | M counted as 0 in sum | unit | `npm test -- lib/utils/scoreCompletion.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | TBD | 0 | SCORE-03 | — | Autosave-per-cell survives reload/close | e2e | `npm run test:e2e -- scoring.spec.ts` | ❌ W0 | ⬜ pending |
| 03-01-04 | TBD | 0 | SCORE-04 | — | Column-header sort toggles correctly | component | `npm test -- lib/views/ScoreEntry.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-05 | TBD | 0 | SCORE-05 | — | Entries remain editable pre-finalize | unit + e2e | `npm test -- lib/utils/scoreCompletion.test.ts` + `npm run test:e2e` | ❌ W0 | ⬜ pending |
| 03-01-06 | TBD | 0 | SCORE-06 | — | `allScoresEntered()` gates [Abschließen] | unit | `npm test -- lib/utils/scoreCompletion.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-07 | TBD | 0 | SCORE-07 | — | Finalized entries locked, no edit path | component + e2e | `npm test -- lib/views/ScoreEntry.test.ts` + `npm run test:e2e` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/utils/scoreCompletion.test.ts` — test `allScoresEntered()` edge cases (empty shooters, partial rounds, multi-passe scenarios)
- [ ] `src/lib/utils/sortComparators.test.ts` — test sort-by-column functions (line, name, class, sum) with ties and edge cases
- [ ] `src/lib/views/ScoreEntry.test.ts` — component tests for table rendering, sort interaction, tap-button integration, autosave side effects
- [ ] `e2e/scoring.spec.ts` — e2e tests for SCORE-03 (autosave on close/reload), finalization lock, offline mode
- [ ] `src/lib/db/testHelpers.ts` — extend `resetDb()` to clear the new `scores` table

---

## Manual-Only Verifications

*None — all phase behaviors have automated verification (unit, component, or e2e).*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
