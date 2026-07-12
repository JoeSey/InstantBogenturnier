# Phase 8: Rings Configuration - Research

**Researched:** 2026-07-12
**Domain:** Svelte 5 form/config UI + Dexie schema evolution (brownfield, existing app)
**Confidence:** HIGH (all findings verified directly against the codebase)

## Summary

This phase adds an `rings: 10 | 5` field to the existing `RoundConfig` (`db.rounds`) record,
replaces the current 3-preset WA list with a new 3-preset list (each carrying a fixed
`rings`), replaces the custom-mode free-text `distance` field with an explicit Auflagen
10/5 radio, and relabels the top-level radio group. No Dexie schema version bump is
required — `rings` is optional and can be read with a `?? 10` fallback everywhere
`RoundConfig` is consumed. Everything needed lives in three files:
`src/lib/db/schema.ts`, `src/lib/fixtures/waPresets.ts`, `src/lib/views/SetupRounds.svelte`,
plus `src/lib/i18n/strings.de.ts` and one line in `src/lib/components/PresetSave.svelte`.

**Primary recommendation:** Add `rings?: 10 | 5` to `RoundConfig` (TS type only, no
`.version()` bump), read it with `?? 10` at every consumption site, replace `waPresets.ts`
with the 3 new presets (each with a fixed `rings`), and swap `customDistance` for a
`customRings` radio in `SetupRounds.svelte`. `distance` field itself can remain in the type
(still used elsewhere, see below) or be dropped from custom mode's UI only — see Open
Questions.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Rings value storage | Database (Dexie `rounds` table) | — | Single source of truth per tournament, same singleton pattern as existing `RoundConfig` fields |
| Rings selection UI (Vorlagen/Benutzerdefiniert) | Browser/Client (Svelte component) | — | `SetupRounds.svelte` is a pure client-side form component, no server tier exists in this app |
| Preset → rings derivation | Browser/Client (fixtures module) | — | `waPresets.ts` is static reference data imported directly into the component |
| Default-to-10 read fallback | Browser/Client (read sites) | Database (implicit) | No migration; every reader applies `?? 10`, consistent with this app's existing "singleton record, optional field" pattern (see `SettingsRecord.certificateHeading` v5 migration for contrast — that one DID get a write migration, this one explicitly should NOT per TARGET-01) |

## Standard Stack

No new packages required. Phase is a pure data-model + UI change using the existing stack
(Svelte 5 runes, Dexie 4.4.4, TypeScript). No installation section needed.

## Package Legitimacy Audit

Not applicable — no new packages introduced in this phase.

## Current State (verified via Read/Grep)

### `RoundConfig` type — `src/lib/db/schema.ts:20-27`
```typescript
export interface RoundConfig {
  id?: number;
  arrowsPerPasse: number;
  passesPerRound: number;
  numberOfRounds: number;
  distance: string;
  presetId?: string;
}
```
`rounds` table is declared `id` (singleton keyed store, no compound index) at
`schema.ts:101` (v2) and restated unchanged through v3/v4/v5 (`schema.ts:110,122,134`).
**No index needs to change to add `rings`** — Dexie only indexes fields listed in
`.stores()`; non-indexed fields (like `distance` already) don't need version bumps to
add/remove. `RoundConfig` is a plain TS interface, not enforced by Dexie at runtime.

**Precedent for optional-field-no-migration:** `presetId?: string` (`schema.ts:26`) is
already optional and has no dedicated migration — it was added as part of the original v2
shape. There's no existing example in this codebase of adding an optional field to an
*existing* version's table without a version bump, but Dexie's own behavior confirms it's
unnecessary: Dexie does not validate object shape against `.stores()` — arbitrary
extra/missing properties on stored objects are silently allowed. **`rings` can be added to
the `RoundConfig` TypeScript interface as `rings?: 10 | 5` with zero changes to the
`.version()` block in `schema.ts:95-151`.**

