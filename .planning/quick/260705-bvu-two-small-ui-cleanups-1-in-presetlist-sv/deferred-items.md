# Deferred Items

## Pre-existing `npm run check` failure (out of scope)

- **File:** `vite.config.ts` line 5
- **Error:** `TS2307: Cannot find module './src/lib/config/app.config' or its corresponding type declarations.`
- **Why deferred:** Not caused by this plan's changes (PresetList.svelte, ClassForm.svelte, ClassForm.test.ts, strings.de.ts). The file `src/lib/config/app.config.ts` exists on disk but `tsconfig.node.json`'s module resolution isn't picking it up. Pre-existing issue unrelated to this quick task's scope — not fixed here per scope-boundary rules.
