# Phase 9: Rings-Aware Score Entry & PDF Output - Research

**Researched:** 2026-07-12
**Domain:** Svelte 5 component prop-threading + jsPDF/autoTable header generation, in an existing small codebase (no new libraries needed)
**Confidence:** HIGH — all findings are direct file/line reads of the current codebase, no external library research required.

## Summary

Phase 8 landed `RoundConfig.rings?: 10 | 5` (default 10) in `db.rounds`, but nothing downstream reads it yet. Three sites hardcode 10-ring behavior: `ScorePicker.svelte` (button set, colors, keyboard map), `ranking.ts`/`pdfExport.ts` (hit-count column "X/10/9"), and — critically — `scoreCompletion.ts`'s `arrowScoreValue()`, which hardcodes `X → 10` regardless of rings mode. This last one is **not explicitly named in TARGET-05..08 but is a correctness bug for 5-ring tournaments**: under DFBV 5-ring rules X is worth 5 points, not 10, so passe sums, round sums, tournament sums, and rankings would all be wrong for any 5-ring tournament without a fix here. This must be flagged to the user/planner even though it falls outside the four requirement IDs as literally worded.

`ScoreEntry.svelte` already holds `roundsConfig` (a `$derived` from `liveQuery(() => db.rounds.get(1))`) and passes discrete config fields into `ScorePicker`/`ScoreTable` as props — no existing "config object" is threaded, each field is passed individually. Adding a `rings` prop follows the same pattern used for `arrowsPerPasse`.

The PDF header/hit-count logic in `pdfExport.ts` and `ranking.ts` is pure and framework-free; `Results.svelte` already has `roundsConfig` in scope and already passes a `Pick<RoundConfig, 'numberOfRounds'>` into the PDF functions, so widening that `Pick` to include `rings` is a small, well-precedented change.

**Primary recommendation:** Thread `rings: 10 | 5` from `db.rounds` through (1) `arrowScoreValue`/`calculatePasseSum` (fix the 5-ring point-value bug), (2) `ScorePicker`'s value/color/keyboard logic via a new `rings` prop from `ScoreEntry.svelte`, and (3) `ranking.ts`/`pdfExport.ts`'s hit-count computation and PDF header text via the already-threaded `roundsConfig` pick, widened to include `rings`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Score point-value resolution (`arrowScoreValue`) | Pure util (`scoreCompletion.ts`) | — | Already a pure function; only needs a `rings` parameter, no new tier |
| ScorePicker value set/colors/keyboard | UI component (`ScorePicker.svelte`) | View (`ScoreEntry.svelte` supplies `rings` prop) | Picker owns rendering, view owns data-fetch — matches existing prop-threading pattern (`arrowsPerPasse`, `rowPreview`) |
| Score table cell color (if added) | UI component (`ScoreTable.svelte`) | View (`ScoreEntry.svelte`) | Same tier split as picker; currently table has NO color-coding at all (see Pitfall 4) |
| Hit-count computation (X/10/9 vs X/5) | Pure util (`ranking.ts`) | — | Already pure, already computes `countX/count10/count9`; needs a rings-aware variant |
| PDF header text + column shape | Pure util (`pdfExport.ts`) | View (`Results.svelte` supplies `roundsConfig`) | Already receives `Pick<RoundConfig, 'numberOfRounds'>`; widen to add `rings` |

## Standard Stack

No new libraries required — this phase is pure internal refactoring/extension of existing Svelte 5 + Dexie + jsPDF code already in the repo. Skipping Package Legitimacy Audit (no packages installed this phase).

## Architecture Patterns

### Data flow (current, for reference)

