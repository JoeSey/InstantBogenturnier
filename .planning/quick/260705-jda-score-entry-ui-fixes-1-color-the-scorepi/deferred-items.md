# Deferred Items — Quick Task 260705-jda

Items discovered during execution that are out of scope for this task and were not fixed (per executor scope-boundary rule).

| Item | Discovered during | Scope | Notes |
|------|--------------------|-------|-------|
| `tsc -p tsconfig.node.json` fails: missing-extension import error in `vite.config.ts` | Task 3 verification (`npm run check`) | `vite.config.ts` / `tsconfig.node.json` — not touched by this task, originally added in Phase 1 | Same pre-existing issue already logged in Phase 3's `03-01` deferred-items.md. `svelte-check` itself reports 0 errors; only the separate `tsc -p tsconfig.node.json` invocation fails. Left unfixed; flag for a future quick-task/phase to resolve. |
| `vitest run` picks up Playwright `e2e/*.spec.ts` files | Task 3 verification (`npm run test`) | `vitest.config.ts` — no `exclude` configured for the `e2e/` directory | Pre-existing gap, unrelated to this task's files (`scoreColor.ts`, `scoreCompletion.ts`, `ScorePicker.svelte`, `RoundPasseSelector.svelte`, `ScoreEntry.svelte`, `strings.de.ts`). Does not currently cause failures since Playwright specs happen to be skip-compatible under vitest's runner, but is worth tightening later so `npm test` only runs unit/component tests. |
