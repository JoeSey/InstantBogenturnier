# Phase 4: Results - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 16 (10 new, 6 modified)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/utils/scoreCompletion.ts` (EXTEND: `computeIsFinalized`) | utility | transform | itself (existing `areAllScoresEntered`/`isPasseComplete` in same file) | exact |
| `src/lib/utils/ranking.ts` (NEW) | utility | transform/CRUD-aggregation | `src/lib/utils/scoreCompletion.ts` | exact (style/role) |
| `src/lib/utils/ranking.test.ts` (NEW) | test | — | `src/lib/utils/scoreCompletion.test.ts` | exact |
| `src/lib/utils/scoreCompletion.test.ts` (EXTEND) | test | — | itself | exact |
| `src/lib/components/ResultsTable.svelte` (NEW) | component | request-response (props-in, render-out) | `src/lib/components/ScoreTable.svelte` | exact |
| `src/lib/components/ClassSelector.svelte` (NEW) | component | event-driven (onchange) | `src/lib/components/RoundPasseSelector.svelte` | exact |
| `src/lib/views/Results.svelte` (NEW, replaces `ResultsPlaceholder.svelte`) | view | streaming (liveQuery) + event-driven (reset) | `src/lib/views/ScoreEntry.svelte` (liveQuery/derived) + `src/lib/views/Registration.svelte` (dual-render table/card) | exact |
| `src/lib/views/Results.test.ts` (NEW) | test | — | `src/lib/views/ScoreEntry.test.ts` | exact |
| `src/App.svelte` (MODIFY: swap `ResultsPlaceholder` → `Results`) | route/provider | request-response | itself | exact |
| `src/lib/views/Setup.svelte` (MODIFY: add isFinalized guard on lines input) | view | CRUD + event-driven guard | `src/lib/views/ScoreEntry.svelte` (isFinalized derivation) | role-match |
| `src/lib/views/SetupRounds.svelte` (MODIFY: add isFinalized prop, disable form) | component | CRUD + event-driven guard | `src/lib/views/ScoreEntry.svelte` (disabled-input pattern in `ScoreTable.svelte`) | role-match |
| `src/lib/components/ClassForm.svelte` (MODIFY: guard delete-class button) | component | CRUD + event-driven guard | itself (existing `deleteBlocked` guard pattern) + `Registration.svelte` delete-button | exact |
| `src/lib/views/Registration.svelte` (MODIFY: guard delete-shooter button) | view | CRUD + event-driven guard | `src/lib/views/ScoreEntry.svelte` (isFinalized-gated `disabled` on picker button) | exact |
| `src/lib/views/Registration.test.ts` (NEW — does not exist today) | test | — | `src/lib/views/ScoreEntry.test.ts` | exact |
| `src/lib/i18n/strings.de.ts` (MODIFY: add `results` section) | config | — | itself (existing `scoring`/`registration` sections) | exact |
| `e2e/results.spec.ts` (NEW) | test | — | `e2e/scoring.spec.ts` + `e2e/nav.spec.ts` | exact |

## Pattern Assignments

### `src/lib/utils/ranking.ts` (utility, transform)

**Analog:** `src/lib/utils/scoreCompletion.ts` (full file, 72 lines — read in one pass)

**Module style / banner-comment convention** (lines 1-10):
```typescript
import type { ScoreValue, ScoreRecord } from '../db/schema';

// Pure functions implementing the WA scoring convention (D-02, SCORE-02): M (miss)
// counts as 0, X (inner-ten) counts as 10. Framework-free, no side effects.

export function arrowScoreValue(value: ScoreValue): number {
  if (value === 'M') return 0;
  if (value === 'X') return 10;
  return Number(value);
}
```
`ranking.ts` MUST follow this exact convention: plain exported functions, no framework imports, a banner comment above each function/group referencing the decision/requirement IDs it implements (D-01/D-02/RES-01/RES-02), and MUST `import { arrowScoreValue, areAllScoresEntered } from './scoreCompletion'` rather than reimplementing the M/X mapping (Pitfall 2 in 04-RESEARCH.md).