```
db.rounds (Dexie, liveQuery)
  └─> ScoreEntry.svelte: roundsConfig = $derived($roundsQuery)
        ├─> passes roundsConfig.arrowsPerPasse → ScoreTable, ScorePicker's row logic
        └─> ScorePicker.svelte: SCORE_VALUES/buttonClass/KEY_TO_SCORE are MODULE-LEVEL
            CONSTANTS, not derived from any prop — rings-blind today

db.rounds (Dexie, liveQuery)
  └─> Results.svelte: roundsConfig = $derived($roundsQuery)
        └─> generateResultsPdf(classifications, classes, settings, includeIncomplete, roundsConfig)
              └─> buildResultsPdfDoc(...): reads roundsConfig.numberOfRounds only today;
                    head array hardcodes literal string 'X/10/9' (pdfExport.ts:163)
                    body rows hardcode `${row.countX}/${row.count10}/${row.count9}` (pdfExport.ts:29)
              └─> ranking.ts computeShooterHitCounts(): counts only 'X'/'10'/'9' (ranking.ts:47-61)

scoreCompletion.ts: arrowScoreValue(value) — hardcodes X→10, all other values Number(value).
  Called by: calculatePasseSum (ScoreEntry row sums), computeShooterSum/computeShooterRoundSums
  (ranking.ts, tournament-wide sums/rankings). NOT rings-aware today — this is the point-value bug.
```

### Recommended prop-threading pattern

`ScoreEntry.svelte` already does `roundsConfig = $derived($roundsQuery)` and reads `roundsConfig.arrowsPerPasse` directly in JSX-like template bindings (`ScoreTable.svelte:319 arrowsPerPasse={roundsConfig.arrowsPerPasse}`). The rings value should be threaded the same way:

```svelte
<!-- ScoreEntry.svelte, near line 319 -->
<ScorePicker
  open={pickerCell !== null}
  shooterName={pickerShooterName}
  rowPreview={pickerRowPreview}
  rings={roundsConfig.rings ?? 10}
  onselect={handleScoreSelect}
  oncancel={cancelPicker}
/>
```

`ScorePicker.svelte` needs `rings` added to its `$props()` destructure (currently `open, shooterName, rowPreview, onselect, oncancel` — ScorePicker.svelte:14-26) and its three module-level constants (`SCORE_VALUES`, `scoreColorCategory` call, `KEY_TO_SCORE`) converted to `$derived` values or functions parameterized by `rings`.

### Code Examples

**Current ScorePicker constants that need to become rings-aware** (ScorePicker.svelte:30-92):
```typescript
// TODAY — module-level, rings-blind:
const SCORE_VALUES: ScoreValue[] = ['1','2','3','4','5','6','7','8','9','10','X','M'];
const KEY_TO_SCORE: Record<string, ScoreValue> = {
  '1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','0':'10',x:'X',m:'M',
};
```
For 5-ring mode, `SCORE_VALUES` must shrink to `['1','2','3','4','5','X','M']` (no '6'-'10' buttons — those values are not valid on a 5-ring face), and `KEY_TO_SCORE` must drop the `'6'`-`'9'` and `'0'→'10'` mappings (pressing those keys should be a no-op, not silently insert an invalid 10-ring value). This directly resolves TARGET-06's "digit 5 must resolve unambiguously": in 5-ring mode, key `5` maps to ScoreValue `'5'` (5 points, white), and key `x` maps to `'X'` (5 points, white) — both distinct stored values, same point value and same color, so no *keyboard* ambiguity exists once the value-set is correctly scoped; the ambiguity risk is purely about not letting 10-ring-only keys (`6`-`9`, `0`) leak through in 5-ring mode.

