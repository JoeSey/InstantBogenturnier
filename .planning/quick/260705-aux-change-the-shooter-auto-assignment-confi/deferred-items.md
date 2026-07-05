# Deferred Items — Quick Task 260705-aux

## Pre-existing `tsc` error in `vite.config.ts`

`npm run check`'s `tsc -p tsconfig.node.json` step fails with:

```
Cannot find module './src/lib/config/app.config' or its corresponding type declarations.
```

Confirmed (during this quick task's execution) to reproduce identically on this plan's base commit and on `master` prior to this change — not caused or touched by this quick task. Out of scope here; needs its own investigation/fix.
