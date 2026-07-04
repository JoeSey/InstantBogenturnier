---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [svelte5, vite8, tailwindcss4, vite-plugin-pwa, dexie, pwa, offline, theming, lucide]

# Dependency graph
requires: []
provides:
  - Scaffolded Svelte 5 + Vite 8 + TypeScript project on the locked stack (CLAUDE.md pinned versions)
  - Installable, offline-capable PWA (registerType 'prompt', generateSW, manifest) — PLAT-01
  - FOUC-safe light/dark theming with persisted manual override — PLAT-03
  - Single source of app/club identity (src/lib/config/app.config.ts) feeding both PWA manifest and UI copy
  - Centralized German UI copy module (src/lib/i18n/strings.de.ts)
  - Empty Dexie v1 schema opened on boot (src/lib/db/schema.ts) — ready for Phase 2 tables
  - Working test harness: Vitest (unit) + Playwright (offline/production-build E2E)
  - Generated PWA icon set (pwa-192/512, maskable, apple-touch-icon) via @vite-pwa/assets-generator
affects: [01-02, phase-2-setup-registration]

# Tech tracking
tech-stack:
  added: [svelte@5.56, vite@8.1, "@sveltejs/vite-plugin-svelte@7.1", tailwindcss@4.3, "@tailwindcss/vite@4.3", vite-plugin-pwa@1.3, "@vite-pwa/assets-generator@1.0", dexie@4.4, "@lucide/svelte@1.23", typescript@6.0, vitest@4.1, "@testing-library/svelte@5.4", "@playwright/test@1.61", svelte-check@4.7, jsdom]
  patterns:
    - "FOUC-safe theme boot: synchronous inline <head> script (localStorage/matchMedia) + Tailwind v4 @custom-variant dark, Svelte layer only toggles/persists on user action"
    - "Single source of identity: app.config.ts imported by both vite.config.ts (PWA manifest) and strings.de.ts (UI copy) — no duplicate literals"
    - "registerType:'prompt' with onNeedRefresh wired to a real store (updateAvailable), not stubbed"
    - "Glass-surface utility class (backdrop-blur-sm 8px) reserved surface-opaque counterpart for future dense data tables"
    - "Vitest config kept separate from vite.config.ts (which carries the VitePWA plugin) to keep unit-test transforms minimal"

key-files:
  created:
    - src/lib/config/app.config.ts
    - vite.config.ts
    - index.html
    - src/app.css
    - src/lib/i18n/strings.de.ts
    - src/lib/db/schema.ts
    - src/lib/stores/theme.svelte.ts
    - src/lib/stores/updateBanner.svelte.ts
    - src/lib/components/ThemeToggle.svelte
    - src/lib/components/TopAppBar.svelte
    - src/App.svelte
    - src/main.ts
    - pwa-assets.config.ts
    - playwright.config.ts
    - vitest.config.ts
    - vitest-setup.ts
    - src/lib/stores/theme.test.ts
    - e2e/skeleton.spec.ts
  modified:
    - package.json
    - .gitignore

key-decisions:
  - "Used npm create-vite svelte-ts scaffold, then removed template demo files (Counter.svelte, hero/vite/svelte assets) not part of this phase's scope"
  - "Kept vitest.config.ts separate from vite.config.ts per the plan's own action note (avoids the VitePWA plugin's noise in unit-test transforms)"
  - "Custom assetName override in pwa-assets.config.ts to keep generated icon filenames exact (apple-touch-icon.png, no size suffix) matching vite.config.ts's manifest.icons"
  - "localStorage (not Dexie) for the single theme-preference scalar — deliberate, narrow exception to the 'no localStorage for tournament data' rule, per RESEARCH.md"

patterns-established:
  - "Identity-as-config: src/lib/config/app.config.ts is the only file with the literal app name/colors; every consumer imports it"
  - "Centralized copy: all UI text flows through src/lib/i18n/strings.de.ts, no inline literals in components"

requirements-completed: [PLAT-01, PLAT-03]

# Metrics
duration: 17min
completed: 2026-07-04
---

# Phase 1 Plan 01: Foundation Walking Skeleton Summary

