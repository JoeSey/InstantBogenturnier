# v2 — 3D outdoor tournaments: data-model design

Status: **design agreed, not yet implemented.** Branch: `feature/3d-tournaments`.
Companion research (rules, sources): see auto-memory `3d-archery-scoring-research.md`.

## Goal

Let the app run a DFBV-style 3D/field tournament: a course of N animal stations,
each archer shooting each station once, scored per-archer as a whole card, with
zone-based, arrow-ordinal-dependent points instead of ring values.

### Scope

**In (near-term):**
- Ruleset **templates** `dfbv-3arrow` and `dfbv-hunter` (both first-hit-counts, 1 entry
  per target, K/V/W zones).
- **Editable point tables**: each template ships DFBV default points; the trainer can
  override any cell per round (freie-3D shoots set their own values). No separate
  "custom ruleset" concept — a custom table is just a template with edited numbers.
- Configurable station count (course length), shared across all rounds.
- Configurable number of rounds ("legs"), each round gets its own template + points —
  a single tournament can be e.g. 3-Pfeil ×2 + Hunter ×1 with one combined ranking.
- Per-archer card entry (reuses the `entryMode` byArcher layout shipped in `b7d60b5`).
- Results with tie-break score → Kill count → Vital count.

**Deferred (design leaves room, no code yet):**
- Templates with a different zone structure: `dfbv-doppelhunter` (2 entries/target,
  both count), `wa-3d` (flat 11/10/8/5, 4 zones), a 2-zone kill/body Scandinavian
  template. The template carries `zones` + `entriesPerTarget` as data, so adding these
  is data + minor grid-layout work, not a reshape. Code should iterate `template.zones`
  from the start, not hard-code three.
- Per-round station counts (`passesPerRound` stays a single shared number for v2).
- PDF export polish is a late slice.

## Locked decisions

| Topic | Decision |
|---|---|
| Course plumbing | Reuse `rounds/passes`. Station = `passeIndex`, leg = `roundIndex`. **No `ScoreRecord` PK change, no Dexie version bump.** |
| Per-target storage | One outcome **token** per (shooter, round, station), `arrowIndex` always `0`. Token encodes zone + arrow ordinal. `arrowsPerPasse` semantically = entries-per-target (1 near-term). |
| Ruleset location | **Per-round**, stored **resolved** (not by id): `roundRulesets: { templateId; points }[]`, `length === numberOfRounds`. Combined ranking sums across legs. |
| Point values | Template = structure (zones, maxArrows, tie-break order) + default points. Per round the trainer may edit any point cell; edits are stored in that round's `points` map. Zone structure itself is not editable in v2 — pick a different template. |
| Station count | Single shared `passesPerRound` for all rounds. |
| Tie-break | score → Kill count → Vital count. |
| Partial / live scoring | No change — Results already shows everyone with an `isComplete` flag. |
| Mode switch | `scoringMode: '3d'` hides the WA-preset / rings / rounds block entirely; a dedicated "3D-Aufbau" panel replaces it. |
| Back-compat | `scoringMode` undefined ⇒ `'rings'`. Existing tournaments & presets untouched, zero migration. |

## Schema delta (`src/lib/db/schema.ts`)

```ts
export type ScoringMode = 'rings' | '3d';

// near-term templates; 'dfbv-doppelhunter' | 'wa-3d' | 'scandinavian-2zone' added later
export type ThreeDTemplateId = 'dfbv-3arrow' | 'dfbv-hunter';

// Resolved per-round ruleset stored on the tournament: which template, plus the
// (possibly trainer-edited) point value for every token that template permits.
export interface RoundRuleset {
  templateId: ThreeDTemplateId;
  points: Partial<Record<ScoreValue, number>>; // seeded from template.defaultPoints; 'M' always 0
}

export interface RoundConfig {
  id?: number;
  arrowsPerPasse: number;    // rings: arrows/passe. 3d: entries per target (1 near-term)
  passesPerRound: number;    // 3d: stations per round (course length), shared across rounds
  numberOfRounds: number;    // 3d: number of legs
  distance?: string;
  presetId?: string;
  rings?: 10 | 5;             // ignored when scoringMode === '3d'
  entryMode?: ScoreEntryMode; // in 3d, default to 'byArcherLine' if unset
  scoringMode?: ScoringMode;       // undefined === 'rings'
  roundRulesets?: RoundRuleset[];  // 3d only; index i = ruleset for roundIndex i
}
```

No new index → no `.version()` bump. IndexedDB stores `value` as a string and
`roundRulesets` as a plain nested object, so widening the `ScoreValue` union and
adding these fields is a compile-time-only change.

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

## Ruleset model

### Templates — structure + default numbers (`src/lib/fixtures/threeDTemplates.ts`, new)

A template is fixed data: which zones exist, how many arrows, the tie-break order, and
a set of **default** point values. Trainers pick a template and then may edit the
numbers; they never edit the structure.

```ts
export interface ThreeDTemplate {
  id: ThreeDTemplateId;
  label: string;                    // "3-Pfeil-Runde", "Hunter-Runde"
  entriesPerTarget: 1 | 2;          // 1 near-term
  maxArrows: 1 | 2 | 3;             // hunter 1, 3-arrow 3
  zones: { zone: 'K' | 'V' | 'W'; label: string }[];  // ordered high→low; code iterates this, never hard-codes 3
  // every token the template permits = zone × ordinal (1..maxArrows), plus 'M'
  tokens: ScoreValue[];             // e.g. ['K1','V1','W1','K2',... ,'M']  — also the ScorePicker order
  defaultPoints: Partial<Record<ScoreValue, number>>;  // 'M' → 0
  targetMax: number;                // 20
  tieBreak: ('K' | 'V' | 'W')[];    // ['K','V','W'] → tie broken by Kill count, then Vital count
}
```

