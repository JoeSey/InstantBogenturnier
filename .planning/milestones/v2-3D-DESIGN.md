# v2 — 3D outdoor tournaments: data-model design

Status: **design agreed, not yet implemented.** Branch: `feature/3d-tournaments`.
Companion research (rules, sources): see auto-memory `3d-archery-scoring-research.md`.

## Goal

Let the app run a DFBV-style 3D/field tournament: a course of N animal stations,
each archer shooting each station once, scored per-archer as a whole card, with
zone-based, arrow-ordinal-dependent points instead of ring values.

### Scope

**In (near-term):**
- Rulesets `dfbv-3arrow` and `dfbv-hunter` (both first-hit-counts, 1 entry per target).
- Configurable station count (course length), shared across all rounds.
- Configurable number of rounds ("legs"), each round gets its own ruleset — so a
  single tournament can be e.g. 3-Pfeil ×2 + Hunter ×1 with one combined ranking.
- Per-archer card entry (reuses the `entryMode` byArcher layout shipped in `b7d60b5`).
- Results with tie-break score → Kill count → Vital count.

**Deferred (design leaves room, no code yet):**
- Additive rulesets: `dfbv-doppelhunter` (2 entries/target, both count), `wa-3d`
  (flat 11/10/8/5). The ruleset carries `entriesPerTarget` so this is an extension,
  not a reshape.
- `custom` ruleset (editable zone×ordinal matrix) for "freie 3D" club shoots.
- Per-round station counts (`passesPerRound` stays a single shared number for v2).
- PDF export polish is a late slice.

## Locked decisions

| Topic | Decision |
|---|---|
| Course plumbing | Reuse `rounds/passes`. Station = `passeIndex`, leg = `roundIndex`. **No `ScoreRecord` PK change, no Dexie version bump.** |
| Per-target storage | One outcome **token** per (shooter, round, station), `arrowIndex` always `0`. Token encodes zone + arrow ordinal. `arrowsPerPasse` semantically = entries-per-target (1 near-term). |
| Ruleset location | **Per-round**: `roundRulesets: RulesetId[]`, `length === numberOfRounds`. Combined ranking sums across legs. |
| Station count | Single shared `passesPerRound` for all rounds. |
| Tie-break | score → Kill count → Vital count. |
| Partial / live scoring | No change — Results already shows everyone with an `isComplete` flag. |
| Mode switch | `scoringMode: '3d'` hides the WA-preset / rings / rounds block entirely; a dedicated "3D-Aufbau" panel replaces it. |
| Back-compat | `scoringMode` undefined ⇒ `'rings'`. Existing tournaments & presets untouched, zero migration. |

## Schema delta (`src/lib/db/schema.ts`)

```ts
export type ScoringMode = 'rings' | '3d';

// near-term ids; 'dfbv-doppelhunter' | 'wa-3d' | 'custom' added later
export type ThreeDRulesetId = 'dfbv-3arrow' | 'dfbv-hunter';

export interface RoundConfig {
  id?: number;
  arrowsPerPasse: number;    // rings: arrows/passe. 3d: entries per target (1 near-term)
  passesPerRound: number;    // 3d: stations per round (course length), shared across rounds
  numberOfRounds: number;    // 3d: number of legs
  distance?: string;
  presetId?: string;
  rings?: 10 | 5;             // ignored when scoringMode === '3d'
  entryMode?: ScoreEntryMode; // in 3d, default to 'byArcherLine' if unset
  scoringMode?: ScoringMode;         // undefined === 'rings'
  roundRulesets?: ThreeDRulesetId[]; // 3d only; index i = ruleset for roundIndex i
}
```

No new index → no `.version()` bump. IndexedDB stores `value` as a string regardless,
so widening the `ScoreValue` union is a compile-time-only change.

### `ScoreValue` tokens

```ts
export type RingScoreValue = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'X'|'M';

// 3d first-hit rulesets: <zone K|V|W><arrow ordinal 1..maxArrows>, or 'M' for no hit
export type ThreeDScoreValue =
  | 'K1' | 'K2' | 'K3'
  | 'V1' | 'V2' | 'V3'
  | 'W1' | 'W2' | 'W3'
  | 'M';

export type ScoreValue = RingScoreValue | ThreeDScoreValue; // 'M' shared, means miss in both
```

`dfbv-3arrow` permits all ten. `dfbv-hunter` permits only `K1 / V1 / W1 / M`.

## Ruleset model (`src/lib/fixtures/threeDRulesets.ts`, new)

