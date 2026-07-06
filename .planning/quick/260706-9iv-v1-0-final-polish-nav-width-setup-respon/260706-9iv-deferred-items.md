# Deferred Items — 260706-9iv

| Item | Detail | Status |
|------|--------|--------|
| `npm run check` fails on `vite.config.ts(5,54): error TS2307: Cannot find module './src/lib/config/app.config'` | Pre-existing issue in `tsconfig.node.json`'s `module: nodenext` resolution of `vite.config.ts`'s import of `./src/lib/config/app.config` — confirmed unmodified by any of this plan's 4 tasks (`git diff --stat` against the plan's base commit shows no changes to `vite.config.ts`, `tsconfig.node.json`, or `src/lib/config/app.config.ts`). Out of scope per the executor's scope-boundary rule (only fixes issues directly caused by the current task's changes). All `.svelte`/`.test.ts` files touched by this plan type-check cleanly (`svelte-check`: 0 errors, 0 warnings). | Not fixed — deferred |
