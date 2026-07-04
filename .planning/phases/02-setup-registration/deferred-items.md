# Deferred Items — Phase 2

Out-of-scope discoveries logged during plan execution (per executor scope-boundary rule).
Not fixed here — tracked for later triage.

## From 02-01 execution

- **`npm run check` → `tsc -p tsconfig.node.json` fails**: `vite.config.ts(5,54): error
  TS2307: Cannot find module './src/lib/config/app.config' or its corresponding type
  declarations.` Confirmed pre-existing — identical at the worktree's base commit
  (`666018c99e93a432e0688c8982156fc1bb598828`), in files (`vite.config.ts`,
  `tsconfig.node.json`) not touched by 02-01-PLAN.md's `files_modified` list. The
  `svelte-check` half of `npm run check` (the part that actually type-checks `.svelte`
  files touched by this plan) passes cleanly with 0 errors. Not fixed — out of scope for
  02-01; flagging for a future plan/phase to address (likely needs `tsconfig.node.json`
  to include the app's path or `vite.config.ts`'s import needs a `.ts` extension under
  `verbatimModuleSyntax`).
