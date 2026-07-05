# Deferred Items — Quick Task 260705-lpv

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Pre-existing build config bug | `npm run check` (specifically `tsc -p tsconfig.node.json`) fails with `error TS2307: Cannot find module './src/lib/config/app.config'` when resolving the import in `vite.config.ts`. This predates this quick task (introduced in the original scaffold commit `2954711`, unrelated to any file touched by this plan: `src/lib/utils/scoreAdvance.ts`, `src/lib/components/ScorePicker.svelte`, `src/lib/i18n/strings.de.ts`, `src/lib/views/ScoreEntry.svelte`). Out of scope per the executor's scope-boundary rule (only auto-fix issues directly caused by the current task's changes). | Deferred | 2026-07-05 (quick task 260705-lpv) |