**Core aggregation pattern** — new, no direct prior analog for "sum across ALL rounds/passes" (existing `calculatePasseSum` at scoreCompletion.ts:12-14 is scoped to one round/passe only — do not reuse it as a per-passe-then-sum loop):
```typescript
// scoreCompletion.ts:12-14 — the ONE-PASSE-SCOPED sibling function; ranking.ts's
// computeShooterSum must NOT call this per-passe-then-sum, per Pitfall 2.
export function calculatePasseSum(values: ScoreValue[]): number {
  return values.reduce((sum, v) => sum + arrowScoreValue(v), 0);
}
```
Instead, `computeShooterSum` should filter `scores` by `shooterId` only and reduce with `arrowScoreValue` directly (flat filter+reduce, no round/passe scoping) — see 04-RESEARCH.md's fully worked `ranking.ts` Code Example (lines 172-263 of 04-RESEARCH.md) for the exact `computeShooterSum`, `isShooterComplete`, `assignRanks`, and `computeClassRankings` implementations to copy near-verbatim; this research example is itself the primary source to copy from for this file, since no prior analog performs tournament-wide (cross-round) aggregation.

**Completion-flag reuse pattern** (scoreCompletion.ts:16-44):
```typescript
export function areAllScoresEntered(
  shooterIds: number[],
  numberOfRounds: number,
  passesPerRound: number,
  arrowsPerPasse: number,
  scores: ScoreRecord[]
): boolean {
  const existingCells = new Set(
    scores.map((s) => `${s.shooterId}-${s.roundIndex}-${s.passeIndex}-${s.arrowIndex}`)
  );
  // ... nested loop over shooterIds x rounds x passes x arrows checking existingCells.has(key)
}
```
`isShooterComplete` in `ranking.ts` should call this exact function scoped to a single-element `shooterIds` array (`[shooterId]`), not reimplement per-shooter completeness checking.

### `src/lib/utils/scoreCompletion.ts` (EXTEND — add `computeIsFinalized`)

**Analog:** the inline expression this replaces, `src/lib/views/ScoreEntry.svelte:75`
```typescript
// ScoreEntry.svelte:73-75 — the CURRENT inline implementation to extract and replace
// with a call to the new shared function:
let isFinalized = $derived(allScores.length > 0 && allScores.every((s) => s.finalized));
```
Add to `scoreCompletion.ts` (append after `isPasseComplete`, same banner-comment convention):
```typescript
// D-09/D-10 (03-CONTEXT.md), extracted for RES-06 (04-CONTEXT.md D-12): a tournament
// is finalized once every persisted score record has finalized: true. Vacuously
// false when there are no records yet. Single source of truth — ScoreEntry.svelte
// and every RES-06-guarded view (Setup, SetupRounds, ClassForm, Registration) must
// call this instead of re-deriving the boolean inline.
export function computeIsFinalized(scores: ScoreRecord[]): boolean {
  return scores.length > 0 && scores.every((s) => s.finalized);
}
```
Then update `ScoreEntry.svelte:75` to `let isFinalized = $derived(computeIsFinalized(allScores));` and add the import at `ScoreEntry.svelte:7` (existing import line already destructures from `../utils/scoreCompletion`, just add `computeIsFinalized` to that list).

### `src/lib/utils/ranking.test.ts` (test)

**Analog:** `src/lib/utils/scoreCompletion.test.ts` (full file, 99 lines)

**Fixture-helper + describe/it structure** (lines 1-32):
```typescript
import { describe, it, expect } from 'vitest';
import {
  arrowScoreValue,
  calculatePasseSum,
  areAllScoresEntered,
  isPasseComplete,
} from './scoreCompletion';
import type { ScoreRecord } from '../db/schema';

function record(
  shooterId: number,
  roundIndex: number,
  passeIndex: number,
  arrowIndex: number
): ScoreRecord {
  return { shooterId, roundIndex, passeIndex, arrowIndex, value: '8', finalized: false };
}

// Behavior per 03-01-PLAN.md Task 1 <behavior> block (D-02, SCORE-02): M=0, X=10.
describe('arrowScoreValue', () => {
  it('treats M as 0', () => {
    expect(arrowScoreValue('M')).toBe(0);
  });
  // ...
});
```
`ranking.test.ts` should follow the identical `describe`-per-function / `it`-per-behavior structure, with a small `shooter()`/`record()` fixture builder. It MUST include the tie-break fixture mandated by 04-RESEARCH.md Pitfall 1: a 4-shooter fixture with a 2-way tie for rank 2, asserting ranks `[1, 2, 2, 4]` (not `[1, 2, 2, 3]`), plus a cross-round-sum fixture (2 rounds, asserting the total reflects both rounds — Pitfall 2) and an all-shooters-incomplete fixture (D-02: still ranked, `isComplete: false`).

