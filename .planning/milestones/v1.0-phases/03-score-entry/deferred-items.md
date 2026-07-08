# Deferred Items — Phase 3

Items discovered during execution that are out of scope for the current task/plan and were not fixed (per executor scope-boundary rule).

| Item | Discovered during | Scope | Notes |
|------|--------------------|-------|-------|
| `npm run check`'s `tsc -p tsconfig.node.json` step fails: `vite.config.ts(5,54): error TS2307: Cannot find module './src/lib/config/app.config'` | 03-01 Plan, Task 2 (verifying `npm run check` passes) | `vite.config.ts` / `tsconfig.node.json` — files not touched by this plan, originally added in Phase 1 (`2954711 feat(01-01)`) | Pre-existing issue unrelated to Phase 3 Plan 01's files (`src/lib/i18n/strings.de.ts`, `src/lib/components/{ScorePicker,RoundPasseSelector,ScoreTable}.svelte`, `src/lib/views/ScoreEntry.svelte`, `src/App.svelte`). `npm run test` (vitest, all 54 tests) passes cleanly and svelte-check itself reports 0 errors — only the separate `tsc -p tsconfig.node.json` invocation on `vite.config.ts` fails, likely a `tsconfig.node.json` module-resolution setting (`nodenext` + `allowImportingTsExtensions`) mismatch. Left unfixed; flag for a future phase/quick-task to resolve. |
