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

## From 02-04 execution

- **`e2e/nav.spec.ts` → "clicking Schützen shows the Schützen placeholder heading"
  fails**: expects `getByRole('heading', { name: 'Schützen kommt bald' })`, but Plan
  02-03 (commit `e5439fa`, merged into this worktree's base at `4b8df1b`) replaced
  `RegistrationPlaceholder.svelte` with the real `Registration.svelte` shooter
  registration view — the placeholder heading no longer renders. Confirmed pre-existing
  at this worktree's base commit, in a file (`e2e/nav.spec.ts`) not in 02-04-PLAN.md's
  `files_modified` list; not caused by this plan's changes. All other 12 e2e tests
  (including this plan's own `presetExportImport.spec.ts`) and all 34 unit tests pass.
  Flagging for a future plan/phase to update `nav.spec.ts`'s assertion to match the
  now-real Registration view (or replace with a more specific still-true assertion).
