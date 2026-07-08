# Phase 4: Results - Research

**Researched:** 2026-07-05
**Domain:** Client-side ranking/aggregation logic, Dexie liveQuery cross-view state sharing, Tailwind CSS responsive dual-render layout, Svelte 5 destructive-action UX (all within the existing MeinBogenturnier Svelte 5 + Vite + Dexie stack — no new libraries)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Results Availability & Partial Data
- **D-01:** Results are viewable **anytime**, not gated on finalization — a live-updating view of current standings, not a screen that's locked/placeholder until "Abschließen".
- **D-02:** Ranking includes **every shooter by current sum**, whether or not they've finished all their arrows yet. No separate "unranked/in-progress" bucket — one sorted list.
- **D-03:** Shooters with incomplete sums get a **small visual marker** (e.g. asterisk or muted badge) next to their row so the trainer can tell at a glance that sum is still growing. Exact marker styling is Claude's discretion (see below), but it must be visually distinct from the finished-shooter rows.

#### Multi-Class Layout & Ordering
- **D-04:** Classes are ordered **alphabetically by class name** when multiple appear together (matches how classes are already listed in Setup).
- **D-05:** On tablet/desktop, multiple classes use a **responsive grid** (1 column on narrow tablet widths, up to 3 columns on wide desktop) — not a single stacked column. Exact breakpoints (which width → 1 vs 2 vs 3 columns) are Claude's discretion, consistent with the app's existing responsive conventions (e.g. the nav shell's 768px breakpoint, and the score-table phone-compaction breakpoint from quick task 260705-p25).
- Per REQUIREMENTS.md RES-03: on **phone**, only one class is shown at a time via a dropdown selector (this was already locked pre-discussion — not re-litigated here).

#### Rank Presentation Style
- **D-06:** Results table is a **plain, opaque table** (rank, line/name/class as relevant, sum) matching the score-entry table's high-contrast look (Phase 1 D-11 applies here too — no glassmorphism on this data-heavy view) — **plus** a subtle color accent on the top-3 (podium) rank cells.
- **D-07:** The podium accent is **rank-based, not row-based** — every row sharing rank 2 gets the same "silver" accent (consistent with the already-locked shared-rank/skip-next "1-2-2-4" tie convention from REQUIREMENTS.md; RES-02 is not re-litigated here). E.g. two shooters tied for 2nd both get silver; the next shooter is rank 4 with no podium accent.

#### Reset Flow (RES-05 / RES-06)
- **D-08:** The "Neues Turnier starten" (start new tournament / reset) action lives **on the Results view itself** — no new nav section/settings area for a single button.
- **D-09:** Reset confirmation reuses the **existing `ConfirmDialog.svelte` destructive pattern** (same component/props already used for "Abschließen" and preset delete/overwrite flows in Phases 2-3) — title + body explaining the consequences + "Ja, zurücksetzen"/"Abbrechen". No new type-to-confirm interaction pattern.
- **D-10:** Per REQUIREMENTS.md RES-05's locked wording ("clears all shooters and scores, not saved presets"), reset clears the `shooters` and `scores` Dexie tables only. Classes, shooting-line count, and rounds/passes config (the `classes`/`shootingLines`/`rounds` tables) are **retained** — this lets the trainer immediately start a same-shaped tournament (same classes/lines/rounds) without reconfiguring Setup from scratch, while presets remain available for a differently-shaped tournament. This is an inference from the already-locked RES-05 requirement text, not a new question re-discussed here — flagging it explicitly so the researcher/planner don't have to guess.
- **D-11:** RES-06's destructive-edit guard is implemented as **disabled controls with an inline message** pointing to reset (e.g. delete-shooter buttons and the rounds/passes config form become disabled/read-only, with text like "Turnier abgeschlossen — Zurücksetzen, um zu ändern" near the disabled controls) — not an "action intercepted by a warning dialog at click time" pattern.
- **D-12:** The RES-06 guard triggers **only once the tournament is finalized** (`isFinalized === true`, same boolean already computed in `ScoreEntry.svelte` per Phase 3's D-10 permanent-lock decision) — **not** as soon as any score exists. While a tournament is still live/in-progress (not yet finalized), the trainer can still edit shooters and rounds/passes config normally, consistent with D-01's "results are viewable anytime, mid-tournament" decision — the guard is specifically about protecting *finalized/locked* data, not live-entry data.

### Claude's Discretion
- Exact visual styling of the "in-progress" marker on incomplete shooters (D-03) — asterisk, dot, muted-text badge, etc. **Resolved in 04-UI-SPEC.md:** muted superscript asterisk after the Gesamt value, with legend caption and aria-label.
- Exact responsive breakpoints for the 1/2/3-column grid (D-05) beyond "narrow tablet → wide desktop". **Resolved in 04-UI-SPEC.md:** 768-1023px = 1 col, 1024-1279px = 2 col, ≥1280px = 3 col.
- Exact podium accent colors (gold/silver/bronze or the app's existing accent-color family) as long as they're subtle and don't compromise the opaque/high-contrast table requirement (D-06). **Resolved in 04-UI-SPEC.md:** amber-100/slate-200/orange-100 badge tints (light), badge-only, never row background.
- Whether "deleting a class" (as opposed to deleting a shooter, which RES-06 explicitly names) should also be guarded once finalized — not discussed; treat conservatively (guard it too) unless research surfaces a reason not to, since a class deletion after finalization would orphan finalized shooter records in the same way a shooter deletion would. **Resolved in 04-UI-SPEC.md:** guard the delete-class button too.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (RES-05/RES-06 themselves were already added to this phase's scope in a prior conversation turn, before this discuss-phase session started — see `.planning/ROADMAP.md` Phase 4 and the STATE.md Roadmap Evolution entry dated 2026-07-05.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RES-01 | Trainer can view results ranked by total score descending, grouped per class | `computeClassRankings` (Pattern 1) sums every arrow per shooter via `computeShooterSum`, groups by `classId`, sorts descending — see Architecture Patterns → Pattern 1 |
| RES-02 | Tied scores share the same rank; the next rank is skipped (standard "1-2-2-4" competition ranking) | `assignRanks` helper (Pattern 1) implements the "rank = 1-based index of first occurrence of this sum" algorithm; Pitfall 1 documents the dense-ranking (1-2-2-3) mistake to avoid, with a mandated tie-fixture unit test |
| RES-03 | On phone-sized screens, results are shown one class at a time via a dropdown selector | Pattern 3 (dual-render CSS switch) + new `ClassSelector.svelte` native `<select>`, reusing `RoundPasseSelector.svelte`'s established dropdown-label layout convention |
| RES-04 | On tablet/desktop screens, results for multiple/all classes are shown in a single- or multi-column layout depending on screen width | Pattern 3 + Tailwind default breakpoints (768/1024/1280px, verified against `package.json`'s Tailwind 4.3.2, no custom theme override needed) mapped to `grid-cols-1`/`lg:grid-cols-2`/`xl:grid-cols-3` |
| RES-05 | Trainer can explicitly start a new tournament via a dedicated "reset" action that clears all shooters and scores (not saved presets), after a confirmation warning | `ConfirmDialog.svelte` reuse (D-09) + atomic `db.transaction('rw', db.shooters, db.scores, ...)` reset (Code Examples, Pitfall 3) |
| RES-06 | App blocks destructive edits (deleting shooters, changing rounds/passes configuration) while finalized tournament data exists, directing the trainer to reset first rather than silently cascading the reset | `computeIsFinalized` extraction (Pattern 2) shared across `Setup.svelte`/`SetupRounds.svelte`/`ClassForm.svelte`/`Registration.svelte`; Pitfall 4 (drift risk) and Pitfall 5 (over-scoping which controls to guard) document the two ways this is commonly gotten wrong |
</phase_requirements>

## Summary

Phase 4 introduces no new dependencies and no new architectural layer — it is entirely additive work inside the stack Phases 1-3 already established (Svelte 5 runes, Dexie `liveQuery`, Tailwind CSS 4, `@lucide/svelte`, centralized `strings.de.ts`). The two genuinely new pieces of logic are (1) a pure, framework-free ranking function that sums every arrow across every round/passe per shooter and assigns shared/skip-next ("1-2-2-4") ranks per class, and (2) an `isFinalized` boolean that today lives inline inside `ScoreEntry.svelte` and must be extracted into a shared, reusable form so `Setup.svelte`, `SetupRounds.svelte`, `ClassForm.svelte`, and `Registration.svelte` can all read it for the RES-06 destructive-edit guard.

Everything else in this phase is recombination of already-shipped patterns: `liveQuery()` + `$derived` for live-updating data (Phases 2-3), the opaque/high-contrast table styling of `ScoreTable.svelte` (Phase 1 D-11), `ConfirmDialog.svelte` reused verbatim for the reset flow (Phases 2-3), and — critically — the **dual-render responsive pattern** already used by `App.svelte`'s `BottomTabBar`/`Sidebar` pair and `Registration.svelte`'s table/card-list pair: both the phone dropdown view and the tablet/desktop grid view are rendered simultaneously in the DOM, toggled purely via Tailwind's `md:hidden` / `hidden md:...` classes — never `window.innerWidth` or `matchMedia` in component logic. This is the single most load-bearing precedent for RES-03/RES-04 and must not be reinvented.

**Primary recommendation:** Build one new pure utility module (ranking + isFinalized-adjacent helpers) following `scoreCompletion.ts`'s exact style, reuse every existing component/pattern named in 04-CONTEXT.md's `<canonical_refs>`, and implement the responsive layout as a dual-render (not JS-detected) CSS-only split exactly like `Registration.svelte`/`App.svelte` already do.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ranking computation (RES-01/02) | Browser / Client (pure TS function) | — | No backend exists; must be a plain function over in-memory arrays per CLAUDE.md's explicit architecture note (reusable later for v1.5 jsPDF export) |
| Live results display (RES-01, D-01) | Browser / Client (Svelte component + Dexie `liveQuery`) | Database / Storage (IndexedDB via Dexie) | `liveQuery` bridges IndexedDB change events to Svelte reactivity; no server round-trip exists in this app |
| Responsive layout switch (RES-03/RES-04) | Browser / Client (CSS via Tailwind, dual-render) | — | Pure CSS media-query driven; no JS viewport detection tier needed — confirmed anti-pattern to avoid (see Pitfalls) |
| Reset action (RES-05) | Browser / Client (Dexie write transaction) | Database / Storage | `db.shooters.clear()` / `db.scores.clear()` are direct IndexedDB table operations; no other tier involved |
| Destructive-edit guard (RES-06) | Browser / Client (shared derived boolean, consumed by 3 view components) | Database / Storage (source: `scores.finalized` flags) | Guard state derives from stored data (`ScoreRecord.finalized`) but the guard logic/UI itself is presentational, client-only |

## Standard Stack

### Core

No new core libraries. This phase is implemented entirely with the already-installed stack:

| Library | Version (installed) | Purpose | Why Standard (unchanged from Phase 1-3) |
|---------|---------|---------|--------------|
| Svelte | 5.56.4 [VERIFIED: package.json] | UI + reactivity (`$state`, `$derived`, `$derived.by`) | Already locked; Results view/ranking derivation needs no new state primitive |
| Dexie.js | 4.4.4 [VERIFIED: package.json] | `liveQuery()` reactive reads of `shooters`/`classes`/`scores`/`rounds`; `.clear()` for reset | Already locked; no schema version bump needed — RES-05/06 only read/clear existing tables |
| @lucide/svelte | 1.23.0 [VERIFIED: package.json] | `RotateCcw` (reset icon), reuse of `Trash2` for guarded delete buttons | Already locked icon set |
| Tailwind CSS | 4.3.2 [VERIFIED: package.json] | Responsive grid (`md:`/`lg:`/`xl:` variants), opaque table styling | Already locked; default breakpoints (768/1024/1280px) match 04-UI-SPEC.md exactly — no `tailwind.config` changes needed |

### Supporting

No supporting libraries are newly required. `dexie-export-import`, `jspdf`/`jspdf-autotable` (v1.5) remain out of scope for this phase.

### Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Dual-render CSS breakpoint switch (`md:hidden` / `hidden md:grid`) for phone-dropdown-vs-grid | `window.matchMedia` / `innerWidth` JS detection + conditional `{#if}` rendering | Never for this app — every existing responsive surface (`App.svelte` nav, `Registration.svelte`, `ScoreTable.svelte`) uses the CSS dual-render approach; introducing JS detection here would be an unjustified deviation and break the established Playwright e2e testing convention (`setViewportSize` + `toBeVisible`/`toBeHidden`) |
| Extending `scoreCompletion.ts` with a new `computeIsFinalized` pure function | A Svelte store/context for cross-view `isFinalized` sharing | Only if the app later needs to *push* finalization state changes to distant components without each view running its own `liveQuery`; not needed here — every affected view (`Setup`, `Registration`, `ScoreEntry`) already runs its own top-level `liveQuery(() => db.scores.toArray())`-style query, so a shared pure function fed by each view's own query is consistent with the existing "no external state library" convention (see CLAUDE.md "What NOT to Use") |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

Not applicable. This phase installs zero new external packages — it is pure application code built on the stack already verified and installed in Phases 1-3 (`package.json` reviewed directly, versions confirmed above via `package.json` inspection, not a registry guess).

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Results.svelte (view)                       │
│                                                                       │
│  liveQuery(db.shooters) ──┐                                          │
│  liveQuery(db.classes)  ──┼──► $derived ──► computeClassRankings() ──┼──► rankings: Map<classId, RankedRow[]>
│  liveQuery(db.scores)   ──┤        (pure fn, src/lib/utils/ranking.ts)
│  liveQuery(db.rounds)   ──┘                                          │
│                                                                       │
│         ┌───────────────────────────┬───────────────────────────┐   │
│         │  <768px (md:hidden)       │  ≥768px (hidden md:grid)  │   │
│         │  ClassSelector.svelte     │  grid-cols-1/2/3 of        │   │
│         │  (native <select>)        │  ResultsTable.svelte       │   │
│         │  + single ResultsTable    │  per class (alphabetical)  │   │
│         └───────────────────────────┴───────────────────────────┘   │
│                                                                       │
│  "Neues Turnier starten" button ──► ConfirmDialog (reused) ──► on   │
│  confirm: db.transaction('rw', shooters, scores, clear both)         │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│  Setup.svelte          │   │  Registration.svelte   │   │  ClassForm.svelte      │
│  liveQuery(db.scores)  │   │  liveQuery(db.scores)  │   │  liveQuery(db.scores)  │
│  → computeIsFinalized()│   │  → computeIsFinalized()│   │  → computeIsFinalized()│
│  disables rounds/lines │   │  disables delete-shooter│  │  disables delete-class │
│  form + inline message │   │  button + inline message│  │  button + inline msg   │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘
        ▲ all three read the SAME pure function (src/lib/utils/scoreCompletion.ts)
        ▲ fed by their OWN independent liveQuery — no shared store, per existing convention
```

A reader can trace the primary use case: shooter/score data flows out of IndexedDB via four independent `liveQuery`s into one pure ranking function, producing a per-class ranked+flagged row list; the same view then branches (CSS-only, both branches always in the DOM) into phone-dropdown or grid rendering. Independently, three other views each run their own `liveQuery` over `db.scores` and feed it through the same shared `computeIsFinalized` function to decide whether to disable their destructive controls.

### Recommended Project Structure

```
src/lib/
├── utils/
│   ├── scoreCompletion.ts   # EXTEND: add computeIsFinalized(scores) here — same
│   │                        #   module already houses arrowScoreValue/areAllScoresEntered,
│   │                        #   which the new ranking function must reuse, not reimplement.
│   ├── ranking.ts            # NEW: computeClassRankings(shooters, classes, scores, roundsConfig)
│   │                        #   — the RES-01/02 pure aggregation+rank-assignment function.
│   └── ranking.test.ts       # NEW: unit tests (tie handling, skip-next, incomplete flag)
├── components/
│   ├── ConfirmDialog.svelte  # REUSE verbatim (D-09)
│   ├── ResultsTable.svelte   # NEW: per-class table (Rang/Name/Schießplatz/Gesamt)
│   └── ClassSelector.svelte  # NEW: phone-only native <select> class switcher
├── views/
│   ├── Results.svelte        # REPLACES ResultsPlaceholder.svelte in App.svelte's `views` map
│   ├── Setup.svelte          # MODIFY: add isFinalized liveQuery + disable lines input
│   ├── SetupRounds.svelte    # MODIFY: add isFinalized prop, disable form + save button
│   ├── ClassForm.svelte      # MODIFY: add isFinalized liveQuery, disable delete-class button
│   └── Registration.svelte  # MODIFY: add isFinalized liveQuery, disable delete-shooter button
└── i18n/strings.de.ts        # MODIFY: add `results` section verbatim from 04-UI-SPEC.md
```

### Pattern 1: Pure ranking function, framework-free, style-matched to `scoreCompletion.ts`

**What:** A single exported function that groups shooters by class, sums every recorded arrow per shooter across all rounds/passes, sorts descending, and assigns competition ("1-2-2-4") ranks — reusing `arrowScoreValue` rather than reimplementing the M/X value mapping.

**When to use:** Called once per `Results.svelte` render cycle, fed by the view's own `liveQuery` results (same idiom as `rows` in `ScoreEntry.svelte`).

**Example (new file, following `scoreCompletion.ts`'s exact banner-comment + plain-function style):**
```typescript
// src/lib/utils/ranking.ts
import type { ClassRecord, ShooterRecord, ScoreRecord, RoundConfig } from '../db/schema';
import { arrowScoreValue, areAllScoresEntered } from './scoreCompletion';

// Pure functions implementing tournament-wide ranking (RES-01, RES-02, D-02). Sums
// every round x passe x arrow per shooter (not per-passe like scoreCompletion.ts's
// calculatePasseSum), groups by class, and assigns standard competition ranks
// (shared rank on ties, next rank skips — "1-2-2-4"). Framework-free, no side effects,
// reusable by the v1.5 jsPDF export per CLAUDE.md's architecture note.

export interface RankedRow {
  shooterId: number;
  name: string;
  line: number | null;
  sum: number;
  rank: number;
  isComplete: boolean;
}

export function computeShooterSum(shooterId: number, scores: ScoreRecord[]): number {
  return scores
    .filter((s) => s.shooterId === shooterId)
    .reduce((total, s) => total + arrowScoreValue(s.value), 0);
}

// D-02: every shooter is ranked regardless of completion — this flag is purely a
// display marker (D-03's asterisk), never an exclusion from the ranked list.
export function isShooterComplete(
  shooterId: number,
  roundsConfig: RoundConfig,
  scores: ScoreRecord[]
): boolean {
  return areAllScoresEntered(
    [shooterId],
    roundsConfig.numberOfRounds,
    roundsConfig.passesPerRound,
    roundsConfig.arrowsPerPasse,
    scores
  );
}

// Standard competition ranking: descending by sum; equal sums share a rank; the
// next distinct sum's rank equals its 1-based position in the sorted array (skips
// ranks that a tie "used up") — this is what yields "1-2-2-4", not "1-2-2-3".
function assignRanks(sortedDescBySum: { sum: number }[]): number[] {
  const ranks: number[] = [];
  let currentRank = 1;
  sortedDescBySum.forEach((row, i) => {
    if (i > 0 && row.sum !== sortedDescBySum[i - 1].sum) {
      currentRank = i + 1;
    }
    ranks.push(currentRank);
  });
  return ranks;
}

export function computeClassRankings(
  shooters: ShooterRecord[],
  classes: ClassRecord[],
  scores: ScoreRecord[],
  roundsConfig: RoundConfig | undefined
): Map<number, RankedRow[]> {
  const result = new Map<number, RankedRow[]>();
  if (!roundsConfig) return result;

  for (const cls of classes) {
    const classShooters = shooters.filter((s) => s.classId === cls.id);
    if (classShooters.length === 0) continue; // D-04/edge case: classes with no shooters are absent, not empty tables

    const withSums = classShooters.map((s) => ({
      shooterId: s.id as number,
      name: s.name,
      line: s.lineAssignment ?? null,
      sum: computeShooterSum(s.id as number, scores),
      isComplete: isShooterComplete(s.id as number, roundsConfig, scores),
    }));

    // Sort descending by sum; alphabetical-by-name tiebreak for deterministic row
    // order only (rank number is identical for tied sums either way).
    withSums.sort((a, b) => b.sum - a.sum || a.name.localeCompare(b.name));

    const ranks = assignRanks(withSums);
    result.set(
      cls.id as number,
      withSums.map((row, i) => ({ ...row, rank: ranks[i] }))
    );
  }

  return result;
}
```

### Pattern 2: Extracting `isFinalized` into a shared pure function

**What:** `ScoreEntry.svelte` currently computes `isFinalized` inline (`allScores.length > 0 && allScores.every((s) => s.finalized)`, ScoreEntry.svelte:75). RES-06 requires the identical boolean in `Setup.svelte`, `SetupRounds.svelte`, `ClassForm.svelte`, and `Registration.svelte`. Extract it once into `scoreCompletion.ts` (the module that already owns `ScoreRecord`-shaped completion logic) and update `ScoreEntry.svelte` to call it too, rather than duplicating the boolean expression five times.

**When to use:** Every guarded view runs its own `liveQuery(() => db.scores.toArray())` (matching the codebase's existing per-view-query convention — no new shared store) and passes the result through this one function.

**Example:**
```typescript
// Added to src/lib/utils/scoreCompletion.ts
// D-09/D-10 (03-CONTEXT.md), extracted for RES-06 (04-CONTEXT.md D-12): a tournament
// is finalized once every persisted score record has finalized: true. Vacuously
// false when there are no records yet. Single source of truth — ScoreEntry.svelte
// and every RES-06-guarded view (Setup, SetupRounds, ClassForm, Registration) must
// call this instead of re-deriving the boolean inline.
export function computeIsFinalized(scores: ScoreRecord[]): boolean {
  return scores.length > 0 && scores.every((s) => s.finalized);
}
```
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

### Pattern 3: Dual-render CSS-only responsive switch (RES-03/RES-04) — reuse, do not reinvent

**What:** `App.svelte` already renders both `BottomTabBar` (`class="flex md:hidden"`) and `Sidebar` (`class="hidden md:flex"`) unconditionally in the DOM; the browser's CSS engine decides which is visible. `Registration.svelte` does the identical thing for its table (`class="hidden ... md:table"`) vs. its card list (`class="flex ... md:hidden"`). `Results.svelte` must follow the exact same pattern for the phone dropdown vs. tablet/desktop grid — never `window.matchMedia`/`innerWidth`.

**When to use:** Any time this app needs different markup at different breakpoints.

**Example:**
```svelte
<!-- Results.svelte -->
<div class="md:hidden">
  <ClassSelector classes={sortedClasses} selectedClassId={selectedClassId} onchange={(id) => (selectedClassId = id)} />
  {#if selectedClassRows}
    <ResultsTable rows={selectedClassRows} />
  {/if}
</div>

<div class="hidden gap-4 md:grid md:grid-cols-1 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
  {#each sortedClasses as cls (cls.id)}
    <GlassCard class="p-4 md:p-6">
      <h2 class="mb-2 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">{cls.name}</h2>
      <ResultsTable rows={rankings.get(cls.id!) ?? []} />
    </GlassCard>
  {/each}
</div>
```

### Anti-Patterns to Avoid

- **JS viewport detection (`window.matchMedia`/`innerWidth`) for the phone-vs-grid switch:** Every existing responsive surface in this codebase is CSS-only dual-render. Introducing JS detection here breaks the established Playwright testing convention (`page.setViewportSize()` + `toBeVisible()`/`toBeHidden()`) and is an unjustified architectural deviation.
- **Reimplementing M/X value mapping inside the new ranking function:** Must call `arrowScoreValue` from `scoreCompletion.ts`, not duplicate the `if (value === 'M') return 0...` logic.
- **"1-2-2-3" ranking (dense ranking) instead of "1-2-2-4" (standard/skip-next competition ranking):** RES-02 explicitly requires the next distinct rank to equal the tied group's size, i.e. skip — see `assignRanks` above for the correct algorithm.
- **Duplicating `isFinalized`'s boolean expression a fifth time** instead of extracting it: guarantees the five call sites will drift out of sync the next time the finalization rule changes.
- **Gating the Results view itself on `isFinalized`:** D-01 is explicit — results are live/viewable anytime, unrelated to the RES-06 guard which applies only to Setup/Registration/ClassForm.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| Responsive phone-vs-desktop layout switching | Custom `onMount` + `window.addEventListener('resize', ...)` breakpoint detector | Tailwind CSS dual-render (`md:hidden` / `hidden md:grid`) | Already the established, e2e-tested pattern (`App.svelte`, `Registration.svelte`); a JS detector adds a resize listener, hydration mismatch risk, and an untested code path for zero benefit |
| Destructive confirmation UX | A new modal/dialog component for the reset flow | `ConfirmDialog.svelte` (existing, `destructive={true}` prop) | Byte-for-byte reuse mandated by D-09; a second dialog component would fragment the app's one destructive-confirm convention |
| Atomic multi-table clear | Two independent `.clear()` calls with manual rollback-on-error logic | `db.transaction('rw', db.shooters, db.scores, async () => { await db.shooters.clear(); await db.scores.clear(); })` | Dexie's built-in transaction wraps both clears atomically; hand-rolled rollback logic for IndexedDB is exactly the kind of "deceptively complex" problem Dexie already solves |
| Tied-rank / skip-next computation | An ad-hoc loop tracking "have I seen this sum before" with a manual counter that's easy to get 1-2-2-3 vs 1-2-2-4 wrong | The `assignRanks` pattern above (rank = 1-based index of the *first* occurrence of a sum value) | This exact off-by-one (dense vs. standard competition ranking) is the single most common ranking-algorithm bug; codify it once, unit-test it thoroughly, never inline it per-call-site |

**Key insight:** Every "don't hand-roll" in this phase is really "don't hand-roll a second time" — the app has already solved responsive layout, destructive confirmation, and atomic writes in Phases 1-3. Phase 4's job is disciplined reuse, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Off-by-one in shared-rank/skip-next assignment
**What goes wrong:** Implementing "dense ranking" (1-2-2-3) instead of "standard/skip-next competition ranking" (1-2-2-4) — a natural mistake since dense ranking is what a naive `groupBy(sum).index` produces.
**Why it happens:** The two algorithms differ only when ties exist, so a test suite with no tied scores will pass either implementation.
**How to avoid:** Implement via `rank = 1-based index of first occurrence of this sum in the sorted array` (see `assignRanks` above), and write a unit test with an explicit 3-shooter, 2-way tie fixture asserting ranks `[1, 2, 2, 4]` for a 4th, lower-scoring shooter.
**Warning signs:** Any implementation using a running `let rank = 0; if (newGroup) rank++` counter (that produces dense ranking) instead of `rank = i + 1` on group change.

### Pitfall 2: Computing the tournament-wide sum with the wrong scope
**What goes wrong:** Reusing `calculatePasseSum` (Phase 3, scoped to ONE round/passe's arrows) as-is for the Results view's "Gesamt" column, which must sum across ALL rounds × passes × arrows for a shooter.
**Why it happens:** `calculatePasseSum` and the new tournament-wide sum share the same M/X-to-number mapping, tempting a copy-paste that forgets the scope difference.
**How to avoid:** The new `computeShooterSum` filters `scores` by `shooterId` only (no `roundIndex`/`passeIndex` filter), then reduces with `arrowScoreValue` directly — it should NOT call `calculatePasseSum` per-passe-then-sum-the-sums, since that reintroduces a nested loop for no benefit over a flat filter+reduce.
**Warning signs:** A ranking test where a 2-round tournament's total appears to only reflect round 1.

### Pitfall 3: Non-atomic reset leaves inconsistent state on interruption
**What goes wrong:** Calling `db.shooters.clear()` and `db.scores.clear()` as two independent, unawaited or sequentially-awaited-but-not-transactional operations; if the tab closes or an error occurs between the two calls, the database is left with scores referencing now-deleted shooters (or vice versa).
**Why it happens:** `Promise.all([db.shooters.clear(), db.scores.clear()])` (the pattern used by `testHelpers.ts`'s `resetDb`) is fine for tests but doesn't guarantee cross-table atomicity in the face of a genuine runtime interruption (browser crash, storage quota error mid-operation) the way it does for a synchronous test run.
**How to avoid:** Wrap the reset in `db.transaction('rw', db.shooters, db.scores, async () => { await db.shooters.clear(); await db.scores.clear(); })` per Dexie's documented atomic-transaction API.
**Warning signs:** A reset that appears to succeed in manual testing but occasionally leaves stale rows visible after a hard page reload during multi-step manual QA.

### Pitfall 4: `isFinalized` drifting out of sync across five call sites
**What goes wrong:** RES-06 needs the identical finalization boolean in `Setup.svelte`, `SetupRounds.svelte`, `ClassForm.svelte`, `Registration.svelte`, and (already) `ScoreEntry.svelte`. If each is implemented as an independent inline `$derived` expression instead of calling one shared function, a future change to the finalization rule (e.g., partial finalization in a later version) requires finding and updating five call sites, and a missed one silently reintroduces the destructive-edit bug RES-06 exists to prevent.
**Why it happens:** The existing `ScoreEntry.svelte` implementation is inline (not yet extracted, since Phase 3 had no other consumer) — it's easy to copy the expression rather than notice it needs extracting first.
**How to avoid:** Extract `computeIsFinalized(scores)` into `scoreCompletion.ts` as the FIRST task of this phase's implementation (before writing any of the four guarded views), and refactor `ScoreEntry.svelte` to call it too, so there is exactly one implementation.
**Warning signs:** `grep -rn "s.finalized" src/lib` returning more than one boolean-expression call site.

### Pitfall 5: Confusing "guard all destructive Setup/Registration actions" with "guard only what RES-06 names"
**What goes wrong:** RES-06's text is specifically "deleting shooters, changing rounds/passes configuration" — it is tempting to also disable the *add*-shooter form (`ShooterForm.svelte`) or *add*-class form (`ClassForm.svelte`'s add flow) "for consistency," which is out of scope and would silently prevent a valid mid-finalization workflow the requirement never asked to block (D-12 explicitly limits the guard's trigger, not its list of targets, but over-scoping the *targets* is an equally real mistake).
**Why it happens:** "Disable everything while finalized" feels like the safer default.
**How to avoid:** Guard exactly the controls listed in 04-UI-SPEC.md's "Guarded Controls" table: delete-shooter, delete-class (discretion), the rounds/passes config form's inputs + shooting-line count input. Leave `ShooterForm.svelte`'s add-shooter submission and `ClassForm.svelte`'s add-class submission fully functional regardless of `isFinalized` — RES-05/06 do not mention blocking additions, and D-01 confirms the tournament (including registration/results) stays live-viewable/usable post-finalization for anything not explicitly named.
**Warning signs:** A disabled "Schütze hinzufügen" button after finalizing a tournament — this is a requirement violation, not a safety feature, since nothing in RES-06 asks for it.

### Pitfall 6: `liveQuery` initial-render `undefined` edge case (inherited from Phases 2-3, now touching 4 queries at once)
**What goes wrong:** `Results.svelte` needs FOUR simultaneous `liveQuery`s (`shooters`, `classes`, `scores`, `rounds`) to feed `computeClassRankings`. Per CLAUDE.md's documented Dexie+Svelte-5-runes edge case, a fresh page load can show `undefined` from `liveQuery` until the first write — with four independent queries, the odds of at least one being transiently `undefined` on first paint are higher than any single-query view in Phases 2-3.
**Why it happens:** `liveQuery`'s underlying Dexie subscription resolves asynchronously even for an initial read of an already-populated table.
**How to avoid:** Every `liveQuery`-derived value in this view MUST default via `?? []` / `?? undefined` before being passed into `computeClassRankings`, exactly as `ScoreEntry.svelte` already does for its four independent queries (`$shootersQuery ?? []`, `$classesQuery ?? []`, `$scoresQuery ?? []`, and a bare `$roundsQuery` checked with `{#if !roundsConfig}` before rendering). `computeClassRankings` itself already guards `roundsConfig` being `undefined` (returns an empty map) — reuse that same guard-at-the-top style.
**Warning signs:** A flash of the empty-state message on every page load/reload even when shooters/scores already exist, before the real data "pops in" a frame later.

## Code Examples

### Reset action with atomic Dexie transaction (RES-05, D-10)
```typescript
// Results.svelte — on ConfirmDialog confirm
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
Source: Dexie's transaction API (`db.transaction('rw', ...)`), consistent with the app's existing WR-04 error-surfacing convention (`ScoreEntry.svelte`'s `errorFeedback` pattern, `ClassForm.svelte`'s try/catch shape).

### Rank badge with accessible numeral (D-06/D-07, UI-SPEC podium accent)
```svelte
<!-- ResultsTable.svelte -->
{#snippet rankBadge(rank: number)}
  {#if rank <= 3}
    <span
      aria-label={`Rang ${rank}`}
      class={rank === 1
        ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[14px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
        : rank === 2
          ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[14px] font-semibold text-slate-700 dark:bg-slate-600 dark:text-slate-200'
          : 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[14px] font-semibold text-orange-800 dark:bg-orange-900/50 dark:text-orange-300'}
    >{rank}</span>
  {:else}
    <span aria-label={`Rang ${rank}`}>{rank}</span>
  {/if}
{/snippet}
```
Source: 04-UI-SPEC.md's exact color tokens (verbatim, `[CITED: 04-UI-SPEC.md]`), pattern follows Svelte 5's `{#snippet}` syntax (already used implicitly via component composition in this codebase's Svelte 5.56.4).

## State of the Art

No "old approach → current approach" shift applies here — this phase's techniques (Dexie `liveQuery`, Svelte 5 runes, Tailwind dual-render) are the same current-generation stack Phases 1-3 already validated in this exact codebase. There is no deprecated tooling to flag.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Wrapping `db.shooters.clear()` + `db.scores.clear()` in `db.transaction('rw', ...)` is safe/available given the current Dexie schema (v3, no encryption/addons registered) | Common Pitfalls #3, Code Examples | Low — Dexie's `transaction()` API is core, stable since v1; the only risk is a syntax/typing mismatch with this project's specific Dexie version, easily caught by `svelte-check`/`tsc` at implementation time |
| A2 | `@lucide/svelte`'s `RotateCcw` icon export name is correct for v1.23.0 | Standard Stack, UI-SPEC cross-ref | Low-Medium — icon names occasionally get renamed across major lucide versions; verify with a quick `grep -r "RotateCcw" node_modules/@lucide/svelte` before use, or fall back to `RefreshCw` (both are named as acceptable alternatives in 04-UI-SPEC.md itself) |

**If this table is empty:** N/A — two low-risk assumptions logged above; both are cheap to verify at implementation time and both already have a documented fallback in 04-UI-SPEC.md.

## Open Questions (RESOLVED)

1. **Should `assignRanks`/`computeClassRankings` also expose a flat (non-per-class) variant for the future v1.5 jsPDF "all results" export?**
   - What we know: CLAUDE.md explicitly flags that ranking logic should stay reusable for jsPDF export later; the per-class `Map<classId, RankedRow[]>` shape already satisfies "per class" grouping.
   - What's unclear: Whether v1.5's PDF export will want a single flat sorted array across all classes, or the same per-class grouping. Not knowable now since v1.5 requirements aren't written yet.
   - RESOLVED: Don't over-build now. The current per-class `Map` return shape is trivially flattenable (`[...map.values()].flat()`) if v1.5 needs it — no design debt is created by keeping the Phase 4 shape as-is.

2. **Does `db.transaction()` need the `rounds`/`classes`/`shootingLines` tables included in its table list even though they aren't cleared?**
   - What we know: Dexie's transaction API only needs to list tables that are read/written inside the transaction callback.
   - What's unclear: None functionally — this is settled by Dexie's documented API (only `shooters`/`scores` need listing since only they are touched).
   - RESOLVED: List only `db.shooters, db.scores` in the transaction call, exactly as shown in Code Examples above.

## Environment Availability

Skipped — this phase has no external dependencies beyond the already-installed npm packages verified in Standard Stack; no new CLI tools, runtimes, or services are introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unit/component) + @testing-library/svelte 5.4.2 + Playwright 1.61.1 (e2e) — all already configured, verified via `package.json`/`vitest.config.ts`/`playwright.config.ts` |
| Config file | `/home/code/MeinBogenturnier/vitest.config.ts` (unit), `/home/code/MeinBogenturnier/playwright.config.ts` (e2e) |
| Quick run command | `npm run test -- ranking` (targets new ranking unit tests only) |
| Full suite command | `npm run test:all` (`npm run test && npm run test:e2e`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RES-01 | Results ranked descending, grouped per class | unit | `npx vitest run src/lib/utils/ranking.test.ts` | ❌ Wave 0 |
| RES-02 | Shared rank, skip-next (1-2-2-4) | unit | `npx vitest run src/lib/utils/ranking.test.ts -t "rank"` | ❌ Wave 0 |
| RES-03 | Phone: single class via dropdown | unit (class-presence) + e2e (real breakpoint) | `npx vitest run src/lib/views/Results.test.ts` / `npx playwright test e2e/results.spec.ts -g "phone"` | ❌ Wave 0 |
| RES-04 | Tablet/desktop: responsive grid | unit (class-presence) + e2e | `npx playwright test e2e/results.spec.ts -g "desktop"` | ❌ Wave 0 |
| RES-05 | Reset clears shooters+scores only | unit (component) + e2e (full flow incl. reload) | `npx vitest run src/lib/views/Results.test.ts -t "reset"` | ❌ Wave 0 |
| RES-06 | Guard blocks delete/config-edit while finalized | unit (per guarded view) + e2e | `npx vitest run src/lib/views/Registration.test.ts -t "finalized"` | ❌ Wave 0 (no `Registration.test.ts` exists yet — see gap below) |

### Sampling Rate
- **Per task commit:** `npm run test -- <touched-file-pattern>`
- **Per wave merge:** `npm run test:all`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/utils/ranking.test.ts` — covers RES-01/RES-02 (tie handling, skip-next rank assignment, incomplete-sum flag, alphabetical row tiebreak)
- [ ] `src/lib/utils/scoreCompletion.test.ts` — extend with `computeIsFinalized` cases (vacuous-false-when-empty, true-when-all-finalized, false-when-mixed)
- [ ] `src/lib/views/Results.test.ts` — new file; component tests for empty state, in-progress marker rendering, dual-render class presence (phone dropdown div has `md:hidden`, grid div has `hidden md:grid`), reset confirm/cancel flow against `fake-indexeddb`
- [ ] `src/lib/views/Registration.test.ts` — **does not exist today** (Registration.svelte has zero unit tests currently, confirmed via file listing) — creating it is now required to cover RES-06's guard on the delete-shooter button; alternatively cover this guard purely via e2e if the planner decides a first Registration unit-test file is out of this phase's scope, but the guard behavior itself MUST be tested somewhere
- [ ] `e2e/results.spec.ts` — new file; real-viewport breakpoint proof (375px dropdown-only, 1024px 1-2 col grid, 1440px 3-col grid per 04-UI-SPEC.md's exact breakpoints) and full reset-flow-with-reload proof (mirrors `e2e/scoring.spec.ts`'s finalize-then-reload pattern)
- [ ] Framework install: none — all frameworks already present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-device, single-user offline app — no authentication surface exists anywhere in this app (confirmed: no login, no accounts, per CLAUDE.md's explicit out-of-scope list) |
| V3 Session Management | No | No sessions — app state is entirely local IndexedDB, no server session to manage |
| V4 Access Control | No | Single trainer, single device, no multi-user roles to enforce |
| V5 Input Validation | Yes (limited) | Reset confirmation is the phase's one irreversible action — mitigated by reusing `ConfirmDialog`'s existing non-dismissible, explicit-choice pattern (D-09), not new validation logic. No user-supplied text input is newly introduced by this phase (ranking reads only already-validated `ScoreRecord`/`ShooterRecord` data written by Phases 2-3) |
| V6 Cryptography | No | No secrets, no crypto operations anywhere in this app |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental/premature destructive reset (data loss) | Repudiation / Tampering (self-inflicted, not adversarial) | `ConfirmDialog` non-dismissible explicit-confirm pattern (D-09) — already the app's standard mitigation for every destructive action (finalize, preset delete/overwrite, class delete); Phase 4 reuses it rather than inventing a new safeguard |
| Guard bypass via direct IndexedDB manipulation (e.g. browser devtools) circumventing the UI-level RES-06 disabled-button guard | Tampering | Out of scope — this is a single-device trust-the-operator tool per CLAUDE.md's stated threat model (no adversarial user is assumed; the trainer is the sole, trusted operator of their own browser's IndexedDB). Documenting this explicitly so the guard is understood as a UX safeguard against *accidental* clicks, not a security boundary |
| Non-atomic multi-table clear leaving orphaned records on interruption | Tampering (data integrity, not adversarial) | Dexie `db.transaction('rw', ...)` — see Common Pitfalls #3 |

This app's threat model (per CLAUDE.md: single trusted trainer, single device, offline, no network attack surface, no backend to compromise) means the ASVS categories that dominate typical web-app security research (authn/authz/session/crypto) are structurally inapplicable. The only meaningful "security" work in this phase is data-integrity safeguarding (atomic reset) and UX-level guard-against-accidents (ConfirmDialog reuse) — both already covered above.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection (`Read`/`Bash grep`) of `src/lib/utils/scoreCompletion.ts`, `src/lib/db/schema.ts`, `src/lib/views/ScoreEntry.svelte`, `src/lib/views/Registration.svelte`, `src/lib/views/Setup.svelte`, `src/lib/views/SetupRounds.svelte`, `src/lib/components/ClassForm.svelte`, `src/lib/components/ScoreTable.svelte`, `src/lib/components/ConfirmDialog.svelte`, `src/App.svelte`, `src/lib/i18n/strings.de.ts`, `package.json`, `vitest.config.ts`, `e2e/nav.spec.ts`, `e2e/scoring.spec.ts` — all checked directly against the current working tree, 2026-07-05
- `.planning/phases/04-results/04-CONTEXT.md`, `.planning/phases/04-results/04-UI-SPEC.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/config.json` — read in full for this research

### Secondary (MEDIUM confidence)
- None required — no external documentation lookup was needed since this phase introduces no new libraries; all patterns are derived from this repository's own prior-phase source code, which is authoritative for "how this codebase does X."

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all versions read directly from `package.json`
- Architecture: HIGH — every pattern is a direct extension of Phase 1-3 code already in the repository, inspected directly
- Pitfalls: HIGH — derived from direct inspection of the exact functions being extended/reused (`scoreCompletion.ts`, `ScoreEntry.svelte`'s `isFinalized`), not speculative

**Research date:** 2026-07-05
**Valid until:** 30 days (stable — no external dependencies to go stale; only risk is upstream Svelte/Dexie/Tailwind patch releases, none of which are expected to change the APIs used here)