### `db.rounds` consumption sites (grep, all files)
| File | Line | Reads/writes | Rings impact |
|------|------|--------------|--------------|
| `SetupRounds.svelte` | 32, 64, 113 | reads for hydration/existence-check, writes via `save()` | Must add `rings` to `resolvedConfig` and hydration effect |
| `Results.svelte` | 30-31 | reads into `roundsConfig`, passed to `computeClassRankings` | Not consumed in Phase 8 scope (Phase 9: TARGET-05/07/08 touch scoring/PDF display) — Phase 8 only needs to ensure `rings` survives the round-trip, not be *used* here yet |
| `ScoreEntry.svelte` | 34 | reads `db.rounds.get(1)` | Same — Phase 9 scope, not Phase 8 |
| `PresetList.svelte` | 84 | writes `db.rounds.put({ id: 1, ...preset.roundsConfig })` when loading a saved preset | `preset.roundsConfig` is `RoundConfig`-shaped (via `PresetRecord.roundsConfig: Omit<RoundConfig, 'id'>`, `schema.ts:42`) — will automatically carry `rings` through once `RoundConfig` has it; no code change needed here IF `rings` is captured when the preset was originally saved |
| `PresetSave.svelte` | 25, 31 | reads `db.rounds.get(1)` then spreads `distance: roundsRecord.distance` (and other fields, need full read) into the saved preset shape | **Must add `rings: roundsRecord.rings` (or `?? 10`) to the field list here** or presets will silently drop the rings setting on save |
| `PresetRecord.roundsConfig` | `schema.ts:42` | `Omit<RoundConfig, 'id'>` | Type-level: automatically includes `rings?` once added to `RoundConfig` — no interface change needed |

Test files (`*.test.ts`) construct `db.rounds.put({...})` literals directly — these will
need `rings` added to relevant test fixtures during planning/execution but this is
execution-detail, not research-blocking (all such literals are typed against `RoundConfig`
so TypeScript will NOT error on a missing optional field — tests will keep compiling and
existing tests implicitly cover the "no rings field" default-to-10 case for free).

### `PresetSave.svelte` — needs full read to confirm exact spread shape
Line 31 shown in grep confirms `distance: roundsRecord.distance` is explicitly listed
(not a blind spread), meaning the preset-save code enumerates `RoundConfig` fields by name.
**Action for planner:** open `PresetSave.svelte` around line 20-40 during planning to see
the exact field list and add `rings: roundsRecord.rings ?? 10` alongside `distance`.

## Current WA Preset Shape — `src/lib/fixtures/waPresets.ts`
```typescript
export const WA_PRESETS = [
  { id: 'wa-18m', name: 'WA 18m', arrowsPerPasse: 3, passesPerRound: 10, numberOfRounds: 1, distance: '18m', totalArrows: 30 },
  { id: 'wa-25m', name: 'WA 25m', arrowsPerPasse: 3, passesPerRound: 10, numberOfRounds: 1, distance: '25m', totalArrows: 30 },
  { id: 'wa-70m', name: 'WA 70m', arrowsPerPasse: 6, passesPerRound: 6, numberOfRounds: 1, distance: '70m', totalArrows: 36 },
] as const;
```
`totalArrows` is documented as derived reference data, not persisted (`waPresets.ts:1-3`).

**Minimal change needed:** add `rings: 10 | 5` to each preset object literal. Replace the 3
existing presets with the 3 locked new ones per PROJECT.md/CONTEXT decisions:

| New preset id (suggested) | name/label | arrowsPerPasse | passesPerRound | numberOfRounds | distance | rings |
|---|---|---|---|---|---|---|
| `wa-10x3` (or similar) | "WA 10 Passen à 3 Pfeile" | 3 | 10 | 1 | keep existing distance convention, e.g. `'18m'` — **flag: no distance specified in requirements, see Open Questions** | 10 |
| `dfbv-6x5` | "DFBV 6 Runden à 5 Pfeile" | 5 | ? | 6 | ? | 5 |
| `wa-70` | "WA 70" | 6 | 6 | 1 | `'70m'` | 10 |

**"WA 10 Passen à 3 Pfeile" and "WA 70" map directly onto the existing `wa-18m`/`wa-25m`
shape (renamed/consolidated) and `wa-70m` shape respectively** — these are RENAMES of
existing presets with `rings: 10` added, not new domain logic. `wa-18m` and `wa-25m` were
previously two separate presets with the same `arrowsPerPasse: 3, passesPerRound: 10,
numberOfRounds: 1` shape differing only in `distance` — the new "WA 10 Passen à 3 Pfeile"
preset name suggests these consolidate to ONE preset since distance is no longer the
salient differentiator once Auflagen/rings replaces it as the mode-defining field. **Flag
for planner/discuss-phase: confirm whether `wa-18m`/`wa-25m` collapse into a single preset
losing the 18m vs 25m distinction, or whether both survive under new naming** — PROJECT.md
explicitly lists exactly 3 target presets total, which only works if 18m/25m collapse to
one.

