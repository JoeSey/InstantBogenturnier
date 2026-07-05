---
phase: quick
plan: 01
subsystem: setup-classes
tags: [svelte, fixtures, i18n]
provides:
  - "10m" added as a fourth predefined distance option in the Classes card distance dropdown
affects: [phase-2-setup-registration]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - src/lib/fixtures/classOptions.ts
    - src/lib/i18n/strings.de.ts
key-decisions: []
duration: 5min
completed: 2026-07-05
---

# Quick Task 260705-bht: Add "10m" as a Predefined Distance Option Summary (Minimal)

**Extended `DISTANCE_OPTIONS` from `['18m', '25m', '70m']` to `['10m', '18m', '25m', '70m']`, automatically flowing into ClassForm's distance dropdown with no component changes needed.**

## Performance
- **Duration:** ~5 min
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Trainer can now select "10m" as a predefined distance in the Classes card, listed first (ascending order)
- Kept the unused documentation literal in `strings.de.ts` (`strings.setup.distanceOptions`) consistent with the real source of truth to avoid stale data drift

## Task Commits
1. **Task 1: Add "10m" distance option and keep docs in sync** - `72710f7`

## Files Created/Modified
- `src/lib/fixtures/classOptions.ts` - `DISTANCE_OPTIONS` tuple now `['10m', '18m', '25m', '70m']`
- `src/lib/i18n/strings.de.ts` - Unused documentation-only `distanceOptions` literal updated to match

## Deviations from Plan

None - plan executed exactly as written.

## Known Issues (Out of Scope)

`npm run check` reports a pre-existing TypeScript error unrelated to this task's changes:
```
vite.config.ts(5,54): error TS2307: Cannot find module './src/lib/config/app.config' or its corresponding type declarations.
```
This error exists in `tsc -p tsconfig.node.json` module resolution for `vite.config.ts`, a file not touched by this task. Confirmed pre-existing (introduced in an earlier phase's scaffold commit, not by this change). `svelte-check` itself (the `.svelte`/`.ts` app-source check) passed with 0 errors, 0 warnings. Not fixed here per the Scope Boundary rule — logged here for visibility, not fixed as part of this quick task.

## Next Phase Readiness
Ready. No blockers introduced by this change. Phase 3 (score entry) planning can proceed independently of this fixture update.

## Self-Check: PASSED

- FOUND: src/lib/fixtures/classOptions.ts contains `['10m', '18m', '25m', '70m']`
- FOUND: src/lib/i18n/strings.de.ts contains `distanceOptions: ['10m', '18m', '25m', '70m']`
- FOUND: commit 72710f7 in git log
- Full test suite: 37/37 passed