```ts
export interface ThreeDRuleset {
  id: ThreeDRulesetId;
  label: string;                 // "3-Pfeil-Runde", "Hunter-Runde"
  entriesPerTarget: 1 | 2;       // 1 near-term
  maxArrows: 1 | 2 | 3;          // hunter 1, 3-arrow 3
  options: { token: ThreeDScoreValue; label: string; points: number }[]; // ScorePicker grid, in order
  targetMax: number;             // 20
  tieBreak: { label: string; tokens: ThreeDScoreValue[] }[]; // [{ "Kill", [K1,K2,K3] }, { "Vital", [V1,V2,V3] }]
}
```

DFBV SpO 2024 §6.7.8 point values for `dfbv-3arrow`:
`K1 20, V1 18, W1 16, K2 14, V2 12, W2 10, K3 8, V3 6, W3 4, M 0`.
`dfbv-hunter` (§6.7.9): `K1 20, V1 18, W1 16, M 0`.

Pure scoring kernel:

```ts
// tokens.length === entriesPerTarget when the target is complete
scoreTarget(ruleset: ThreeDRuleset, tokens: ScoreValue[]): { points: number; complete: boolean }
//  entriesPerTarget === 1: points = option(tokens[0])?.points ?? 0; complete = tokens.length === 1
//  entriesPerTarget === 2 (later): sum zone points of both tokens; complete = tokens.length === 2
```

## Downstream changes

| File | Change |
|---|---|
| `scoreCompletion.ts` | `arrowScoreValue` / `calculatePasseSum` gain a 3d branch that delegates to `scoreTarget`. New `isTournamentComplete(shooters, roundConfig, scores)` that routes on `scoringMode`: 3d = one record per (shooter, round, station); rings = existing `areAllScoresEntered` arrow-loop. |
| `ranking.ts` | `computeShooterSum` / `computeShooterRoundSums` take a **scoring context** (record → points, resolved per-round from `roundRulesets` or from `rings`). `assignRanks` compares a **tuple** `[sum, ...tieBreakCounts]` in 3d (rings stays sum-only, tie broken by name as today). `RankedRow`: add `tieBreakCounts: number[]` + labels; keep the existing ring-bucket fields for the rings-mode PDF. |
| `sortComparators.ts` | 3d sum column already works; no change needed for entry-table sorting. |
| `ScorePicker.svelte` | New outcome-grid variant. 3-arrow: 3×3 (rows K/V/W × cols 1./2./3. Pfeil) + full-width **Fehlschuss**. Hunter: single K/V/W row + Fehlschuss. One tap writes the token and the card advances. |
| `ScoreEntry.svelte` | 3d ⇒ byArcher card layout is the only layout; picker cell resolves the round's ruleset. `arrowsPerPasse`-based arrow columns replaced by a single outcome cell per station row. |
| `SetupRounds.svelte` / Setup | `scoringMode` segmented control. 3d ⇒ "3D-Aufbau" panel: number of legs, per-leg ruleset dropdown, stations-per-round; rings/preset/rounds block hidden. |
| `Results.svelte` / `ResultsTable.svelte` | Per-leg sum columns labelled by ruleset; total; tie-break count columns (Kill/Vital/Wound). |
| `scoresheetExport.ts`, `pdfExport.ts` | 3d column sets (late slice). `certificateExport.ts` largely unaffected (name/class/rank/sum). |
| `PresetSave.svelte` / `PresetList.svelte` | Whitelist + restore `scoringMode`, `roundRulesets`. Rings presets omit them. |

## Build slices

1. **Schema + ruleset core** — widen `ScoreValue`; add `RoundConfig` fields; `threeDRulesets.ts` (`dfbv-3arrow`, `dfbv-hunter`, `scoreTarget`); unit tests. Nothing wired.
2. **Scoring / completion / ranking generalization** — scoring context, tuple `assignRanks`, `isTournamentComplete`; tests prove rings output byte-identical.
3. **Setup 3D panel** — `scoringMode` toggle, 3D config UI + persistence, preset whitelist.
4. **Score entry** — outcome-grid `ScorePicker` variant + `ScoreEntry` 3d wiring on the byArcher card.
5. **Results view** — ruleset-driven columns + tie-break display.
6. **PDF exports** — scoresheet + results-table 3d variants.
7. **E2E + docs** — offline 3D happy-path e2e; README / SPECS.md; milestone close-out.

## Still open (decide during build)

- Exact `ScorePicker` grid layout & German labels for the 3-arrow outcome (3×3 + Miss vs a flat 10-button list).
- Whether an all-miss 3-arrow target records how many arrows were shot — DFBV scores all-miss as 0 regardless, so probably not.
- Continuous "Ziel N" numbering across legs vs restart per leg (cosmetic).
- Certificate heading wording for 3D (already a configurable setting).