`dfbv-3arrow` default points (DFBV SpO 2024 §6.7.8):
`K1 20, V1 18, W1 16, K2 14, V2 12, W2 10, K3 8, V3 6, W3 4, M 0`.
`dfbv-hunter` (§6.7.9): tokens `K1 20, V1 18, W1 16, M 0`.

### Resolving a round's ruleset

`resolveRuleset(roundRuleset: RoundRuleset): ResolvedRuleset` merges the stored
`points` over `template.defaultPoints` and returns a ready-to-use object (structure
from the template, numbers from the merge). The UI seeds `RoundRuleset.points` from
`defaultPoints` when a template is chosen, then writes back only edited cells.

### Pure scoring kernel

```ts
// tokens.length === entriesPerTarget when the target is complete
scoreTarget(rs: ResolvedRuleset, tokens: ScoreValue[]): { points: number; complete: boolean }
//  entriesPerTarget === 1: points = rs.points[tokens[0]] ?? 0;  complete = tokens.length === 1
//  entriesPerTarget === 2 (later): sum the two tokens' zone points; complete = tokens.length === 2
```

## Downstream changes

| File | Change |
|---|---|
| `scoreCompletion.ts` | `arrowScoreValue` / `calculatePasseSum` gain a 3d branch that delegates to `scoreTarget`. New `isTournamentComplete(shooters, roundConfig, scores)` that routes on `scoringMode`: 3d = one record per (shooter, round, station); rings = existing `areAllScoresEntered` arrow-loop. |
| `ranking.ts` | `computeShooterSum` / `computeShooterRoundSums` take a **scoring context** (record → points, resolved per-round via `resolveRuleset(roundRulesets[i])` or from `rings`). `assignRanks` compares a **tuple** `[sum, ...tieBreakCounts]` in 3d (rings stays sum-only, tie broken by name as today). `tieBreakCounts` are counts of tokens whose zone ∈ each `template.tieBreak` entry. `RankedRow`: add `tieBreakCounts: number[]` + labels; keep the existing ring-bucket fields for the rings-mode PDF. |
| `sortComparators.ts` | 3d sum column already works; no change needed for entry-table sorting. |
| new `ScoreOutcomeGrid.svelte` | 3d picker: rows = `template.zones` (K/V/W), cols = `1..maxArrows` (`1./2./3. Pfeil`), + full-width **Fehlschuss**. Hunter (`maxArrows === 1`) collapses to one row + Fehlschuss. One tap writes the token and the card advances. Reused by `ScorePicker` or swapped in by `ScoreEntry`. |
| `ScoreEntry.svelte` | 3d ⇒ byArcher card layout is the only layout; picker resolves the round's ruleset via `resolveRuleset`. `arrowsPerPasse`-based arrow columns replaced by a single outcome cell per station row. |
| `SetupRounds.svelte` / Setup | `scoringMode` segmented control. 3d ⇒ "3D-Aufbau" panel: number of legs, stations-per-round, and per-leg: a template dropdown + an **editable point grid** (rows = zones, cols = ordinals; pre-filled from `defaultPoints`; per-round "(Standard)"/"(angepasst)" badge; "zurücksetzen" per round). rings/preset/rounds block hidden. |
| new `ThreeDPointGrid.svelte` | The editable matrix component used by the Setup 3D panel — numeric inputs, validates ≥ 0 integers, emits `points` back to the round. |
| `Results.svelte` / `ResultsTable.svelte` | Per-leg sum columns labelled by template; total; tie-break count columns (Kill/Vital/Wound). |
| `scoresheetExport.ts`, `pdfExport.ts` | 3d column sets (late slice). `certificateExport.ts` largely unaffected (name/class/rank/sum). |
| `PresetSave.svelte` / `PresetList.svelte` | Whitelist + restore `scoringMode`, `roundRulesets` (resolved objects incl. any edited points). Rings presets omit them. |

## Build slices

1. **Schema + ruleset core** — widen `ScoreValue`; add `RoundConfig` fields + `RoundRuleset`; `threeDTemplates.ts` (`dfbv-3arrow`, `dfbv-hunter`); `resolveRuleset` + `scoreTarget`; unit tests. Nothing wired.
2. **Scoring / completion / ranking generalization** — scoring context, tuple `assignRanks`, `isTournamentComplete`; tests prove rings output byte-identical.
3. **Setup 3D panel** — `scoringMode` toggle, 3D config UI incl. `ThreeDPointGrid` editable point tables + persistence, preset whitelist.
4. **Score entry** — `ScoreOutcomeGrid` + `ScoreEntry` 3d wiring on the byArcher card.
5. **Results view** — ruleset-driven columns + tie-break display.
6. **PDF exports** — scoresheet + results-table 3d variants.
7. **E2E + docs** — offline 3D happy-path e2e; README / SPECS.md; milestone close-out.

## Still open (decide during build)

- Exact `ScoreOutcomeGrid` layout & German labels for the 3-arrow outcome (3×3 + Miss vs a flat 10-button list).
- `ThreeDPointGrid` UX: inline in the leg row vs. an expandable "Punkte anpassen" disclosure; whether to allow non-monotonic values (later arrow worth more than earlier) or warn.
- Whether editing points after scores exist is allowed (re-scores retroactively) or locked once the first score is entered — lean: allow until finalize, same as other config.
- Whether an all-miss 3-arrow target records how many arrows were shot — DFBV scores all-miss as 0 regardless, so probably not.
- Continuous "Ziel N" numbering across legs vs restart per leg (cosmetic).
- Certificate heading wording for 3D (already a configurable setting).
