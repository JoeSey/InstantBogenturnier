---
phase: 01-foundation
plan: 02
subsystem: ui
tags: [svelte5, tailwindcss4, lucide, pwa, glassmorphism, responsive-nav, e2e]

# Dependency graph
requires:
  - phase: 01-foundation (plan 01)
    provides: Scaffolded Svelte 5 + Vite 8 PWA shell, FOUC-safe theming, strings.de.ts, updateBanner store, main.ts's updateSW export, .glass-surface utility
provides:
  - Responsive glass nav shell (BottomTabBar <768px, Sidebar >=768px), single 768px breakpoint switch
  - Four glass-styled "coming soon" placeholder sections (Einrichtung/Schuetzen/Erfassung/Ergebnisse)
  - Session-dismissible, user-gated update banner wired to the real updateSW/updateAvailable store
  - Reusable GlassCard and NavItem (with disabled/D-15 provision) primitives for Phases 2-4
  - Deterministic ?e2e=1 test hook pattern for flipping store state in Playwright without publishing two builds
affects: [phase-2-setup-registration, phase-3-score-entry, phase-4-results]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single Nav data source (items array) rendered by two mutually-exclusive components via flex md:hidden / hidden md:flex — never both interactive"
    - "NavItem disabled prop structurally present (D-15) even though unused until Phase 4 gates Ergebnisse"
    - "Sidebar icon-only rail below xl (1280px) via a per-consumer hideLabelBelowXl prop on the shared NavItem, so BottomTabBar's label is never affected"
    - "Deterministic E2E test hook gated behind an explicit ?e2e=1 query param (not import.meta.env.DEV, since Playwright tests run against the production vite preview build where DEV is false)"

key-files:
  created:
    - src/lib/components/GlassCard.svelte
    - src/lib/components/NavItem.svelte
    - src/lib/components/BottomTabBar.svelte
    - src/lib/components/Sidebar.svelte
    - src/lib/components/PlaceholderScreen.svelte
    - src/lib/components/UpdateBanner.svelte
    - src/lib/views/SetupPlaceholder.svelte
    - src/lib/views/RegistrationPlaceholder.svelte
    - src/lib/views/ScoringPlaceholder.svelte
    - src/lib/views/ResultsPlaceholder.svelte
    - e2e/nav.spec.ts
  modified:
    - src/App.svelte

key-decisions:
  - "Added data-testid=bottom-tab-bar / data-testid=sidebar-nav to the two nav <nav> elements for reliable E2E visibility assertions (both are always mounted, distinguished only by CSS display at the 768px breakpoint)"
  - "Wired the ?e2e=1 test hook inside App.svelte (not main.ts) to stay within this plan's declared files_modified scope — see Deviations"
  - "Sidebar's 72px icon-only rail collapses below xl/1280px per UI-SPEC; nav-label and section-switch E2E assertions therefore run at 1440px, while the 768px-breakpoint visibility assertion runs at the plan's specified 1024px (icon-only rail is still visible/interactive at that width, just narrower)"

patterns-established:
  - "Shared NavItem consumed by two structurally-different nav containers via prop-driven variation (hideLabelBelowXl), not duplicated markup"

requirements-completed: []  # PLAT-01/PLAT-02 not marked complete — Task 4 (human-verify checkpoint: real-device install + airplane-mode launch) has not yet been performed. See Checkpoint Status below.

# Metrics
duration: ~35min (Tasks 1-3 only; Task 4 checkpoint pending)
completed: 2026-07-04
---

# Phase 1 Plan 02: Responsive Glassmorphism Nav Shell Summary

**Responsive glass nav shell (bottom tab bar / sidebar switching at 768px) with four "coming soon" placeholder sections and a session-dismissible, user-gated PWA update banner — Tasks 1-3 complete and fully green; Task 4 (real-device install/offline checkpoint) is paused awaiting human verification.**

## Performance

- **Duration:** ~35 min (Tasks 1-3; Task 4 not started — requires human action)
- **Started:** 2026-07-04T06:XX:XXZ (session start, not precisely captured)
- **Completed (this session):** 2026-07-04T07:00:26Z
- **Tasks:** 3 of 4 completed (Task 4 is a `checkpoint:human-verify` gate, paused)
- **Files modified/created:** 12 (10 new components/views, 1 new E2E spec, 1 modified — App.svelte)

