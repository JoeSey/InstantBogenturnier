---
phase: 08-rings-configuration
plan: 02
subsystem: setup-ui
tags: [svelte, forms, presets]
dependency-graph:
  requires:
    - RoundConfig.rings field (10 | 5, optional) from Plan 01
    - WA_PRESETS with 3 locked presets carrying fixed rings values from Plan 01
    - strings.de.ts preset/rings label keys from Plan 01
  provides:
    - Trainer-facing Auflagen (10/5) selection UI in Einrichtung
    - rings round-trips correctly through saved presets
  affects:
    - src/lib/views/SetupRounds.svelte
    - src/lib/components/PresetSave.svelte
tech-stack:
  added: []
  patterns:
    - "Custom-mode radio group bound to $state<10 | 5>, mirroring the existing top-level mode-selector radio pattern"
key-files:
  created: []
  modified:
    - src/lib/views/SetupRounds.svelte
    - src/lib/views/SetupRounds.test.ts
    - src/lib/components/PresetSave.svelte
    - src/lib/components/PresetSave.test.ts
decisions:
  - "distance dropped entirely from resolvedConfig/summary line in favor of rings, per plan spec (RoundConfig.distance itself untouched at the type level, per Plan 01's decision to keep it optional-but-unused in custom mode)"
metrics:
  duration: "~20 min"
  completed: 2026-07-12
---

# Phase 8 Plan 02: Rings configuration UI Summary

Rewired `SetupRounds.svelte`'s custom mode to use an explicit Auflagen (10/5) radio in place of the removed free-text distance field, wired preset-derived `rings` through `resolvedConfig`/hydration/validation, updated the preset label map to the 3 new preset ids, and fixed `PresetSave.svelte` so saved presets no longer silently drop the `rings` setting.

## What Was Built

- **`src/lib/views/SetupRounds.svelte`**:
  - `presetLabels` map updated to the 3 new preset ids (`wa-10x3`/`dfbv-6x5`/`wa-70`) and their corresponding string keys (`presetWa10x3`/`presetDfbv6x5`/`presetWa70`).
  - `customDistance` state replaced with `customRings = $state<10 | 5>(10)`.
  - Hydration effect: custom branch now sets `customRings = cfg.rings ?? 10` (default-to-10 fallback, TARGET-01).
  - `resolvedConfig`: preset branch now includes `rings: preset.rings`; custom branch includes `rings: customRings`. `distance` dropped from both branches.
  - `isValidResolvedConfig`: added `(config.rings === 10 || config.rings === 5)` to the validation conjunction, matching the function's existing defensive per-field style.
  - Custom-mode UI: the old `customDistanceLabel` text input replaced with a two-radio Auflagen group (`customRingsLabel` heading, `rings10Label`/`rings5Label` options), following the exact same pattern (Tailwind classes, `disabled={isFinalized}`, `onchange={() => {...; save();}}`) as the existing top-level mode-selector radios.
  - Summary line now reads `{passesPerRound} Passen, {arrowsPerPasse} Pfeile, {rings} Ringe`.

- **`src/lib/views/SetupRounds.test.ts`**: rewrote all 6 tests (5 original + kept structure) against the new preset ids/labels/shapes and the new Auflagen radio — no more `customDistanceLabel` input references or `distance` fields in any expected `db.rounds` snapshot. Added a dedicated test for the default-to-10 fallback when rehydrating a custom record with no `rings` field, alongside the existing `rings: 5` rehydration test.

- **`src/lib/components/PresetSave.svelte`**: `performSave`'s explicit `roundsConfig` field list now includes `rings: roundsRecord.rings ?? 10` (roundsRecord-present branch) and `rings: 10` (no-roundsRecord fallback branch) — closes research Pitfall 1 (a trainer saving a 5-ring config would previously see it silently become 10-ring on reload).

- **`src/lib/components/PresetSave.test.ts`**: added a new test seeding `db.rounds` with `rings: 5`, saving a new preset, and asserting `roundsConfig.rings === 5` on the persisted `PresetRecord`.

## Verification

- `npx vitest run src/lib/views/SetupRounds.test.ts` — 6/6 pass.
- `npx vitest run src/lib/components/PresetSave.test.ts` — 4/4 pass.
- `npx vitest run` (full suite) — 188/188 pass across 23 test files.
- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `grep -n "customDistance" src/lib/views/SetupRounds.svelte` — no matches.
- `grep -n "rings: roundsRecord.rings" src/lib/components/PresetSave.svelte` — match found.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/lib/views/SetupRounds.svelte (customRings radio present, verified via Read + grep)
- FOUND: src/lib/views/SetupRounds.test.ts (rewritten, verified via test run — 6/6 pass)
- FOUND: src/lib/components/PresetSave.svelte (`rings: roundsRecord.rings ?? 10` present, verified via grep)
- FOUND: src/lib/components/PresetSave.test.ts (new rings-persistence test, verified via test run — 4/4 pass)
- FOUND commit 6451ec7: feat(08-02): rewire SetupRounds custom mode to Auflagen 10/5 radio
- FOUND commit 8979fa5: fix(08-02): persist rings into saved PresetRecord.roundsConfig