**Scaffolded InstantBogenturnier from zero into an installable, offline-capable Svelte 5 + Vite 8 + Tailwind 4 PWA with a FOUC-safe persisted light/dark toggle, single-source app identity, empty Dexie schema opened on boot, and full green Vitest + offline Playwright test coverage.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-07-04T06:25:00Z (worktree creation)
- **Completed:** 2026-07-04T06:42:05Z
- **Tasks:** 3 completed (Task 2 was TDD RED, Task 3 was TDD GREEN)
- **Files modified/created:** 29 (27 new in Task 1, 6 new/changed in Task 2, 9 changed in Task 3)

## Accomplishments
- Project scaffolded on the exact locked stack (svelte 5.56, vite 8.1, tailwindcss 4.3, vite-plugin-pwa 1.3, dexie 4.4, @lucide/svelte 1.23 — not the deprecated lucide-svelte)
- `npm run build` emits `dist/manifest.webmanifest` + `dist/sw.js`; `svelte-check --threshold error` reports 0 errors
- Persisted light/dark theme toggle proven via 3 passing unit tests + 2 passing E2E assertions (toggle+aria-label, reload persistence)
- Offline app-shell rendering proven via a Playwright test that waits for `navigator.serviceWorker.ready`, reloads once to let the SW take control, then verifies content renders fully offline
- Dexie IndexedDB opens on boot with zero console/page errors, verified at runtime by a dedicated E2E clean-boot assertion (not just source-greppable)
- Single source of truth for app identity (`app.config.ts`) feeding both the PWA manifest and centralized German UI copy

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold project and configure build, PWA, Tailwind, theming tokens, and skeleton config/data/i18n modules** - `2954711` (feat)
2. **Task 2: Write failing unit + offline E2E tests for the themeable, offline-capable shell** - `05acc7c` (test — TDD RED)
3. **Task 3: Implement the theme + boot slice to green** - `17e2318` (feat — TDD GREEN)

**Plan metadata:** (this commit, docs) — pending

## TDD Gate Compliance

- RED gate: `05acc7c test(01-01): add failing test for themeable, offline-capable shell` — confirmed failing for the right reason (unresolved import `./theme.svelte`, missing UI elements), not a false green.
- GREEN gate: `17e2318 feat(01-01): implement theme + boot slice to green` — all tests pass (3/3 unit, 5/5 E2E) after implementation.
- No separate REFACTOR commit was needed (implementation matched the locked pattern on first pass, aside from the test-correctness fixes documented below).

## Files Created/Modified
- `src/lib/config/app.config.ts` - Single source of app/club identity (appName, themeColor, backgroundColor)
- `vite.config.ts` - Tailwind v4 + VitePWA (registerType:'prompt', generateSW, includeAssets) manifest sourced from app.config
- `index.html` - FOUC-safe inline theme boot script, `lang="de"`, wired apple-touch-icon
- `src/app.css` - `@custom-variant dark`, `glass-surface` + reserved `surface-opaque` utilities
- `src/lib/i18n/strings.de.ts` - Centralized German copy, appName re-exported from app.config
- `src/lib/db/schema.ts` - Empty Dexie v1 schema, singleton `db` export
- `pwa-assets.config.ts` - Custom assetName mapping so generated icons match manifest filenames exactly
- `playwright.config.ts` - chromium project, webServer runs `vite build && vite preview`
- `vitest.config.ts` / `vitest-setup.ts` - jsdom environment, excludes e2e/ from Vitest's run
- `src/lib/stores/theme.svelte.ts` - Rune-based theme state, `toggleTheme()`, `currentIsDark()`
- `src/lib/stores/updateBanner.svelte.ts` - Session-only `updateAvailable` state (D-03, not persisted)
- `src/lib/components/ThemeToggle.svelte` - Sun/moon icon button, dynamic aria-label
- `src/lib/components/TopAppBar.svelte` - Glass-treated persistent header with app name + toggle
- `src/App.svelte` - Minimal shell mounting TopAppBar (nav/placeholder composition deferred to Plan 02)
- `src/main.ts` - Mounts App, registers SW with real `onNeedRefresh` wiring, opens Dexie connection
- `src/lib/stores/theme.test.ts` / `e2e/skeleton.spec.ts` - Unit + E2E test suites (TDD RED→GREEN)
- `package.json` - Added `test`/`test:e2e` scripts, locked dependency versions
- `.gitignore` - Added test-results/playwright-report/coverage exclusions