## Checkpoint Status

**PAUSED at Task 4: Human verification — install to device and launch offline.**

Tasks 1-3 are complete, committed, and fully verified by automation:
- `npm run build` exits 0, `npx svelte-check --threshold error` reports 0 errors.
- `npx playwright test` — 12/12 pass (7 new in `e2e/nav.spec.ts` + 5 pre-existing in `e2e/skeleton.spec.ts`).

Task 4 requires a trainer to physically install the production build (`npm run build && npm run preview`) to a real device, launch it in airplane mode, and confirm the full shell renders, responsive nav switches correctly, theme persists across a true relaunch, and all four placeholder sections show the correct icon. This cannot be performed by an automated agent — it is explicitly a `checkpoint:human-verify` with `gate="blocking"` in the plan, and `workflow.auto_advance` is `false` in `.planning/config.json`, so it is not auto-approved.

**This plan is NOT complete.** `requirements-completed` is intentionally left empty (PLAT-01/PLAT-02) pending Task 4's approval. A continuation agent (or the orchestrator) must run the checkpoint verification steps from `01-02-PLAN.md` Task 4 and, upon trainer approval, finalize this plan (mark requirements complete, update STATE.md/ROADMAP.md).

## Accomplishments
- Built the shared `NavItem` (icon+label, active/disabled/D-15 provision, 44x44 min touch target) consumed identically by `BottomTabBar` (phone, always-visible label) and `Sidebar` (tablet/desktop, label hidden below xl per UI-SPEC's 72px icon-rail spec)
- Built `PlaceholderScreen` verbatim per `01-RESEARCH.md`'s locked reference implementation, instantiated by four thin section views sourcing icon + copy from `@lucide/svelte` and `strings.de.ts` (no inline literals)
- Extended `App.svelte`: single nav items array, `$state` `activeSection`, dynamic `<ActiveView />` rendering (Svelte 5 direct dynamic-component syntax, no `<svelte:component>`, no router)
- Built and wired `UpdateBanner`: renders only when `updateAvailable.current && !dismissed`; "Aktualisieren" calls the real `updateSW` from `main.ts`; "Später" sets component-local `$state` (never written to persistent browser storage, D-02/D-03)
- Added a deterministic `?e2e=1`-gated `window.__setUpdateAvailable` test hook in `App.svelte` so `e2e/nav.spec.ts` can flip the update-banner state without publishing two real builds mid-test
- TDD RED→GREEN: `e2e/nav.spec.ts` written first and confirmed failing for the right reason (6/7 failing — missing testids/hook; the 7th, "banner absent by default," trivially already held), then turned green incrementally across Tasks 2-3

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing E2E tests for responsive nav, section switching, and the update banner** - `4652073` (test — TDD RED)
2. **Task 2: Build the responsive glass nav shell and four placeholder sections** - `99c1ed2` (feat)
3. **Task 3: Build and wire the session-dismissible update banner to green** - `7b62274` (feat — TDD GREEN)
4. **Task 4: Human verification — install to device and launch offline** - NOT STARTED (checkpoint, requires human action)

**Plan metadata:** (this commit, docs) — pending, will follow this SUMMARY

## Files Created/Modified
- `src/lib/components/GlassCard.svelte` - Reusable `.glass-surface` wrapper (rounded-2xl), not yet consumed in Phase 1 — reserved primitive for Phase 2+
- `src/lib/components/NavItem.svelte` - Shared icon+label nav item; `disabled`/`aria-disabled` (D-15), `hideLabelBelowXl` for the sidebar rail
- `src/lib/components/BottomTabBar.svelte` - Fixed-bottom glass nav, `data-testid="bottom-tab-bar"`, `flex md:hidden` container
- `src/lib/components/Sidebar.svelte` - Fixed-left glass nav, `data-testid="sidebar-nav"`, 72px rail / 240px at xl+, `hidden md:flex` container
- `src/lib/components/PlaceholderScreen.svelte` - Parameterized "coming soon" screen (icon/heading/body), verbatim RESEARCH.md pattern
- `src/lib/components/UpdateBanner.svelte` - Session-dismissible update banner, calls real `updateSW`
- `src/lib/views/{Setup,Registration,Scoring,Results}Placeholder.svelte` - Thin `PlaceholderScreen` instantiations with section icon + `strings.de.ts` copy
- `src/App.svelte` - Nav items array, `activeSection` `$state`, dynamic active-view rendering, `UpdateBanner` mount, `?e2e=1` test hook
- `e2e/nav.spec.ts` - 7 Playwright tests: 768px breakpoint switch, 4 nav labels, 2 section-switch assertions, update-banner absent/present/dismiss

## Decisions Made
- Placed the `?e2e=1` test hook in `App.svelte` (not `main.ts`) to stay within this plan's declared `files_modified` list — `main.ts` wasn't listed, and the hook logically belongs alongside the store it flips.
- Used `data-testid` attributes on the two `<nav>` elements for deterministic E2E disambiguation, since both nav forms render identical content (only CSS `display` differs at the breakpoint) and `getByRole('navigation')` alone would be ambiguous.
- Ran the "four nav labels" and "section switch by clicking a label" E2E assertions at a 1440px viewport (not the plan's literal 1024px) because the Sidebar's UI-SPEC-mandated 72px icon-only rail collapses below `xl` (1280px) — at 1024px the label text is intentionally hidden by CSS. The 768px-breakpoint mutual-exclusivity assertion itself still runs at exactly 1024px as specified (checking nav-container visibility, not label text, which is unaffected by the rail's label-hiding).
- Implemented the Sidebar's icon-only rail (`w-[72px] xl:w-[240px]`, `hideLabelBelowXl` on its `NavItem`s) per UI-SPEC's explicit spacing-scale exception, since it's listed as this plan's own artifact contract ("Sidebar.svelte provides: ... 240px, 72px rail").

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment literally containing the word "localStorage" failed the D-03 no-persistence grep check**
- **Found during:** Task 3 acceptance-criteria verification
- **Issue:** `UpdateBanner.svelte`'s explanatory comment said "never persisted to localStorage" — correct in intent, but the acceptance criterion `grep -L "localStorage" src/lib/components/UpdateBanner.svelte` is a literal string match with no comment/code distinction, so the file (correctly) failed the "clean" check due to the comment alone.
- **Fix:** Reworded the comment to "never written to any persistent browser storage", preserving the same explanation without the literal token.
- **Files modified:** src/lib/components/UpdateBanner.svelte
- **Verification:** `grep -L "localStorage" src/lib/components/UpdateBanner.svelte` now prints the filename (clean); `npm run build` and `npx playwright test e2e/nav.spec.ts` re-run green after the edit.
- **Committed in:** 7b62274 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — test/verification-script false positive, not a functional defect)
**Impact on plan:** No architectural or behavioral change; purely a comment wording fix to satisfy a literal grep-based acceptance check.

## Issues Encountered
None beyond the deviation above.

## Known Stubs

None. `GlassCard.svelte` is built per its artifact contract but not yet consumed by any component in this plan — this is a genuine, fully-functional reusable primitive (not a stub with empty/mock data), reserved for Phase 2+ per `01-PATTERNS.md`'s own greenfield note. No hardcoded empty arrays/placeholder text/TODO markers exist anywhere in the files created this plan (verified via grep).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Blocked on Task 4.** Before this plan can be considered complete and before Phase 2 planning begins:
1. A human (trainer) must run `npm run build && npm run preview`, install the app to a real device, and confirm the checklist in `01-02-PLAN.md` Task 4 (`<how-to-verify>`): full offline shell render, responsive nav switch across widths, light/dark persistence across a true relaunch, and all four placeholder sections with correct icons.
2. Upon approval, a continuation agent should: mark `requirements-completed: [PLAT-01, PLAT-02]` in this SUMMARY's frontmatter, and the orchestrator should then run its normal STATE.md/ROADMAP.md/REQUIREMENTS.md updates for the completed plan.
3. If the trainer reports issues instead, they should be triaged as new auto-fix tasks (Rules 1-3) or a plan revision, not silently absorbed into this SUMMARY.

All automatable verification (build, type-check, full Playwright suite including offline-reload from Plan 01 and the new nav/banner suite from this plan) is green and ready for that final human check.

---
*Phase: 01-foundation*
*Plan: 02*
*Status: Tasks 1-3 complete, Task 4 (checkpoint) pending human verification*

## Self-Check: PASSED

All 12 claimed created/modified files verified present on disk; all 3 claimed commit hashes (4652073, 99c1ed2, 7b62274) verified present in git log.