### DFBV 6 Runden à 5 Pfeile — ambiguous, flagged per research question 6
The codebase's only precedent for "N passes of M arrows" naming convention is the existing
`passesPerRound` × `arrowsPerPasse` × `numberOfRounds` triple. The preset name "6 Runden à
5 Pfeile" literally states: `numberOfRounds: 6`, `arrowsPerPasse: 5`. **`passesPerRound` is
NOT stated in the name and is NOT derivable from the codebase's existing WA-preset
conventions** — WA presets always specify passes explicitly (10 passes, 6 passes) but this
DFBV name only says "Runden" (rounds) and "Pfeile" (arrows), omitting Passen entirely. This
could mean `passesPerRound: 1` (each "round" IS one passe of 5 arrows) or some other
DFBV-specific structure unknown to this codebase. **This is a genuine domain gap — do not
guess. Recommend `passesPerRound: 1` as the most literal reading (1 passe per round, since
none is stated) but flag this explicitly as `[ASSUMED]` requiring user confirmation before
lock-in**, since DFBV Feldbogen round structure isn't documented anywhere in this
repository and CLAUDE.md's own research doesn't cover archery domain rules (only tech
stack).

## Strings — `src/lib/i18n/strings.de.ts:67-75`
Current keys used by `SetupRounds.svelte`:
```
waPresetsLabel: 'WA-Vorlagen'         → rename to 'Vorlagen' (top-level radio, per TARGET-02)
customLabel: 'Benutzerdefiniert'       → keep (already matches target label)
wa18m / wa25m / wa70m                  → REMOVE (referenced only via presetLabels map, SetupRounds.svelte:14-18)
roundsCountLabel: 'Runden'             → keep (custom mode)
passesPerRoundLabel: 'Passen pro Runde'→ keep (custom mode)
arrowsPerPassLabel: 'Pfeile pro Passe' → keep (custom mode)
customDistanceLabel: 'Entfernung'      → REMOVE from custom-mode UI, replace with new key e.g. `customRingsLabel: 'Auflagen'`
```
**New keys needed:**
- 3 new preset label strings (replacing `wa18m`/`wa25m`/`wa70m`), e.g. `presetWa10x3`,
  `presetDfbv6x5`, `presetWa70` — exact label text is locked verbatim in PROJECT.md/
  CONTEXT.md: "WA 10 Passen à 3 Pfeile", "DFBV 6 Runden à 5 Pfeile", "WA 70".
- `customRingsLabel` (e.g. "Auflagen") for the new custom-mode radio.
- Radio option labels for 10-ring / 5-ring choice, e.g. `rings10Label: '10 Ringe'`,
  `rings5Label: '5 Ringe'` — no existing precedent string for "ring count" wording in this
  file; planner should pick simple, consistent German phrasing (e.g. "10er-Auflage" /
  "5er-Auflage" or plain "10" / "5" with the `customRingsLabel` heading providing context).

**Note on top-level radio relabel:** TARGET-02 says relabel to "Vorlagen/Benutzerdefiniert"
— since `customLabel` is already "Benutzerdefiniert", only `waPresetsLabel` needs to change
from "WA-Vorlagen" to "Vorlagen" (dropping the "WA-" prefix, since presets are no longer
exclusively WA-branded once DFBV is added).

## SetupRounds.svelte structural changes needed

1. **State:** add `let customRings = $state<10 | 5>(10);` alongside existing `customRounds`/
   `customPassesPerRound`/`customArrowsPerPasse`/`customDistance` (`SetupRounds.svelte:23-26`).
   Decide whether `customDistance` state is removed entirely or retained-but-unused — see
   Open Questions (whether `distance` stays in `RoundConfig` for custom mode or is dropped).

2. **Hydration effect** (`SetupRounds.svelte:35-49`): add `customRings = cfg.rings ?? 10;` in
   the custom-mode branch (line 42-48).

3. **`resolvedConfig` `$derived.by`** (`SetupRounds.svelte:73-91`): add `rings: preset.rings`
   in the preset branch and `rings: customRings` in the custom branch.