## Decisions Made
- Scaffolded via `npm create-vite@9.1.1 -- --template svelte-ts` with `--overwrite` (required since the repo already had CLAUDE.md/.planning tracked files present) — see Deviations for the recovery this required.
- Kept `vitest.config.ts` separate from `vite.config.ts` (plan's action text explicitly allowed this) to avoid mixing the VitePWA build plugin into the unit-test transform pipeline.
- Custom `assetName` override in `pwa-assets.config.ts` so `@vite-pwa/assets-generator`'s default `apple-touch-icon-180x180.png` naming became exactly `apple-touch-icon.png`, matching `index.html`'s `<link rel="apple-touch-icon">` and the plan's acceptance criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `create-vite --overwrite` deleted tracked files (CLAUDE.md, .planning/)**
- **Found during:** Task 1 (project scaffolding)
- **Issue:** The repo already contained tracked files (CLAUDE.md, .planning/) from the pre-existing GSD project state. `npm create vite@latest . -- --template svelte-ts` refused to run non-interactively against a non-empty directory; re-running with `--overwrite` scaffolded the project but also deleted every other tracked file in the working tree (confirmed via `git status --short` showing them as `D`).
- **Fix:** Restored every deleted tracked file individually via `git checkout -- <path>` (never a blanket reset/checkout), verified restored file line counts matched originals before proceeding.
- **Files affected:** CLAUDE.md, .planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/STATE.md, .planning/config.json, .planning/phases/01-foundation/*.md, .planning/research/*.md
- **Verification:** `wc -l` on restored files matched pre-scaffold state; `git status --short` showed only the new scaffold files as untracked afterward.
- **Committed in:** N/A (recovery happened before any commit; restored files were never staged/re-committed since they were already tracked at HEAD)

**2. [Rule 3 - Blocking] Template demo files referenced deleted assets, breaking the build**
- **Found during:** Task 1 verification (`npm run build`)
- **Issue:** The scaffolded `src/App.svelte` imported `./assets/svelte.svg`, `./assets/vite.svg`, `./assets/hero.png`, and `./lib/Counter.svelte` — all removed as out-of-scope template demo content — causing unresolved-import build failures.
- **Fix:** Replaced `src/App.svelte` with a minimal placeholder (`<div></div>`) for Task 1's build-passing requirement; the plan's own scope explicitly assigns the real `App.svelte` composition to Task 3, so this is a temporary stand-in, not a scope violation.
- **Files modified:** src/App.svelte
- **Verification:** `npm run build` exits 0, `svelte-check --threshold error` reports 0 errors
- **Committed in:** 2954711 (Task 1 commit)

**3. [Rule 3 - Blocking] jsdom not installed for Vitest's jsdom test environment**
- **Found during:** Task 2 (writing the failing unit test)
- **Issue:** Vitest's `environment: 'jsdom'` requires the `jsdom` package as a peer devDependency; it is not bundled with vitest itself and was not listed in RESEARCH.md's package table (a standard omission — RESEARCH.md's Standard Stack focuses on named/versioned architectural choices, not every transitive test-harness peer).
- **Fix:** `npm install -D jsdom`
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx vitest run` executes (proceeds past environment loading) instead of erroring on missing jsdom module
- **Committed in:** 05acc7c (Task 2 commit)

**4. [Rule 1 - Bug] Vitest was picking up the Playwright E2E spec, causing a crash**
- **Found during:** Task 3 (running `npx vitest run` for the first time)
- **Issue:** Vitest's default test glob matched `e2e/skeleton.spec.ts`, which calls Playwright's own `test()` global — crashing with "Playwright Test did not expect test() to be called here."
- **Fix:** Added `test.exclude: ['e2e/**', 'node_modules/**']` to `vitest.config.ts`.
- **Files modified:** vitest.config.ts
- **Verification:** `npx vitest run` now only picks up `src/lib/stores/theme.test.ts`
- **Committed in:** 17e2318 (Task 3 commit)

**5. [Rule 1 - Bug] Unit test's `beforeEach` desynced the theme store's module-singleton state from the DOM**
- **Found during:** Task 3 (turning Task 2's RED unit tests GREEN)
- **Issue:** `theme.test.ts`'s `beforeEach` called `document.documentElement.classList.remove('dark')` directly, but `theme.svelte.ts`'s `isDark` is a module-level `$state` initialized once from the DOM class at import time (per the locked Pattern 1 — this is correct, intentional behavior for FOUC-safety). Mutating the DOM class out-of-band from the store desynced `isDark` from the actual class list between test runs, causing test 2 to fail with an incorrect expected value.
- **Fix:** Removed the direct DOM mutation from `beforeEach`; rewrote assertions to use `currentIsDark()` (the store's own state) as the single source of truth for both "before" and "after" expectations, verifying the store keeps the DOM class in sync with its internal state — which is the actual invariant worth testing.
- **Files modified:** src/lib/stores/theme.test.ts
- **Verification:** `npx vitest run` — 3/3 tests pass
- **Committed in:** 17e2318 (Task 3 commit)

**6. [Rule 1 - Bug] Offline E2E test failed because the first page load is never service-worker-controlled**
- **Found during:** Task 3 (running `npx playwright test e2e/skeleton.spec.ts`)
- **Issue:** The offline-reload test called `context.setOffline(true)` then `page.reload()` immediately after the first `page.goto('/')` — but a service worker only takes control of a page starting from its *second* SW-controlled navigation; the first load is always served over the network even after `registerSW()` runs. The test failed with `net::ERR_INTERNET_DISCONNECTED`.
- **Fix:** Added `await page.evaluate(() => navigator.serviceWorker.ready)` followed by one `page.reload()` before setting the context offline, ensuring the SW has installed, activated, and now controls the page.
- **Files modified:** e2e/skeleton.spec.ts
- **Verification:** `npx playwright test e2e/skeleton.spec.ts` — 5/5 tests pass
- **Committed in:** 17e2318 (Task 3 commit)

**7. [Rule 3 - Blocking] Playwright browser binaries not pre-installed in this environment**
- **Found during:** Task 2/3 (preparing to run Playwright)
- **Issue:** `@playwright/test` was installed as a package but no browser binary existed yet in the environment.
- **Fix:** `npx playwright install chromium` (the `--with-deps` variant failed due to lack of passwordless sudo in this sandbox, but the plain browser download succeeded and launched successfully without needing additional system packages).
- **Files modified:** none (browser binaries live outside the repo, in `~/.cache/ms-playwright`)
- **Verification:** A standalone `chromium.launch()` smoke script confirmed the browser launches; subsequent `playwright test` runs succeeded.
- **Committed in:** N/A (no repo files changed)

---

**Total deviations:** 7 auto-fixed (5 blocking/infrastructure, 2 bugs in test design discovered during TDD GREEN)
**Impact on plan:** All fixes were necessary to reach a working, green state matching the plan's locked patterns; none changed the architecture or scope of what the plan specified. The two test-design bugs (items 5 and 6) are exactly the kind of "test doesn't yet reflect reality" issue TDD RED→GREEN is meant to surface.

## Known Stubs

None. Plan 01-01's scope explicitly excludes the nav/placeholder screens (UpdateBanner, BottomTabBar, Sidebar, GlassCard, PlaceholderScreen, and the four `*Placeholder.svelte` views) — these are assigned to Plan 01-02 per the phase's file/task split, not stubbed here.

## Issues Encountered
- `npm create vite@latest . -- --template svelte-ts` cancelled non-interactively against the non-empty repo directory; required `npm exec create-vite@9.1.1 -- . --template svelte-ts --overwrite`, which then required recovering the tracked planning/CLAUDE.md files it deleted (see Deviation 1).
- Playwright's default browser download required `npx playwright install chromium` (without `--with-deps`, since passwordless sudo wasn't available) — succeeded without missing system library errors.

## Next Phase Readiness
- Foundation shell, PWA/offline infrastructure, theming, and Dexie connection are proven end-to-end and ready for Plan 01-02 (responsive nav shell, glass cards, placeholder screens, update banner UI) to build on.
- `src/lib/db/schema.ts`'s empty schema is ready for Phase 2 to add real tables (classes, shooters, scores, presets) with zero setup friction.

---
*Phase: 01-foundation*
*Plan: 01*
*Completed: 2026-07-04*

## Self-Check: PASSED

All 22 claimed created files verified present on disk; all 4 claimed commit hashes (2954711, 05acc7c, 17e2318, 90ab294) verified present in git log.