### `src/lib/components/ResultsTable.svelte` (component, request-response)

**Analog:** `src/lib/components/ScoreTable.svelte` (full file, 158 lines)

**Module-context type export pattern** (ScoreTable.svelte:1-16):
```svelte
<script module lang="ts">
  import type { ScoreValue } from '../db/schema';

  export interface ScoreRow {
    shooterId: number;
    name: string;
    className: string;
    line: number | null;
    arrows: (ScoreValue | null)[];
    sum: number | null;
  }
</script>
```
`ResultsTable.svelte` should export a `RankedRow`-shaped props type the same way (or import `RankedRow` from `../utils/ranking` directly, since it's already exported there per 04-RESEARCH.md's Pattern 1).

**Opaque table shell + responsive column-hiding** (ScoreTable.svelte:58-63, 90-103, 133-135):
```svelte
<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
  <table class="w-full bg-white text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
    <thead>
      <tr class="border-b border-slate-200 text-left dark:border-slate-600">
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400" ...>
```
```svelte
<!-- Klasse column: hidden md:table-cell compaction (quick task 260705-p25) — the
     exact pattern to reuse for ResultsTable's "Schießplatz" column per UI-SPEC. -->
<th class="hidden md:table-cell p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400" ...>
...
<td class="hidden md:table-cell px-1.5 py-1.5 md:px-3 md:py-2">{row.className}</td>
```
Per UI-SPEC, `ResultsTable.svelte` uses `px-2 py-2 md:px-3 md:py-2` for data cells (not `ScoreTable`'s `px-1.5 py-1.5`) and `p-2 md:p-4` for headers (unchanged) — a deliberate spacing deviation, not a copy error. NO click-to-sort headers/`onsort` prop — Results columns are fixed-order (UI-SPEC "Results Table Structure"), unlike `ScoreTable`'s sortable headers (lines 66, 80, 94, 117 use `onclick={() => onsort(...)}` — omit this entirely in `ResultsTable`).

**Row rendering + fallback convention** (ScoreTable.svelte:131-154):
```svelte
{#each rows as row (row.shooterId)}
  <tr class="border-b border-slate-100 dark:border-slate-700">
    <td class="px-1.5 py-1.5 md:px-3 md:py-2">{row.line ?? '—'}</td>
    ...
    <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-right font-semibold"
      >{row.sum ?? strings.scoring.sumIncomplete}</td
    >
  </tr>
{/each}
```
Reuse the `row.line ?? '—'` fallback convention verbatim for the Schießplatz column. The rank-badge cell (podium accent) has no prior in-repo analog — copy the `{#snippet rankBadge(rank)}` block verbatim from 04-RESEARCH.md's Code Examples section ("Rank badge with accessible numeral", lines 416-434 of 04-RESEARCH.md) which already encodes the exact UI-SPEC color tokens.

### `src/lib/components/ClassSelector.svelte` (component, event-driven)

**Analog:** `src/lib/components/RoundPasseSelector.svelte` (full file, 73 lines)

**Props + native-select pattern** (lines 1-27, 30-45):
```svelte
<script lang="ts">
  import { strings } from '../i18n/strings.de';

  let {
    numberOfRounds,
    passesPerRound,
    selectedRound,
    selectedPasse,
    disabled,
    onRoundChange,
    onPasseChange,
    showAdvance,
    onAdvance,
  }: { /* ... */ } = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row md:items-end">
  <label class="flex flex-col gap-1">
    <span class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400"
      >{strings.scoring.roundLabel}</span
    >
    <select
      {disabled}
      value={selectedRound}
      onchange={(e) => onRoundChange(Number((e.target as HTMLSelectElement).value))}
      class="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] leading-[1.5] text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {#each Array.from({ length: numberOfRounds }) as _, i (i)}
        <option value={i}>{i + 1}</option>
      {/each}
    </select>
  </label>
</div>
```
`ClassSelector.svelte` follows the identical `<label><span>...label...</span><select onchange=...>` structure and Tailwind classes, but options are `{#each classes as cls (cls.id)}<option value={cls.id}>{cls.name}</option>{/each}` (alphabetically pre-sorted by the caller per D-04) instead of an index range, and it emits `onchange={(id) => ...}` with the numeric class id (cast via `Number(...)`, matching the `Number((e.target as HTMLSelectElement).value)` idiom above) rather than `onRoundChange`/`onPasseChange`.

### `src/lib/views/Results.svelte` (view, streaming + event-driven)

**Analog 1 (liveQuery/derived idiom):** `src/lib/views/ScoreEntry.svelte`

**Multi-query + `?? []` defaulting pattern** (ScoreEntry.svelte:21-32, addressing 04-RESEARCH.md Pitfall 6):
```typescript
const shootersQuery = liveQuery(() => db.shooters.toArray());
let shooters = $derived($shootersQuery ?? []);

const classesQuery = liveQuery(() => db.classes.toArray());
let classes = $derived($classesQuery ?? []);
let classNameById = $derived(new Map(classes.map((c) => [c.id, c.name])));

const roundsQuery = liveQuery(() => db.rounds.get(1));
let roundsConfig = $derived($roundsQuery);

const scoresQuery = liveQuery(() => db.scores.toArray());
let allScores = $derived($scoresQuery ?? []);
```
`Results.svelte` needs the same four queries (`shooters`, `classes`, `rounds`, `scores`) with identical `?? []` defaulting; `computeClassRankings` itself already null-guards `roundsConfig` (returns empty `Map`) so no extra `{#if}` guard is needed around it, only around the "empty state" render branch.

**Derived-rows-via-pure-function pattern** (ScoreEntry.svelte:128-149):
```typescript
let rows: ScoreRow[] = $derived.by(() => {
  if (!roundsConfig) return [];
  const built = shooters.map((shooter): ScoreRow => { /* ... */ });
  return sortRows(built, sortBy, sortDir);
});
```
`Results.svelte` mirrors this with `let rankings = $derived(computeClassRankings(shooters, classes, allScores, roundsConfig));` feeding both the phone and grid render branches.

**Heading + error-feedback + top-level layout wrapper** (ScoreEntry.svelte:256-263):
```svelte
<div class="mx-auto flex max-w-[960px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.scoring.heading}
  </h1>
  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}
```
Copy this exact wrapper/heading/error-row shape for `Results.svelte`'s top of template (`strings.results.heading` in place of `strings.scoring.heading`); reuse `errorFeedback` state var + same red-text row for the reset-failure message (`strings.results.resetError`).

**Analog 2 (dual-render CSS-only responsive switch, RES-03/RES-04):** `src/lib/views/Registration.svelte:96-176` and `src/App.svelte:52-53`

```svelte
<!-- App.svelte:52-53 — the canonical dual-render idiom for this whole codebase -->
<BottomTabBar {items} {activeSection} onselect={selectSection} class="flex md:hidden" />
<Sidebar {items} {activeSection} onselect={selectSection} class="hidden md:flex" />
```
```svelte
<!-- Registration.svelte:97 / :144 — table (desktop) vs. card-list (phone), same file -->
<table class="hidden w-full rounded-lg bg-white text-[16px] leading-[1.5] text-slate-900 md:table dark:bg-slate-800 dark:text-slate-100">
  ...
</table>
<ul class="flex flex-col gap-2 md:hidden">
  ...
</ul>
```
`Results.svelte` must follow this exact "both branches always in the DOM, Tailwind classes toggle visibility" idiom — never `window.matchMedia`/`innerWidth` (04-RESEARCH.md Anti-Patterns). Per 04-RESEARCH.md's own worked example (04-RESEARCH.md lines 316-333), the phone branch is `<div class="md:hidden">` wrapping `ClassSelector` + one `ResultsTable`; the grid branch is `<div class="hidden gap-4 md:grid md:grid-cols-1 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">` wrapping one `GlassCard` per class (per UI-SPEC's exact breakpoint table: 768-1023px→1 col, 1024-1279px→2 col, ≥1280px→3 col — note UI-SPEC uses `lg:grid-cols-2`/`xl:grid-cols-3`, confirm against Tailwind's default `lg`=1024px/`xl`=1280px, which matches).

**Analog 3 (destructive confirm + Dexie write + error handling):** `src/lib/views/ScoreEntry.svelte:224-246` (finalize flow) and `src/lib/components/ConfirmDialog.svelte` (full file, 66 lines)

```typescript
// ScoreEntry.svelte:224-246 — the exact confirm-then-write-then-catch shape to mirror
// for the reset action (swap the write for the atomic db.transaction shown below).
async function handleFinalizeClick() {
  finalizeDialogOpen = true;
}

async function handleFinalizeConfirm() {
  errorFeedback = '';
  try {
    const all = await db.scores.toArray();
    await db.scores.bulkPut(all.map((s) => ({ ...s, finalized: true })));
  } catch (err) {
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  }
  finalizeDialogOpen = false;
}

function handleFinalizeCancel() {
  finalizeDialogOpen = false;
}
```
```svelte
<!-- ScoreEntry.svelte:317-326 — ConfirmDialog usage to mirror verbatim (D-09) -->
<ConfirmDialog
  open={finalizeDialogOpen}
  title={strings.scoring.finalizeModalTitle}
  body={strings.scoring.finalizeModalBody}
  confirmLabel={strings.scoring.finalizeConfirmYes}
  cancelLabel={strings.scoring.finalizeConfirmCancel}
  destructive={true}
  onconfirm={handleFinalizeConfirm}
  oncancel={handleFinalizeCancel}
/>
```
For `Results.svelte`, replace the `bulkPut` write with the atomic transaction from 04-RESEARCH.md's Code Examples ("Reset action with atomic Dexie transaction", 04-RESEARCH.md lines 394-414):
```typescript
async function handleResetConfirm() {
  resetDialogOpen = false;
  errorFeedback = '';
  try {
    await db.transaction('rw', db.shooters, db.scores, async () => {
      await db.shooters.clear();
      await db.scores.clear();
    });
    resetSuccessMessage = strings.results.resetSuccess;
  } catch (err) {
    errorFeedback = strings.results.resetError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  }
}
```
Use `strings.results.resetConfirmTitle/resetConfirmBody/resetConfirmYes/resetConfirmCancel` + `destructive={true}` in the `ConfirmDialog` props, matching the finalize usage 1:1.

**Reset button styling** — no exact prior analog for a full-width destructive primary action button; closest is `ClassForm.svelte:158-164`'s destructive delete-confirm button:
```svelte
<button
  type="button"
  onclick={() => confirmDelete(cls.id)}
  class="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-[14px] font-semibold leading-[1.4] text-white hover:bg-red-700 dark:bg-red-400 dark:text-slate-900"
>
  {strings.setup.classDeleteConfirmYes}
</button>
```
Scale this to `text-[16px]` (Body role) + `RotateCcw` icon leading the label (per UI-SPEC), `w-full md:w-auto` for phone-full-width/desktop-natural-width.

### `src/App.svelte` (MODIFY)

**Analog:** itself, lines 8-29
```typescript
import ResultsPlaceholder from './lib/views/ResultsPlaceholder.svelte';
// ...
const views: Record<SectionId, Component> = {
  setup: Setup,
  registration: Registration,
  scoring: ScoreEntry,
  results: ResultsPlaceholder,
};
```
Change to `import Results from './lib/views/Results.svelte';` and `results: Results,` — a one-line-import + one-line-map-value change, identical to how `Setup`/`Registration`/`ScoreEntry` already replaced their own `*Placeholder.svelte` counterparts in prior phases (confirmed via `RegistrationPlaceholder.svelte`/`SetupPlaceholder.svelte`/`ScoringPlaceholder.svelte` still existing unused in the tree as historical artifacts — do not delete `ResultsPlaceholder.svelte` unless instructed; other placeholders were left in place after their views were swapped).

### `src/lib/views/Setup.svelte`, `src/lib/views/SetupRounds.svelte`, `src/lib/components/ClassForm.svelte`, `src/lib/views/Registration.svelte` (MODIFY — RES-06 guard)

**Analog:** `src/lib/views/ScoreEntry.svelte`'s existing `isFinalized`-gated `disabled` pattern (lines 270, 280, 300-304) — this is the ONE place in the codebase that already disables a control based on `isFinalized`, making it the canonical guard-styling source:
```svelte
<RoundPasseSelector
  ...
  disabled={isFinalized}
  ...
/>
<ScoreTable
  ...
  finalized={isFinalized}
  ...
/>
<button
  type="button"
  disabled={!isComplete}
  ...
  class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
>
```
And inside `ScoreTable.svelte:138-145` for the exact `disabled`/`aria-disabled`/opacity treatment on an icon-only button (the shape `Registration.svelte`'s delete-shooter button and `ClassForm.svelte`'s delete-class button must adopt):
```svelte
<button
  type="button"
  disabled={finalized}
  onclick={() => oncelltap(row.shooterId, i)}
  aria-disabled={finalized}
  class="... disabled:cursor-not-allowed disabled:opacity-50 ..."
>
```

**Cross-view liveQuery + shared-function call pattern** — copy 04-RESEARCH.md's worked example verbatim (04-RESEARCH.md lines 283-307):
```svelte
<!-- Registration.svelte — new lines, following the file's existing liveQuery idiom -->
<script lang="ts">
  import { computeIsFinalized } from '../utils/scoreCompletion';
  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);
  let isFinalized = $derived(computeIsFinalized(allScores));
</script>

<button
  type="button"
  disabled={isFinalized}
  aria-disabled={isFinalized}
  onclick={() => deleteShooter(shooter.id)}
  aria-label={strings.registration.deleteAction}
  class="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
>
  <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
</button>
{#if isFinalized}
  <p class="text-[16px] leading-[1.5] text-slate-500 dark:text-slate-400">
    {strings.results.guardMessage}
  </p>
{/if}
```
Apply the identical `liveQuery(() => db.scores.toArray()) → ?? [] → computeIsFinalized(...)` triplet independently in `Registration.svelte` (guard both the Pencil-row's Trash2 button at lines 128-135/163-169 — actually only the delete button per RES-06, leave `Pencil`/edit untouched per Pitfall 5), `Setup.svelte` (guard the `lineCount` `<input>` at lines 43-51 — add `disabled={isFinalized}` there, and pass `isFinalized` down as a prop into `<SetupRounds isFinalized={isFinalized} />`), `SetupRounds.svelte` (accept the new `isFinalized` prop, apply `disabled={isFinalized}` to every `<input>`/radio and the `Speichern` button at line 160-166), and `ClassForm.svelte` (guard the `Trash2` delete-class button at lines 193-200 the same way `deleteBlocked`'s existing conditional-render logic at lines 178-201 already branches on state — reuse that same `{#if}`/`{:else}` branching shape, adding an `isFinalized` branch alongside the existing `deleteBlocked` branch).

**Existing analogous "blocked action + inline message" branch** (ClassForm.svelte:174-203, already solves a structurally similar problem — worth reusing the branching shape, not the copy):
```svelte
{#if confirmDeleteId === cls.id}
  <!-- confirm row -->
{:else}
  <div class="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-col">
      <span>{cls.name}</span>
      {#if deleteBlocked && deleteBlocked.id === cls.id}
        <span class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">
          {strings.setup.classDeleteBlocked(deleteBlocked.count)}
        </span>
      {/if}
    </div>
    {#if deleteBlocked?.id === cls.id}
      <button type="button" onclick={dismissDeleteBlocked} ...>{strings.setup.classDeleteCancel}</button>
    {:else}
      <button type="button" onclick={() => requestDelete(cls.id)} aria-label={strings.setup.classDeleteAction} ...>
        <Trash2 .../>
      </button>
    {/if}
  </div>
{/if}
```
For RES-06, the simpler pattern (disabled attribute + adjacent message, per D-11 — NOT this dialog-interception shape) is correct; this existing block is cited only to show ClassForm's established conditional-render idiom for wiring in the new `isFinalized` branch alongside it (e.g., `disabled={isFinalized}` on the Trash2 button regardless of the `deleteBlocked`/`confirmDeleteId` state, plus a guard message rendered when `isFinalized` and neither of the other two states is active).

### `src/lib/views/Registration.test.ts` (NEW — no file exists today)

**Analog:** `src/lib/views/ScoreEntry.test.ts` (component-render + fake-indexeddb pattern, lines 1-31)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ScoreEntry from './ScoreEntry.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

describe('ScoreEntry', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the shooter name, class name, and line number once configured', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });
    await db.rounds.put({ id: 1, arrowsPerPasse: 2, passesPerRound: 1, numberOfRounds: 1, distance: '18m' });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 3 });

    render(ScoreEntry);

    await screen.findByText('Anna');
  });
});
```
`Registration.test.ts` should follow this exact `beforeEach(resetDb)` + `render(Registration)` + seed-via-`db.*.add/put` + `screen.findByText/findByRole` structure. The RES-06 guard test seeds `db.scores` with all-`finalized: true` records (matching `computeIsFinalized`'s vacuous-false-when-empty / true-when-all-finalized cases), then asserts the delete button (`screen.getByLabelText(strings.registration.deleteAction)`) has the `disabled` attribute, and that `strings.results.guardMessage` text is present.

### `src/lib/i18n/strings.de.ts` (MODIFY — add `results` section)

**Analog:** existing `scoring:` section (lines 130-160) and its usage convention — flat object of string constants + parameterized functions for interpolated copy:
```typescript
scoring: {
  heading: 'Erfassung',
  notConfiguredHeading: 'Turnier nicht konfiguriert',
  ...
  finalizeModalBody:
    'Diese Aktion sperrt alle Ergebnisse und kann nicht rückgängig gemacht werden. Fortfahren?',
  finalizeConfirmYes: 'Ja, abschließen',
  finalizeConfirmCancel: 'Abbrechen',
  finalizedMessage: 'Erfassung abgeschlossen. Die Ergebnisse sind jetzt gesperrt.',
},
```
Append the `results:` section verbatim as specified in 04-UI-SPEC.md's "Strings Module Extension" block (lines 264-289 of 04-UI-SPEC.md) — this is a literal copy-paste target, not a pattern-to-imitate; insert it as the new final property before the closing `} as const;` at strings.de.ts:161, matching the file's existing section-ordering convention (each phase's section appended at the end, banner comment above noting the phase/plan source, mirroring the comment at strings.de.ts:128-130 for `scoring`).

### `e2e/results.spec.ts` (NEW)

**Analog:** `e2e/nav.spec.ts` (breakpoint-assertion structure, lines 9-23) + `e2e/scoring.spec.ts` (full user-flow setup helper, lines 1-58)
```typescript
// nav.spec.ts:9-23 — the exact viewport-assertion shape for RES-03/RES-04
test.describe('responsive nav breakpoint (768px)', () => {
  test('phone width (375px): bottom tab bar visible, sidebar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    await expect(page.getByTestId('bottom-tab-bar')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav')).toBeHidden();
  });
});
```
```typescript
// scoring.spec.ts:1-17 — the full setup-flow helper convention to extend for a
// multi-class, multi-shooter results fixture (results.spec.ts needs its own
// `setUpTournamentWithResults(page)` helper following this exact shape: viewport
// set first, page.goto('/'), then section-by-section form fills via
// page.locator('section', { has: page.getByRole('heading', ...) })).
async function setUpOneShooterOneArrowTournament(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const classSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Klasse hinzufügen' }),
  });
  await classSection.getByLabel('Alter').selectOption('U14');
  await classSection.getByRole('button', { name: 'Klasse hinzufügen' }).click();
  // ...
}
```
`results.spec.ts` needs three viewport fixtures per UI-SPEC's exact breakpoints (375px → dropdown-only; 1024px → 1-2 col grid boundary; 1440px → 3-col grid), plus a full reset-flow test mirroring `scoring.spec.ts`'s finalize-then-reload pattern (seed data → click "Neues Turnier starten" → confirm in `ConfirmDialog` → assert empty state → `page.reload()` → assert shooters/scores tables are still empty while classes/rounds persist).

## Shared Patterns

### `liveQuery()` + `$derived` reactive data loading
**Source:** `src/lib/views/ScoreEntry.svelte:21-32`
**Apply to:** `Results.svelte` (4 queries: shooters/classes/rounds/scores), `Setup.svelte`/`SetupRounds.svelte`/`ClassForm.svelte`/`Registration.svelte` (1 new query each: scores, for the `isFinalized` guard)
```typescript
const scoresQuery = liveQuery(() => db.scores.toArray());
let allScores = $derived($scoresQuery ?? []);
let isFinalized = $derived(computeIsFinalized(allScores));
```

### Dual-render CSS-only responsive switch (never JS viewport detection)
**Source:** `src/App.svelte:52-53`, `src/lib/views/Registration.svelte:97,144`
**Apply to:** `Results.svelte`'s phone-dropdown-vs-grid split (RES-03/RES-04)
```svelte
<div class="md:hidden"> <!-- phone --> </div>
<div class="hidden md:grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"> <!-- tablet/desktop --> </div>
```

### `ConfirmDialog.svelte` destructive-confirm reuse
**Source:** `src/lib/components/ConfirmDialog.svelte` (full component) + usage at `src/lib/views/ScoreEntry.svelte:317-326`
**Apply to:** `Results.svelte`'s reset flow (D-09) — byte-for-byte prop shape reuse, only `title`/`body`/`confirmLabel`/`cancelLabel`/`onconfirm`/`oncancel` change, `destructive={true}` stays constant
```svelte
<ConfirmDialog
  open={resetDialogOpen}
  title={strings.results.resetConfirmTitle}
  body={strings.results.resetConfirmBody}
  confirmLabel={strings.results.resetConfirmYes}
  cancelLabel={strings.results.resetConfirmCancel}
  destructive={true}
  onconfirm={handleResetConfirm}
  oncancel={() => (resetDialogOpen = false)}