4. **`isValidResolvedConfig`** (`SetupRounds.svelte:97-109`): add a check that
   `config.rings === 10 || config.rings === 5` (radio-constrained, so this should always
   hold, but matches this function's existing defensive style for all other fields).

5. **Preset radio loop** (`SetupRounds.svelte:181-198`): no structural change — `presetLabels`
   map (`SetupRounds.svelte:14-18`) needs its 3 keys/values updated to match new preset ids
   and label strings. **No separate Auflagen control shown in preset mode** — confirmed
   correct already since the loop only renders one radio per preset with no rings sub-control.

6. **Custom mode block** (`SetupRounds.svelte:200-250`): replace the `customDistanceLabel`
   text input (lines 240-249) with a new radio group bound to `customRings`, following the
   exact same two-radio pattern already used for the top-level mode selector
   (`SetupRounds.svelte:144-177`) — same `disabled={isFinalized}`, same `onchange={() => {...; save();}}`
   pattern, same Tailwind classes.

7. **Summary line** (`SetupRounds.svelte:253-255`): currently interpolates
   `resolvedConfig.distance`. If `distance` is dropped from custom mode, this line needs to
   either interpolate `resolvedConfig.rings` instead/in addition, or the summary text needs
   redesign. Flag for planner.

## `.distance` usage elsewhere (NOT part of `RoundConfig`, do not touch)

`classNameGenerator.ts` and `ClassForm.svelte` use a *different* `distance` field — this
belongs to `ClassRecord` (`schema.ts:7-13`, the Bogen-/Altersklassen "distance" like 10m/
18m/25m/70m used for class-name generation), a completely separate concept from
`RoundConfig.distance`. **Do not confuse these two `distance` fields** — PROJECT.md's phrase
"distance already lives under Bogen-/Altersklassen" confirms `ClassRecord.distance` is the
one intended to remain the canonical distance concept; `RoundConfig.distance` in custom mode
is the redundant one being replaced by the Auflagen radio (per PROJECT.md line 20).

## Don't Hand-Roll

Not applicable — this phase is pure form-state + data-model work using patterns 100% already
established in this codebase (radio groups, `$derived.by`, Dexie singleton read/write,
`liveQuery` hydration). No external library need.

## Common Pitfalls

### Pitfall 1: Forgetting `PresetSave.svelte`'s explicit field enumeration
**What goes wrong:** `PresetSave.svelte:31` explicitly lists `distance: roundsRecord.distance`
rather than spreading the whole record — adding `rings` to `RoundConfig` does NOT
automatically propagate into saved presets.
**Why it happens:** Field-by-field construction (not `{...roundsRecord}`) was likely chosen
deliberately (e.g. to strip `id`), but it means every new `RoundConfig` field needs manual
addition here.
**How to avoid:** Add `rings: roundsRecord.rings ?? 10` explicitly at `PresetSave.svelte`
around line 31.
**Warning signs:** A trainer saves a 5-ring DFBV config as a named preset, reloads it later,
and it silently becomes 10-ring.

### Pitfall 2: Preset consolidation breaking existing saved `PresetRecord`s
**What goes wrong:** If `wa-18m`/`wa-25m` collapse into one "WA 10 Passen à 3 Pfeile" preset
id, any previously-saved `PresetRecord.roundsConfig.presetId` referencing the old ids
(`'wa-18m'`, `'wa-25m'`) will no longer match anything in the new `WA_PRESETS` array.
**Why it happens:** `SetupRounds.svelte:39-41`'s hydration branch checks `cfg.presetId` and
looks it up — a stale id won't be found, but the code doesn't currently guard against a
"presetId set but not found in WA_PRESETS" case explicitly (falls through to `?? WA_PRESETS[0]`
at line 75, which silently picks the wrong preset).
**How to avoid:** Either keep old preset ids alive as deprecated/hidden aliases, or accept
this as a known one-time cosmetic glitch for existing saved presets (consistent with
TARGET-01's "no migration" philosophy — old presets referencing removed ids will just
resolve to the first available preset, not crash). Flag for planner to decide/document,
not silently ignore.
**Warning signs:** A trainer loads an old saved preset from before this phase and gets a
different rounds config than expected, silently.

### Pitfall 3: `RoundConfig.rings` typed as `10 | 5` vs `number`
**What goes wrong:** If typed as plain `number`, nothing prevents invalid values from
sneaking in via custom code paths (tests, future direct writes).
**How to avoid:** Type `rings?: 10 | 5` (not `number`) so TypeScript catches misuse at
compile time, matching this codebase's existing preference for literal unions
(`ScoreValue`, `SettingsRecord.id: 1`, `flight?: 'A/B' | 'C/D' | null`).

## Code Examples

### Pattern: reading with default fallback (matches existing codebase idiom)
```typescript
// Existing precedent, ScoreEntry.svelte / Results.svelte pattern (`?? []` for arrays):
let shooters = $derived($shootersQuery ?? []);
// Apply the same idiom for rings:
let rings = $derived(existingConfig?.rings ?? 10);
```

### Pattern: adding an optional field without a Dexie version bump
```typescript
// schema.ts — NO change to this.version(N).stores({...}) block needed.
export interface RoundConfig {
  id?: number;
  arrowsPerPasse: number;
  passesPerRound: number;
  numberOfRounds: number;
  distance: string;
  presetId?: string;
  rings?: 10 | 5; // new — optional, read-time default of 10 applied at every consumer
}
```

## State of the Art

Not applicable — no external ecosystem shift involved, this is a self-contained internal
data-model change.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "WA 10 Passen à 3 Pfeile" preset consolidates the existing `wa-18m` and `wa-25m` presets into one (losing the 18m/25m distance distinction in preset mode) | Current WA Preset Shape | If wrong, planner builds a preset list with only 2 rings=10 presets instead of the intended distinction, or accidentally exceeds the "exactly three presets" requirement (PROJECT.md line 21, REQUIREMENTS TARGET-03) |
| A2 | DFBV "6 Runden à 5 Pfeile" preset maps to `passesPerRound: 1, arrowsPerPasse: 5, numberOfRounds: 6` (i.e., no separate "Passe" concept, 1 passe per round) | DFBV preset shape section | If wrong, the DFBV preset's totals/summary line will be structurally incorrect for real DFBV Feldbogen tournaments, requiring a follow-up fix after trainer feedback |
| A3 | New preset `distance` values are unspecified by requirements for "WA 10 Passen à 3 Pfeile" and the DFBV preset — recommend reusing a sensible existing value (`'18m'`) or leaving as a free label, but this is not derived from any authoritative source | Current WA Preset Shape table | Low risk — `distance` is cosmetic reference text on presets and not exercised by scoring/ranking logic per current grep results |

## Open Questions

1. **Does `RoundConfig.distance` remain in the type for custom mode, or is it fully removed?**
   - What we know: PROJECT.md says the custom-mode free-text distance field is "replaced"
     by the Auflagen radio; `RoundConfig.distance` is typed as required (`distance: string`,
     not optional) at `schema.ts:24`.
   - What's unclear: Whether `distance` becomes optional/unused-but-present (safest, avoids
     touching the required-field contract and `PresetSave.svelte`'s field list) or is
     deleted from `RoundConfig` entirely (cleaner, but touches more call sites including
     `SetupRounds.svelte:254`'s summary line interpolation and any test fixture literal that
     currently sets `distance`).
   - Recommendation: Keep `distance` in the type (mark optional, default `''`) to minimize
     blast radius across ~15 test files that construct `RoundConfig` literals; simply stop
     rendering/writing it from the custom-mode UI. Confirm with user/planner before locking.

2. **Do `wa-18m`/`wa-25m` collapse into a single preset (see Assumption A1), and if so, what
   preset id/label replaces them?**
   - Recommendation: Planner should confirm exact preset id naming (e.g. `wa-10x3`) doesn't
     collide with any hardcoded string elsewhere (none found in grep beyond `waPresets.ts`
     and `SetupRounds.svelte`'s `presetLabels` map).

3. **DFBV preset's exact `passesPerRound` value (see Assumption A2)** — needs explicit user
   confirmation before implementation locks this in, per the phase's own research question 6
   instruction not to guess silently.

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/lib/db/schema.ts` — full file read, `RoundConfig` interface and all 5 Dexie
  `.version()` blocks
- `src/lib/fixtures/waPresets.ts` — full file read
- `src/lib/views/SetupRounds.svelte` — full file read
- `src/lib/i18n/strings.de.ts` — grepped relevant `setup.*` keys
- Grep across `src/` for `db.rounds`, `.distance`, `customDistance` — exhaustive usage
  inventory
- `src/lib/views/Results.svelte` — partial read confirming `roundsConfig` consumption is
  Phase-9 scope, not Phase-8
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` — phase scope
  and locked requirement text (TARGET-01..04)

### Secondary / Tertiary
None — this phase required no external library research; all findings verified directly
against the repository.

## Metadata

**Confidence breakdown:**
- Schema/migration approach: HIGH — Dexie's non-validating store behavior is well-documented
  in project history (CLAUDE.md sources) and confirmed by existing optional-field precedent
  (`presetId`)
- UI restructuring: HIGH — directly read the exact component and all its state/derived logic
- Preset domain values (DFBV passesPerRound): LOW — explicitly flagged, requires user
  confirmation, not derivable from codebase or requirements docs

**Research date:** 2026-07-12
**Valid until:** No external dependency — valid until this phase's code changes land (stale
immediately after Phase 8 execution, not time-based)
