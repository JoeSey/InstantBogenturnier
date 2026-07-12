---
phase: 08-rings-configuration
plan: 01
subsystem: data-model
tags: [schema, fixtures, i18n]
dependency-graph:
  requires: []
  provides:
    - RoundConfig.rings field (10 | 5, optional)
    - WA_PRESETS with 3 locked v1.3 presets carrying fixed rings values
    - strings.de.ts preset/rings label keys for Plan 02
  affects:
    - src/lib/views/SetupRounds.svelte (Plan 02 rewiring consumes these keys/presets)
tech-stack:
  added: []
  patterns:
    - "Optional field added to existing RoundConfig without a Dexie .version() bump (read with ?? 10 fallback), matching the presetId? precedent"
key-files:
  created: []
  modified:
    - src/lib/db/schema.ts
    - src/lib/fixtures/waPresets.ts
    - src/lib/i18n/strings.de.ts
decisions:
  - "RoundConfig.rings typed as literal union 10 | 5 (not number) per research Pitfall 3"
  - "RoundConfig.distance made optional (was required) since custom mode in Plan 02 replaces it with the Auflagen radio"
  - "wa-18m/wa-25m presets consolidated into a single wa-10x3 preset (WA 10 Passen à 3 Pfeile), per locked decision of exactly 3 total presets"
  - "DFBV preset assumed passesPerRound: 1 (1 passe per round) per research Assumption A2 — flagged as literal reading, no separate DFBV domain confirmation available"
metrics:
  duration: "~15 min"
  completed: 2026-07-12
---

# Phase 8 Plan 01: Rings data-model foundation Summary

Added the `rings?: 10 | 5` field to `RoundConfig`, replaced the 3 old WA presets with the 3 locked v1.3 presets (each carrying a fixed rings value), and updated `strings.de.ts` label keys — establishing the stable data-model contract Plan 02's `SetupRounds.svelte` UI rewiring will consume.

## What Was Built

- **`src/lib/db/schema.ts`**: Added `rings?: 10 | 5;` to `RoundConfig`. Changed `distance: string` to `distance?: string`. No `.version()` block touched — per TARGET-01, `rings` is read with a `?? 10` fallback at every consumption site (no migration needed), matching the existing `presetId?: string` precedent.
- **`src/lib/fixtures/waPresets.ts`**: Replaced the 3 old presets (`wa-18m`, `wa-25m`, `wa-70m`) with the 3 locked presets:
  - `wa-10x3`: "WA 10 Passen à 3 Pfeile" — 3 arrows/passe, 10 passes, 1 round, rings=10, 30 total
  - `dfbv-6x5`: "DFBV 6 Runden à 5 Pfeile" — 5 arrows/passe, 1 passe/round, 6 rounds, rings=5, 30 total
  - `wa-70`: "WA 70" — 6 arrows/passe, 6 passes, 1 round, rings=10, 36 total

  `distance` field dropped from preset objects entirely (no longer the differentiator).
- **`src/lib/i18n/strings.de.ts`** (`setup` section): Renamed `waPresetsLabel` to `'Vorlagen'`. Removed `wa18m`/`wa25m`/`wa70m`/`customDistanceLabel`. Added `presetWa10x3`, `presetDfbv6x5`, `presetWa70` (exact preset names) and `customRingsLabel: 'Auflagen'`, `rings10Label: '10 Ringe'`, `rings5Label: '5 Ringe'` for Plan 02's custom-mode Auflagen radio.

## Verification

- `npx tsc --noEmit -p tsconfig.json` — clean, no new errors.
- `grep -n "rings" src/lib/db/schema.ts` — confirms field present.
- `grep -c "id: '" src/lib/fixtures/waPresets.ts` — equals 3.

## Known Out-of-Scope Test Breakage (expected, Plan 02 scope)

`src/lib/views/SetupRounds.svelte` and `src/lib/views/SetupRounds.test.ts` still reference the removed string keys (`strings.setup.wa18m`, `wa25m`, `wa70m`, `customDistanceLabel`) and the old preset ids (`wa-18m`, `wa-25m`, `wa-70m`). This is **explicitly out of scope for this plan** — the plan's own objective states "Plan 02's `SetupRounds.svelte` rewiring will consume" these new keys/presets. Running `SetupRounds.test.ts` currently shows 4 failing tests referencing the old keys; this is expected and will be resolved when Plan 02 rewires `SetupRounds.svelte` against the new contract. `schema.test.ts` (uses `presetId: 'wa-18m'` as an opaque string, not a lookup) passes unaffected.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/lib/db/schema.ts (rings field present, verified via grep)
- FOUND: src/lib/fixtures/waPresets.ts (3 presets, verified via grep -c)
- FOUND: src/lib/i18n/strings.de.ts (label keys updated, verified via Read)
- FOUND commit 2b09ecb: feat(08-01): add rings field to RoundConfig, loosen distance
- FOUND commit a323fbe: feat(08-01): replace WA presets with 3 locked v1.3 presets, update rings labels