**Current color mapping** (`scoreColor.ts`, all 12 lines) is a pure function `scoreColorCategory(value: ScoreValue): ScoreColorCategory` that does NOT take rings into account — `'5'` always resolves to `'blue'`. This function needs a `rings` parameter:
```typescript
export function scoreColorCategory(value: ScoreValue, rings: 10 | 5 = 10): ScoreColorCategory {
  if (value === 'M') return 'miss';
  if (rings === 5) {
    if (value === 'X' || value === '5') return 'white';
    return 'blue'; // 4,3,2,1 — DFBV rings 4-1 are one dark-blue band per locked decision
  }
  if (value === 'X' || value === '10' || value === '9') return 'yellow';
  if (value === '8' || value === '7') return 'red';
  if (value === '6' || value === '5') return 'blue';
  if (value === '4' || value === '3') return 'black';
  return 'white';
}
```
Note the locked decision specifies "dark blue" for 5-ring 4-1, distinct from the existing 10-ring `'blue'` (`bg-blue-500`) — the planner should decide whether this needs a new `ScoreColorCategory` variant (e.g. `'darkblue'`) with its own Tailwind classes in `ScorePicker.svelte`'s `buttonClass()`, or reuses the existing `'blue'` category with the same visual weight. Given the locked decision explicitly says "dark blue" (not the same blue as 10-ring's 6/5 band), a new category is the more literal implementation — flag as open question below.

**arrowScoreValue fix** (scoreCompletion.ts:6-9) — the actual scoring-correctness bug:
```typescript
// TODAY:
export function arrowScoreValue(value: ScoreValue): number {
  if (value === 'M') return 0;
  if (value === 'X') return 10;
  return Number(value);
}
// NEEDED for 5-ring correctness (X and '5' both worth 5 points on a 5-ring face):
export function arrowScoreValue(value: ScoreValue, rings: 10 | 5 = 10): number {
  if (value === 'M') return 0;
  if (value === 'X') return rings === 5 ? 5 : 10;
  return Number(value);
}
```
This function is called from `calculatePasseSum` (ScoreEntry.svelte row sums, ScoreTable display), `computeShooterSum`, and `computeShooterRoundSums` (ranking.ts — tournament sums and PDF round-column values). ALL call sites need a `rings` argument threaded through, or scores for 5-ring tournaments will silently over-count X-hits by 5 points each. `numeric '5'` already resolves correctly via `Number(value)` in both modes since it's the same digit either way — only `'X'` is ambiguous.

**PDF header + hit-count widening** (pdfExport.ts:69, 163; ranking.ts:47-61):
```typescript
// pdfExport.ts: widen the Pick type and compute header conditionally
export async function buildResultsPdfDoc(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined,
  includeIncomplete: boolean,
  roundsConfig?: Pick<RoundConfig, 'numberOfRounds' | 'rings'>   // ADD 'rings'
): Promise<jsPDF> {
  const rings = roundsConfig?.rings ?? 10;
  // ...
  const hitCountHeader = rings === 5 ? 'X/5' : 'X/10/9';
  const head = ['Rang', 'Name', ...roundHeaders, hitCountHeader, 'Gesamt'];
```
`Results.svelte:76` already passes `roundsConfig` (the full `RoundConfig` object, which already has `.rings` since Phase 8) into `generateResultsPdf` — the `Pick<>` type just needs widening; no new plumbing required at the call site.

`ranking.ts`'s `computeShooterHitCounts` (line 47) and `RankedRow` (line 21-24: `countX/count10/count9`) need a rings-aware sibling or an additional `count5` field so `buildClassTableRows` (pdfExport.ts:18-32, currently hardcodes `` `${row.countX}/${row.count10}/${row.count9}` `` at line 29) can format `X/5` = `${row.countX + row.count5}` for 5-ring, vs. the existing `X/10/9` triplet for 10-ring. Both `computeShooterHitCounts` and `computeClassRankings` need a `rings` parameter threaded down from `RoundConfig`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rings-conditional value/color logic | A second parallel ScorePicker component | Parameterize existing `scoreColorCategory()`, `SCORE_VALUES`, `KEY_TO_SCORE` with a `rings` argument | Existing functions are already small pure functions/constants — trivial to parameterize, no duplication needed |

**Key insight:** every piece of rings-aware logic needed for this phase is a small parameter addition to an already-pure function (`arrowScoreValue`, `scoreColorCategory`, `computeShooterHitCounts`) or an already-threaded prop (`roundsConfig` in `ScoreEntry.svelte`/`Results.svelte`). No new architecture, no new state management, no new library.

## Common Pitfalls