/>
```

### WR-04 write-error surfacing convention
**Source:** `src/lib/views/ScoreEntry.svelte:230-241`, `src/lib/components/ClassForm.svelte:47-55, 90-96`
**Apply to:** `Results.svelte`'s reset transaction, any new/modified write path
```typescript
try {
  await db.transaction('rw', db.shooters, db.scores, async () => {
    await db.shooters.clear();
    await db.scores.clear();
  });
} catch (err) {
  errorFeedback = strings.results.resetError.replace(
    '{error}',
    err instanceof Error ? err.message : String(err)
  );
}
```

### Opaque/high-contrast data table (Phase 1 D-11 — no glassmorphism)
**Source:** `src/lib/components/ScoreTable.svelte:58-59`
**Apply to:** `ResultsTable.svelte`
```svelte
<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
  <table class="w-full bg-white text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
```

### `44×44px` minimum touch target + `disabled:opacity-50` guard styling
**Source:** `src/lib/components/ScoreTable.svelte:138-145`, `src/lib/views/Registration.svelte:120-135`
**Apply to:** every RES-06 guarded control (delete-shooter, delete-class, rounds/passes form inputs, shooting-line input)
```svelte
class="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
```

### Dexie test-reset helper
**Source:** `src/lib/db/testHelpers.ts` (full file)
```typescript
export async function resetDb(): Promise<void> {
  await Promise.all([
    db.classes.clear(),
    db.shootingLines.clear(),
    db.rounds.clear(),
    db.shooters.clear(),
    db.presets.clear(),
    db.scores.clear(),
  ]);
}
```
**Apply to:** every new/modified test file's `beforeEach` (unit test isolation only — note per Pitfall 3, this `Promise.all` pattern is fine for test isolation but the production reset action in `Results.svelte` MUST use `db.transaction('rw', ...)` instead, since only test isolation, not a live-tournament write, tolerates the weaker non-transactional guarantee).

## No Analog Found

None. All 16 files have a strong existing analog in the codebase — this phase is disciplined reuse/recombination per 04-RESEARCH.md's own framing ("Phase 4's job is disciplined reuse, not new infrastructure"). The two genuinely new algorithmic pieces (`computeShooterSum`'s cross-round summation and `assignRanks`'s skip-next tie logic) have no prior in-repo analog to copy verbatim, but 04-RESEARCH.md's Architecture Patterns section (Pattern 1, lines 165-263) already provides a fully worked, ready-to-copy implementation that itself follows `scoreCompletion.ts`'s established style — treated above as the primary source for `ranking.ts`.

## Metadata

**Analog search scope:** `src/lib/**`, `src/App.svelte`, `e2e/**` (entire application source tree; no `node_modules` or build-output search needed since this phase introduces zero new dependencies)
**Files scanned:** 16 target files + 15 analog source files (`scoreCompletion.ts`, `scoreCompletion.test.ts`, `ScoreEntry.svelte`, `ScoreEntry.test.ts`, `Registration.svelte`, `Setup.svelte`, `SetupRounds.svelte`, `ClassForm.svelte`, `ConfirmDialog.svelte`, `ScoreTable.svelte`, `RoundPasseSelector.svelte`, `schema.ts`, `App.svelte`, `strings.de.ts`, `testHelpers.ts`, `ResultsPlaceholder.svelte`, `GlassCard.svelte`, `e2e/nav.spec.ts`, `e2e/scoring.spec.ts`)
**Pattern extraction date:** 2026-07-05