### Pitfall 1: `arrowScoreValue('X')` hardcodes 10 points — NOT covered by literal requirement wording but a correctness bug
**What goes wrong:** Any 5-ring (DFBV) tournament where a shooter scores an X (bullseye) will have that arrow counted as 10 points in all sums/rankings/PDF output, when DFBV rules say X = 5 points on a 5-ring face.
**Why it happens:** `scoreCompletion.ts:8` hardcodes `if (value === 'X') return 10;` with no rings context — this function predates Phase 8's rings field entirely.
**How to avoid:** Add a `rings: 10 | 5` parameter to `arrowScoreValue` (default 10, preserving existing 10-ring call sites without changes elsewhere unless updated), thread it from `roundsConfig.rings` at every call site (`calculatePasseSum` in ScoreEntry.svelte's row-sum computation, `computeShooterSum`/`computeShooterRoundSums` in ranking.ts).
**Warning signs:** A 5-ring tournament's sums are inflated whenever an X is scored; results/rankings for DFBV tournaments would be silently wrong even though the UI shows the correct "X" label.
**Recommendation for planner:** raise this to the user explicitly — it's outside TARGET-05..08's literal text but directly threatens TARGET-08's "score values... display correctly" intent and the app's stated Core Value ("score entry and results ranking must work correctly"). Likely needs to be added as an implicit sub-task even if not a separate requirement ID, or flagged back to `/gsd:discuss-phase` before planning.

### Pitfall 2: `SCORE_VALUES`/`KEY_TO_SCORE` are module-level constants, not reactive
**What goes wrong:** If a naive fix computes rings-aware value sets as plain top-level `const`, they won't update if `rings` prop changes (e.g. component re-render with new prop value) since Svelte 5 runes require `$derived`/`$derived.by()` for values that depend on props.
**Why it happens:** Current code (ScorePicker.svelte:30-43, 79-92) defines these as plain module-scope `const`, safe today only because they're rings-invariant constants.
**How to avoid:** Convert to `$derived.by(() => ...)` computed from the new `rings` prop, following the same pattern already used for `previewText` (ScorePicker.svelte:28) and `pickerRowPreview` in ScoreEntry.svelte.
**Warning signs:** Picker shows stale 10-ring buttons on a freshly opened 5-ring tournament until a full page reload.

### Pitfall 3: `ScoreTable.svelte` cells have NO color-coding today — a rings-aware picker without a rings-aware table creates a UI inconsistency
**What goes wrong:** `ScoreTable.svelte`'s arrow cells (lines ~152-166) render only `bg-teal-50`/`bg-slate-100` (filled/unfilled), no ring-color mapping at all — this is NOT currently derived from `scoreColorCategory`. If only the picker dialog becomes rings-aware/colored, the underlying table stays visually flat/uncolored for both modes — actually consistent with itself, but worth flagging since the research brief's question 5 asks about it directly.
**Why it happens:** Color-coding was apparently scoped to the picker dialog only in Phase 3, never extended to the table.
**How to avoid:** Since the table currently has NO color-coding in either mode, adding rings-awareness to the picker alone does NOT introduce a *new* inconsistency (there was none to begin with — cells were always uncolored). No table changes are required to satisfy TARGET-05 as literally worded. If the trainer expectation is that the table SHOULD match the picker's colors, that would be a new feature beyond TARGET-05..08 and should be confirmed with the user, not assumed.
**Warning signs:** None if scope stays as literally required; flag to user only if they expected colored table cells.

### Pitfall 4: DFBV "dark blue" is not the same Tailwind color as WA's existing `blue-500`/`blue-600`
**What goes wrong:** Reusing the existing `'blue'` `ScoreColorCategory` (and its `bg-blue-500`/`bg-blue-600` classes) for 5-ring rings 4-1 would visually match the 10-ring 6/5 band, when the locked decision specifies "dark blue" as presumably visually distinct.
**Why it happens:** `buttonClass()` (ScorePicker.svelte:51-71) has one branch per category; there is no existing "darkblue" category or Tailwind class.
**How to avoid:** Add a new `ScoreColorCategory` variant (e.g. `'darkblue'`) with a genuinely darker shade (e.g. `bg-blue-800`/`bg-blue-900`) distinct from the existing `blue-500`/`blue-600` used for 10-ring 6/5, per the locked spec wording. This is a planner decision point, not resolved by this research — flagged in Open Questions.

## Code Examples

See Architecture Patterns section above — all examples are concrete diffs against files in this repo, not external library snippets.

## Runtime State Inventory

Not applicable — this is a code-logic phase, not a rename/refactor/migration phase. No stored data, service config, OS-registered state, secrets, or build artifacts are affected. `RoundConfig.rings` was already added to the schema in Phase 8 with no Dexie `.version()` bump required (optional field, `?? 10` fallback pattern); Phase 9 only adds read-side consumption of that existing field.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | "Dark blue" for 5-ring rings 4-1 should be a visually distinct Tailwind shade from existing `blue-500`/`blue-600` (10-ring 6/5), requiring a new `ScoreColorCategory` variant | Pitfall 4 / Code Examples | Low — worst case, planner reuses existing `'blue'` category and colors look too similar to 10-ring; easy to adjust later, purely cosmetic |
| A2 | The `arrowScoreValue('X')` = 10-points-always bug is in-scope for this phase (not deferred) despite not being named in TARGET-05..08's literal text | Pitfall 1 / Summary | High if wrong assumption — if descoped, DFBV tournament results would be silently incorrect, contradicting the app's stated Core Value |

## Open Questions

1. **Should `arrowScoreValue`'s X=10-always bug be fixed in this phase, or is it already out of scope / already handled elsewhere?**
   - What we know: `scoreCompletion.ts:6-9` hardcodes X→10 regardless of rings; no other file overrides or corrects this for 5-ring tournaments.
   - What's unclear: TARGET-05..08 as literally worded only mention ScorePicker display, keyboard entry, PDF header text, and "no crash on inspect" — none explicitly says "point values must be correct per rings mode."
   - Recommendation: Surface this to the user before/during planning — likely needs either an added task under Phase 9 or an explicit requirements amendment, since shipping 5-ring support with wrong point totals would defeat the milestone's purpose ("get correct scoring options, colors, and PDF output").

2. **Does the "dark blue" 5-ring color need a new distinct Tailwind shade, or can it reuse the existing `blue` category?**
   - What we know: locked decision text says "rings 4 down to 1 all one dark blue" — distinct wording from the 10-ring spec's plain "blue" for 6/5.
   - What's unclear: whether "dark blue" is meant as a deliberately different shade (visual distinction from 10-ring blue) or just descriptive language for the existing blue.
   - Recommendation: planner/user should confirm exact Tailwind shade (e.g. `blue-800` vs `blue-500`) before implementation; low-risk either way, easy to adjust.

3. **Does `computeShooterHitCounts`/`RankedRow` need a new `count5` field, or should 5-ring hit-counting reuse `countX`/an existing field creatively?**
   - What we know: current shape is `{countX, count10, count9}`, fixed at 3 fields, used to build the literal `X/10/9` string.
   - What's unclear: cleanest schema for a 5-ring `X/5` count — add `count5: number` alongside existing fields (simplest, most explicit) vs. reusing `count10` as a generic "top-ring-below-X" bucket (more confusing).
   - Recommendation: add `count5` as a new field; the small proliferation of fields is cheaper than overloading existing field semantics.

## Environment Availability

Not applicable — no external tools/services/runtimes are needed for this phase; it's pure in-repo TypeScript/Svelte logic changes to files that already exist and already compile/test successfully (per Phase 8 summaries: `npx tsc --noEmit` clean, 188/188 tests passing as of Phase 8 completion).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (confirmed running in Phase 8: `npx vitest run` — 188/188 pass) |
| Config file | Standard Vite-integrated config (no separate vitest.config found referenced; shares `vite.config.ts`) |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TARGET-05 | ScorePicker shows correct value/color set per rings | unit/component | `npx vitest run src/lib/components/ScorePicker.test.ts` | ❌ Wave 0 — no `ScorePicker.test.ts` found in repo; needs creation |
| TARGET-06 | Keyboard entry resolves correctly per rings | unit/component | same file as above (keydown simulation) | ❌ Wave 0 — same file |
| TARGET-07 | PDF header reads "X/10/9" vs "X/5" | unit | `npx vitest run src/lib/utils/pdfExport.test.ts` | ✅ file exists — needs new test cases added, not a new file |
| TARGET-08 | Stored scores under either rings mode display without crashing | unit | `npx vitest run src/lib/utils/scoreCompletion.test.ts` (if exists) or `ranking.test.ts` | Check — grep found no `scoreCompletion.test.ts`/`ranking.test.ts` explicitly during this research; planner should verify at execution time and create if missing |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched-file>.test.ts`
- **Per wave merge:** `npx vitest run` (full suite, mirrors Phase 8's verification step)
- **Phase gate:** Full suite green + `npx tsc --noEmit -p tsconfig.json` clean before `/gsd:verify-work`, matching Phase 8's exact verification pattern.

### Wave 0 Gaps
- [ ] `src/lib/components/ScorePicker.test.ts` — does not exist yet; needed to cover TARGET-05/06 (value set, color category, keyboard map under both rings modes)
- [ ] Confirm existence of `src/lib/utils/ranking.test.ts` and `src/lib/utils/scoreCompletion.test.ts` at execution time (not confirmed present or absent with certainty in this research pass — planner should `ls` these paths as a first task step)

## Security Domain

Not applicable — this app has `workflow.nyquist_validation` relevant testing above, but no auth/session/access-control/crypto surface is touched by this phase (pure client-side scoring display logic, no new external data or network surface). Skipping ASVS table as inapplicable to a fully offline, single-device, no-auth client app with no new I/O boundary introduced this phase.

## Sources

### Primary (HIGH confidence — direct codebase reads)
- `src/lib/components/ScorePicker.svelte` (full file read) — value/color/keyboard logic, lines 30-107
- `src/lib/views/ScoreEntry.svelte` (full file read) — roundsConfig threading pattern, lines 34-35, 317-333
- `src/lib/db/schema.ts` (full file read) — `RoundConfig.rings?: 10 | 5` at line 27, `ScoreValue` union at lines 51-64
- `src/lib/utils/scoreColor.ts` (full file read) — `scoreColorCategory()`, 16 lines total
- `src/lib/components/ScoreTable.svelte` (full file read) — confirms no existing color-coding on table cells
- `src/lib/utils/pdfExport.ts` (lines 1-195) — `buildClassTableRows` (line 18-32), `'X/10/9'` header literal (line 163), `roundsConfig` Pick type (line 69)
- `src/lib/utils/ranking.ts` (full file read) — `computeShooterHitCounts` (lines 47-61), `RankedRow` shape (lines 11-25)
- `src/lib/utils/scoreCompletion.ts` (lines 1-30 read) — `arrowScoreValue` (lines 6-9), the X=10-always bug
- `.planning/phases/08-rings-configuration/08-01-SUMMARY.md`, `08-02-SUMMARY.md` — confirms Phase 8's exact schema/UI changes and default-to-10 fallback pattern
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` — TARGET-05..08 wording, Phase 9 success criteria
- `./CLAUDE.md` — project tech-stack constraints (no new libraries relevant to this phase)

### Secondary / Tertiary
None — this research required no external web search; the entire phase is internal codebase extension.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, pure extension of existing verified code
- Architecture: HIGH — every prop-threading claim is a direct line-numbered read of the actual files
- Pitfalls: HIGH for Pitfalls 1-3 (direct code reads); MEDIUM for Pitfall 4's exact color choice (design judgment call, not a factual claim)

**Research date:** 2026-07-12
**Valid until:** No expiry concern — internal codebase research, valid until these files are next modified (i.e., through this phase's own execution).
