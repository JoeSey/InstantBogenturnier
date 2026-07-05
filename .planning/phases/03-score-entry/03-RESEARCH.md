# Phase 3: Score Entry - Research

**Researched:** 2026-07-05
**Domain:** Real-time score data entry, autosave persistence, sortable tabular UI, finalization policy
**Confidence:** HIGH

## Summary

Phase 3 implements live per-arrow score entry during a tournament. The user-visible design is a sortable, dropdown-navigated score table with tap-button score picker (0-10, X, M per WA convention). All data persists immediately to IndexedDB (autosave-per-cell), with a permanent finalization step once all entries are complete. This is the second major use-case for Dexie and Svelte runes; research confirms the existing stack (Svelte 5 runes + `liveQuery()` + `$derived`) is purpose-built for this pattern and no new dependencies are required.

**Primary recommendation:** Extend the Dexie schema to version 3 with a new `scores` table; use `liveQuery()` to reactive-bind the score table to cell updates; implement a cell-update handler that synchronously updates both the UI and triggers a non-blocking Dexie write; define "all entries complete" via a computed check across all shooters × rounds × passes × arrows; protect the finalize action with a confirmation dialog (reuse existing `ConfirmDialog` component).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Score data persistence | Database / Storage (IndexedDB) | — | All score writes go to Dexie; this is the critical data store for the phase |
| Real-time per-cell autosave | Frontend Server (SPA) | Browser | Svelte component detects cell tap, updates IndexedDB immediately, no manual save step |
| Tap-button picker UI | Browser | — | Pure client-side interaction; buttons render in the browser, tap handlers trigger immediately |
| Sortable table rendering | Browser | Frontend Server | Table columns render in Svelte; sort order is local state (no persistence needed), applied to the in-memory shot-list |
| Round/passe dropdown navigation | Browser | — | Navigation state lives in Svelte component; query scope changes but not persisted |
| Completion detection (all-cells-filled check) | Frontend Server (SPA) | Database | Svelte derives the completion state by querying the scores table; shown in UI to gate the finalize button |
| Finalization & lock | Database / Storage (IndexedDB) | Frontend Server | A single DB write sets `finalized: true` on all score records; the UI disables all score-entry controls in response |

## Standard Stack

### Core (Locked from CLAUDE.md)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Svelte | 5.56.4 | UI framework with runes-based reactivity | Already locked. Svelte 5 runes (`$state`, `$derived`, `$effect`) are ideal for managing sort state, completion detection, and derived table views without adding Redux/Zustand. |
| Vite | 8.1.3 | Build tool | Locked from Phase 1; all dev dependencies peer on Vite 8. |
| Dexie.js | 4.4.4 | IndexedDB wrapper & reactive queries | Already locked. `liveQuery()` returns a store-like object that auto-subscribes in Svelte (`$liveQuery` syntax), eliminating boilerplate for "refresh table when a cell is updated" logic. |
| Tailwind CSS | 4.3.2 | Utility-first styling | Locked from Phase 1. Phase 1 D-11 mandates score-entry table stays fully opaque/high-contrast (no glassmorphism); Tailwind's opacity/contrast utilities enable this easily. |
| TypeScript | 6.0.3 | Static typing | Recommended. Score records have a clear shape (shooterId, roundId, passeIndex, arrowIndex, value, finalized?) — typed schema prevents sort/completion-check bugs. |

### Supporting (Phase 3 specific)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/svelte | 5.4.2 | Component-level tests for score table, tap buttons, sort UI | Always. Tests verify that cell updates autosave and that sort-on-click works correctly. |
| Vitest | 4.1.9 | Unit tests for completion-check logic, sort comparators | Always. Completion detection (all-cells-filled) must be bulletproof — test every edge case (partial rows, partial rounds, multi-pass scenarios). |
| @playwright/test | 1.61.1 | End-to-end tests for offline autosave, device-close-mid-entry recovery | For Phase 3 acceptance test of SCORE-03 (no data loss if device closes). Playwright can simulate offline mode and measure IndexedDB persistence across page reloads. |

### Reusable from Phase 2
| Component | Purpose | Reuse Pattern |
|-----------|---------|----------------|
| `ConfirmDialog.svelte` | Non-dismissible modal for destructive actions | Wrap the finalize button's onclick; show a confirm dialog before setting `finalized: true`. |
| `liveQuery()` + `$derived` pattern | Reactive Dexie queries | Established in Registration.svelte and ShooterForm.svelte; same pattern for the score table's row data and completion check. |
| `db.resetDb()` in testHelpers.ts | Test setup/teardown | Extend to clear the new `scores` table; all Phase 3 tests will call `beforeEach(resetDb)`. |
| Tailwind spacing/color tokens | Design system | Use existing slate/teal palette. Phase 1 D-11 constraint (opaque/high-contrast table) fits naturally with existing tokens. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dexie `liveQuery()` + Svelte auto-subscription | Manual `async/await` + `$effect` to refresh on cell change | Dexie's approach is simpler: `liveQuery()` gives you a reactive object that Svelte subscribes to automatically. Manual refresh is more boilerplate and prone to timing bugs (race conditions on rapid cell edits). Not recommended for autosave-per-cell. |
| Tap-button picker (D-01) | Native `<select>` dropdown or text input | Tap buttons are faster (1 tap = 1 score, no confirmation), one-handed (no keyboard), and work reliably outdoors. Native `<select>` on mobile opens a picker menu, adding latency. Text input requires validation. Tap buttons are the right choice for the use case. |
| Sortable table via plain array `.sort()` | Third-party library (e.g., `@tanstack/svelte-table`) | Plain `.sort()` is sufficient for this phase (max ~100 shooters per tournament, one-time sort on click). A headless table library adds complexity for zero benefit at this scale. Defer if sorting becomes a UI bottleneck or if multi-column grouping is later needed. |
| Completion detection via COUNT query | Iterating shooters and checking each one's score fill | A single COUNT query (`scores WHERE roundId = X AND passeIndex = Y`) is fastest for "how many scores entered so far?" — but a full table scan is also acceptable given the small dataset. A pure function (`allScoresEntered(shooters, rounds, scores)`) is easiest to test and understand. Use the function approach; optimize with a COUNT query if UI responsiveness suffers. |
| Finalize as per-shooter lock | Tournament-wide lock (all-or-nothing) | D-09/D-10 lock the whole tournament at once, not per-shooter. This simplifies the completion check (don't need per-shooter "finalized" state) and matches the UX (one [Abschließen] button, not per-row). Per-shooter finalization is deferred to future versions if multi-session tournaments are ever supported. |

**Installation:**
```bash
# No new npm installs needed — all Phase 3 dependencies already in package.json from Phase 1/2.
# Verify existing stack:
npm ls dexie @testing-library/svelte vitest @playwright/test
```

**Version verification:** All versions already confirmed in Phase 1/2 research and locked in CLAUDE.md.

## Package Legitimacy Audit

> Not applicable — Phase 3 does not install any new external packages. All dependencies are inherited from Phase 1 (PWA shell, Vite, Svelte, Tailwind) and Phase 2 (Dexie, testing libraries). Reuses `dexie-export-import` already installed in Phase 2.

## Architectural Components & Data Flow

### System Architecture Diagram

```
User at Range (single device, offline)
         ↓
    [Browser UI]
         ├─ Score Entry View (SPA route)
         │   ├─ Dropdown: Select Round & Passe
         │   ├─ Sortable Score Table
         │   │   └─ Rows: 1 per shooter (Linie, Name, Klasse, arrow columns, Summe)
         │   │       ├─ Tap-button picker for each arrow cell
         │   │       └─ Cell click → update local state + trigger autosave
         │   ├─ Completion detector: "All cells filled?" query
         │   ├─ [Abschließen] button (enabled only if completion == true)
         │   └─ Confirmation modal for finalize (reuse ConfirmDialog)
         │
         ├─ State Management (Svelte $state runes)
         │   ├─ sortBy: 'line' | 'name' | 'class' | 'sum' (local, not persisted)
         │   ├─ selectedRound: number
         │   ├─ selectedPasse: number
         │   ├─ finalized: boolean (read from DB)
         │
         └─ Dexie IndexedDB
            ├─ Phase 2 tables (classes, shooters, rounds, shootingLines)
            └─ Phase 3 tables
                └─ scores table
                    ├─ shooterId (PK component)
                    ├─ roundId (PK component)
                    ├─ passeIndex (PK component)
                    ├─ arrowIndex (PK component)
                    ├─ value: 0–10 | 'X' | 'M' | null (unscoredyet)
                    └─ finalized: boolean (once true, read-only)
```

### Score Entry Flow (per cell tap)

1. User taps button for arrow score (e.g., "8")
2. Svelte state updates immediately (optimistic UI)
3. Function `saveScore(shooterId, roundId, passeIndex, arrowIndex, value)` fires (non-blocking)
   - Writes to `db.scores.put({})`
   - If write fails, catch and surface error (WR-04 from Phase 2)
4. Completion check recomputes (`allScoresEntered()`) — if true, enable [Abschließen]
5. Sum column recomputes (derived from arrow values for current passe)
6. If user closes device or tab mid-entry: page reloads, `liveQuery` refetches scores from IndexedDB, table re-renders with saved state intact (SCORE-03/05 satisfied)

### Recommended Project Structure
```
src/
├── lib/
│   ├── components/
│   │   ├── ScoreTable.svelte          # Main table (rows, columns, sort)
│   │   ├── ScorePicker.svelte         # Tap-button picker modal/popover
│   │   ├── RoundPasseSelector.svelte  # Dropdowns for round/passe navigation
│   │   └── [existing Phase 2 components]
│   ├── db/
│   │   ├── schema.ts                  # version(3) with scores table
│   │   └── testHelpers.ts             # extend resetDb() to clear scores
│   ├── utils/
│   │   ├── scoreCompletion.ts         # allScoresEntered() function + tests
│   │   └── sortComparators.ts         # sort-by-column functions + tests
│   ├── views/
│   │   └── ScoreEntry.svelte          # Main view (replaces ScoringPlaceholder)
│   └── [existing Phase 1/2 files]
├── main.ts
└── App.svelte

tests/ (test files colocated with sources):
├── lib/utils/scoreCompletion.test.ts
├── lib/utils/sortComparators.test.ts
├── lib/views/ScoreEntry.test.ts
└── [existing test files]
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autosave synchronization | Custom queue/debounce for IndexedDB writes | Direct `db.scores.put()` calls per cell | Dexie handles IndexedDB transactions; debouncing adds latency and complexity without benefit. Immediate writes are reliable offline and on range. |
| Reactive score queries | Manual event emitters / subscribers | Dexie `liveQuery()` + Svelte `$derived` | `liveQuery()` is built for this — it watches the DB and re-evaluates subscriptions on write. Reimplementing this is bug-prone and verbose. |
| Completion state derivation | Polling / manual table scans | `$derived(() => allScoresEntered(shooters, rounds, scores))` | A single pure function called once per render beat is cleaner than reactive subscriptions or polled queries. Derive, don't poll. |
| Sortable table | Custom DOM manipulations / array copies | Svelte `$derived` + `.sort()` on an array | Svelte's reactivity handles re-rendering automatically. A third-party table library (e.g. `@tanstack/svelte-table`) is overkill for this dataset size. |
| Finalization lock | Per-row "locked" flags + conditional rendering | Single `finalized: boolean` toggle on all scores | All-or-nothing finalization (D-10) means all scores lock together. One boolean on the DB, derived in the UI to disable all input, is simpler than tracking per-row state. |

**Key insight:** This phase's data model is a **write-heavy table of small, independent records** (one per arrow per shooter per round). Dexie's IndexedDB transaction model and `liveQuery()` reactivity are exactly right for this. Don't layer custom state management on top — let the DB be the source of truth.

## Dexie Schema Extension (version 3)

### New Table: `scores`

**TypeScript interface:**
```typescript
export interface ScoreRecord {
  id?: number;           // Auto-increment PK (optional for put, required after get)
  shooterId: number;     // FK to shooters
  roundId: number;       // FK to rounds (or round number/config?)
  passeIndex: number;    // 0-based index within the round
  arrowIndex: number;    // 0-based index within the passe
  value: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'X' | 'M' | null;  // null = not yet entered
  finalized: boolean;    // false by default; true after [Abschließen] clicked
}
```

**Dexie schema (version 3 migration block):**
```typescript
this.version(3).stores({
  // ... Phase 2 tables unchanged ...
  scores: '++id, shooterId, roundId, [shooterId+roundId+passeIndex+arrowIndex]', // Compound index for efficient cell lookups
});
```

### Indexing Strategy

- **`++id`** — Auto-increment primary key (Dexie best practice for simple lookups)
- **`shooterId`** — Query all scores for a shooter (fill-check per-shooter)
- **`roundId`** — Query all scores for a round (completion detection by round)
- **`[shooterId+roundId+passeIndex+arrowIndex]`** — Compound index for exact-cell lookup (used in `saveScore()` to update a single cell efficiently)

Rationale: The most common operations are (1) "get all scores for shooter X in round Y" (row-rendering), (2) "get one specific cell" (autosave), and (3) "count completed cells across all shooters" (completion check). These three index choices cover all three efficiently.

## Common Pitfalls

### Pitfall 1: Race Condition on Rapid Cell Edits
**What goes wrong:** User taps two arrow buttons in quick succession. The first tap starts an async IndexedDB write. The second tap updates the state and starts another write. If the first write completes after the second, the score table may show the wrong value (first tap's value instead of second tap's).

**Why it happens:** Autosave-per-cell means the DB and UI can get out of sync if writes complete out-of-order. Optimistic UI updates mask the problem until the user closes and reopens the app.

**How to avoid:** 
1. Update the UI state *immediately* (not waiting for the DB write to complete) — optimistic updates.
2. Trigger the DB write *after* the state update, but *non-blocking* (no `await`). If it fails, catch and surface the error via WR-04 (error message).
3. Ensure the Dexie put() is idempotent — the same shooterId/roundId/passeIndex/arrowIndex always updates the same record, never creates duplicates.

**Warning signs:** 
- Score value on screen differs from what's in IndexedDB after reload
- Multiple ScoreRecords with the same shooter/round/passe/arrow key (indicates duplicate puts)
- Errors in browser console: "unique constraint violated"

### Pitfall 2: Completion Check Doesn't Account for All Shooters
**What goes wrong:** Phase 2's AB/AB-CD mode means shooters are grouped by line & flight. A completion check that only queries "round X, passe Y" misses shooters who aren't registered on that line. The [Abschließen] button enables prematurely.

**Why it happens:** Incomplete understanding of how shooters are organized. The completion check must iterate over *all registered shooters*, not just "shooters on a particular line."

**How to avoid:**
```typescript
// Good: checks *every* registered shooter
async function allScoresEntered(): Promise<boolean> {
  const shooters = await db.shooters.toArray();
  const rounds = await db.rounds.toArray();
  for (const shooter of shooters) {
    for (const round of rounds) {
      for (let passe = 0; passe < round.passesPerRound; passe++) {
        for (let arrow = 0; arrow < round.arrowsPerPasse; arrow++) {
          const score = await db.scores.get({
            shooterId: shooter.id!,
            roundId: round.id!,
            passeIndex: passe,
            arrowIndex: arrow,
          });
          if (!score || score.value === null) return false; // Not filled
        }
      }
    }
  }
  return true;
}
```

**Warning signs:**
- [Abschließen] button enables even though some rows in the table still have empty cells
- After finalization, user discovers that some shooters' rounds weren't actually complete

### Pitfall 3: iOS Safari IndexedDB Eviction
**What goes wrong:** User opens the app on an iPad at the range after a week of not using it. IndexedDB is empty — scores are lost.

**Why it happens:** iOS Safari has a documented behavior of evicting IndexedDB/cache storage after ~7 days of inactivity for web content (not installed PWAs, but the browser app). This is a known limitation of iOS WebKit, not a bug in the app.

**How to avoid:** 
- Call `navigator.storage.persist()` on first app launch (via `$effect` in App.svelte or a startup script), requesting permanent storage — not guaranteed, but improves odds on iOS.
- For user protection, the app already includes `dexie-export-import` (Phase 2) — consider surfacing an "Export Tournament Data" button after finalization, so the trainer can download a backup JSON.
- This is not a Phase 3 blocker; it's a known-acceptable risk documented in CLAUDE.md. Phase 3 must implement correct autosave; Phase 1's PWA + iOS workarounds handle the edge case.

**Warning signs:**
- Trainer reports data loss on iPad after > 7 days of app inactivity
- No IndexedDB errors in console (storage silently evicted, not an error)

### Pitfall 4: Finalization State Not Propagating to UI
**What goes wrong:** User clicks [Abschließen], the DB updates, but the score-entry cells remain tappable. User can still edit scores.

**Why it happens:** The `finalized` flag is set on the scores table, but the UI isn't derived from it. Or the UI queries `finalized` but the reactive query isn't re-evaluated after the put.

**How to avoid:**
- Define a `$derived` boolean: `let isFinalized = $derived($scoreQuery?.every((s) => s.finalized));`
- Disable all score cells: `<button disabled={isFinalized} ...>`
- After finalize button is clicked, re-fetch the scores table to ensure the derived value updates.

**Warning signs:**
- Tap buttons remain clickable after finalization
- Browser console errors about modifying locked records

### Pitfall 5: Sorting State Gets Confused with Persistence
**What goes wrong:** User sorts by "Summe" (sum column), closes the app. App reopens with a different sort order — or doesn't sort at all. User is confused about which order is "real."

**Why it happens:** Sort order is local UI state (shouldn't be persisted to the DB), but if the component doesn't clearly manage the sort state, it may get confused with some cached sort or fallback.

**How to avoid:**
- Keep sort state in a simple `$state` variable: `let sortBy = $state<'line' | 'name' | 'class' | 'sum'>('line');`
- Column headers are clickable; clicking toggles the sort key and direction: `onclick={() => { sortBy = sortBy === 'line' ? 'name' : 'line'; }}`
- Derive the sorted array: `let sorted = $derived(sortShooters(shooters, sortBy));`
- Do NOT persist sort order to IndexedDB — it's ephemeral UI state, not tournament data.

**Warning signs:**
- Sort state persists across page reloads (indicates it's being written to DB)
- Clicking a column header multiple times doesn't toggle sort correctly

## Code Examples

All examples use Svelte 5 runes + Dexie + TypeScript, per CLAUDE.md and Phase 2 established patterns.

### Autosave Function (Non-blocking Write)

```typescript
// Source: CLAUDE.md "Stack Patterns by Variant" + Phase 2 pattern (Registration.svelte, WR-04)

async function saveScore(
  shooterId: number,
  roundId: number,
  passeIndex: number,
  arrowIndex: number,
  value: string | null,
): Promise<void> {
  try {
    // Dexie's put() is idempotent — upserts the record by the compound key.
    // No `await` — fire and forget, so the UI responds instantly.
    db.scores.put({
      shooterId,
      roundId,
      passeIndex,
      arrowIndex,
      value,
      finalized: false, // Only the finalize action sets this to true
    }).catch((err) => {
      // Surface errors per WR-04 (Phase 2 pattern)
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err),
      );
    });
  } catch (err) {
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err),
    );
  }
}
```

### Reactive Score Query with liveQuery (Phase 2 Pattern)

```typescript
// Source: Registration.svelte (Phase 2), liveQuery + $derived pattern from CLAUDE.md

const scoresQuery = liveQuery(() =>
  db.scores
    .where({ roundId, passeIndex })
    .toArray(),
);
let scores = $derived($scoresQuery ?? []);

// Derive a map for O(1) lookups in the table render loop
let scoreByShooterId = $derived(
  new Map(scores.map((s) => [s.shooterId, s])),
);
```

### Completion Detection (Pure Function + $derived)

```typescript
// Source: CLAUDE.md "Stack Patterns by Variant" — derive the completion check

// Pure function — testable in isolation, no side effects
async function areAllScoresEntered(
  shooters: ShooterRecord[],
  rounds: RoundConfig[],
  scores: ScoreRecord[],
): Promise<boolean> {
  for (const shooter of shooters) {
    for (const round of rounds) {
      for (let passe = 0; passe < round.passesPerRound; passe++) {
        for (let arrow = 0; arrow < round.arrowsPerPasse; arrow++) {
          const score = scores.find(
            (s) =>
              s.shooterId === shooter.id &&
              s.roundId === round.id &&
              s.passeIndex === passe &&
              s.arrowIndex === arrow,
          );
          if (!score || score.value === null) {
            return false;
          }
        }
      }
    }
  }
  return true;
}

// In component:
let completionChecked = $state(false);
let isComplete = $state(false);

$effect(async () => {
  const complete = await areAllScoresEntered(shooters, rounds, scores);
  isComplete = complete;
  completionChecked = true;
});

// In template:
<button disabled={!completionChecked || !isComplete}>{strings.scoring.finalizeButton}</button>
```

### Tap-Button Picker Component

```svelte
<!-- Source: Phase 3 tap-button design per D-01 -->
<script lang="ts">
  const scoreValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'X', 'M'];
  let { onscoreselected } = $props<{
    onscoreselected: (value: string) => void;
  }>();
</script>

<div class="grid grid-cols-5 gap-2 p-4">
  {#each scoreValues as value}
    <button
      type="button"
      onclick={() => onscoreselected(value)}
      class={`min-h-[44px] rounded-lg font-semibold text-[16px] leading-[1.5]
        ${value === 'M' ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100' : ''}
        ${value === 'X' ? 'bg-yellow-200 text-slate-900 dark:bg-yellow-600 dark:text-slate-100' : ''}
        ${!['M', 'X'].includes(value) ? 'bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900' : ''}
      `}
    >
      {value}
    </button>
  {/each}
</div>
```

### Sortable Column Header

```svelte
<!-- Source: Phase 3 sortable table pattern -->
<script lang="ts">
  let sortBy = $state<'line' | 'name' | 'class' | 'sum'>('line');
  let sortDir = $state<'asc' | 'desc'>('asc');

  function handleColumnClick(column: typeof sortBy) {
    if (sortBy === column) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortDir = 'asc';
    }
  }
</script>

<table class="w-full border-collapse">
  <thead>
    <tr class="border-b border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      <th
        class="cursor-pointer px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        onclick={() => handleColumnClick('line')}
      >
        Linie {sortBy === 'line' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
      </th>
      <th
        class="cursor-pointer px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        onclick={() => handleColumnClick('name')}
      >
        Name {sortBy === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
      </th>
      <th
        class="cursor-pointer px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
        onclick={() => handleColumnClick('class')}
      >
        Klasse {sortBy === 'class' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
      </th>
      <!-- Arrow columns (1, 2, 3, ...) -->
      <th
        class="cursor-pointer px-4 py-2 text-right hover:bg-slate-100 dark:hover:bg-slate-800"
        onclick={() => handleColumnClick('sum')}
      >
        Summe {sortBy === 'sum' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
      </th>
    </tr>
  </thead>
  <!-- Tbody with sorted shooter rows... -->
</table>
```

### Finalization Confirmation & Lock

```svelte
<!-- Source: Phase 3 finalize pattern using ConfirmDialog (Phase 2 reusable component) -->
<script lang="ts">
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import { db } from '../db/schema';

  let finializeDialogOpen = $state(false);
  let errorFeedback = $state('');

  async function handleFinalize() {
    try {
      // Single write: update all score records to set finalized = true
      const allScores = await db.scores.toArray();
      await db.scores.bulkPut(
        allScores.map((s) => ({ ...s, finalized: true })),
      );
      finializeDialogOpen = false;
      // UI will reactively disable all score cells because finalized = true
    } catch (err) {
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
</script>

<ConfirmDialog
  open={finializeDialogOpen}
  title="Turnier abschließen?"
  body="Diese Aktion sperrt alle Ergebnisse und kann nicht rückgängig gemacht werden."
  confirmLabel="Ja, abschließen"
  cancelLabel="Abbrechen"
  destructive={true}
  onconfirm={handleFinalize}
  oncancel={() => { finializeDialogOpen = false; }}
/>
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dexie `liveQuery()` + Svelte `$derived` pattern is the standard for this stack (confirmed via Phase 2 usage in Registration.svelte) | Standard Stack, Code Examples | LOW — if pattern is incorrect, component re-render logic will fail in testing; easy to catch and fix with a different state pattern. |
| A2 | Tap buttons are the intended score-input mechanism (D-01 in CONTEXT.md) | Architecture Patterns | LOW — locked decision. |
| A3 | Completion check must cover all shooters × all rounds × all passes (extrapolated from D-09 "every shooter, every passe, every configured round") | Common Pitfalls | MEDIUM — if misunderstood, the [Abschließen] button will enable prematurely, allowing partial-entry finalization. Test coverage will catch this. |
| A4 | Sort order is ephemeral (not persisted to DB); only the in-memory table view is sorted | Common Pitfalls | MEDIUM — if sort order is persisted, it will confuse the data model. Clear documentation/comments will prevent this. |
| A5 | Finalization is all-or-nothing (all scores lock together, not per-shooter) | Architecture Patterns | LOW — locked decision in D-09/D-10. |

## Open Questions

1. **Passe configuration: does "passe" refer to an index into the round, or is it a separate dimension?**
   - What we know: Phase 2 CONTEXT.md D-01 defines "Passe" as "one end (Durchgang)" — a set of arrows shot together. Phase 2 schema has `passesPerRound` and `arrowsPerPasse`.
   - What's unclear: Is a "passe" identified by a sequential index (0, 1, 2, ..., passesPerRound-1), or does it have its own ID in the DB?
   - Recommendation: Use sequential 0-based indexing (see `passeIndex` in the ScoreRecord interface above). This matches how rounds and passes are conceptually grouped in the score table UI.

2. **Efficiency of the completion check: should it query the DB, or compute from the in-memory scores array?**
   - What we know: Completion check needs to iterate all shooters × all rounds × all passes. IndexedDB queries are async.
   - What's unclear: Is it better to load all scores into memory and compute, or to query the DB for each cell?
   - Recommendation: Load all scores once (`db.scores.toArray()`), then compute in-memory. Fewer DB round-trips, faster (IndexedDB transactions can be slow on mobile). Cache the result in a `$derived` for reactivity.

3. **Error recovery: if a cell autosave fails mid-entry, what should the UI show?**
   - What we know: WR-04 (Phase 2 pattern) surfaces errors via a message div.
   - What's unclear: Should the UI block further cell edits until the error is cleared? Or allow the trainer to keep tapping and accumulate errors?
   - Recommendation: Surface the error in a message div (non-blocking), but allow further cell edits. The trainer can dismiss the error message and retry the problematic cell. This matches the "keep moving" philosophy of range use.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). Phase 3 uses only browser APIs (IndexedDB via Dexie, DOM tap events, LocalStorage via browser's native APIs) and the existing project dependencies (Svelte, Vite, Tailwind, Dexie — all already verified in Phase 1/2). No external CLI tools, services, or runtimes are required for Phase 3 execution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 + @testing-library/svelte 5.4.2 |
| Config file | `vitest.config.ts` (exists from Phase 1) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SCORE-01 | Trainer can enter per-arrow scores (0-10, M) in a table | Component | `npm test -- lib/views/ScoreEntry.test.ts` | ❌ Wave 0 |
| SCORE-02 | "M" (miss) is treated as zero in sum calculations | Unit | `npm test -- lib/utils/scoreCompletion.test.ts` | ❌ Wave 0 |
| SCORE-03 | Score entries are saved as they're entered (autosave, no data loss on reload) | E2E | `npm run test:e2e -- scoring.spec.ts` (offline mode, device-close simulation) | ❌ Wave 0 |
| SCORE-04 | Table is sortable by clicking column headers | Component | `npm test -- lib/views/ScoreEntry.test.ts` (sort interaction tests) | ❌ Wave 0 |
| SCORE-05 | Interim-save progress at any point; entries remain editable | Unit + E2E | `npm test -- lib/utils/scoreCompletion.test.ts` + `npm run test:e2e` | ❌ Wave 0 |
| SCORE-06 | App detects when all configured rounds/passes are fully entered; shows [Abschließen] button | Unit | `npm test -- lib/utils/scoreCompletion.test.ts` (allScoresEntered edge cases) | ❌ Wave 0 |
| SCORE-07 | Once finalized, score entries are locked and cannot be edited | Component + E2E | `npm test -- lib/views/ScoreEntry.test.ts` (finalized flag disables cells) + `npm run test:e2e` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run` (unit + component tests, ~30 sec)
- **Per wave merge:** `npm run test && npm run test:e2e` (full suite including Playwright e2e, ~2 min)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/utils/scoreCompletion.test.ts` — test `allScoresEntered()` function with edge cases (empty shooters, partial rounds, multi-passe scenarios)
- [ ] `src/lib/utils/sortComparators.test.ts` — test sort-by-column functions (line, name, class, sum) with ties and edge cases
- [ ] `src/lib/views/ScoreEntry.test.ts` — component-level tests for table rendering, sort interaction, tap-button integration, autosave side effects
- [ ] `e2e/scoring.spec.ts` — end-to-end tests verifying SCORE-03 (autosave on close/reload), finalization lock, offline mode
- [ ] `src/lib/db/testHelpers.ts` — extend `resetDb()` to clear the new `scores` table

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Not applicable — single-device, single-user app. No multi-user auth. |
| V3 Session Management | No | Not applicable — no sessions or login. |
| V4 Access Control | No | Not applicable — no role-based access control. Offline-first, single judge. |
| V5 Input Validation | Yes | Score value whitelist (0-10, X, M only). Reject any other input. Use TypeScript type union to enforce at compile time. |
| V6 Cryptography | No | No sensitive data transmission or storage requiring encryption (scores are local, offline, no external sync). |

### Known Threat Patterns for Svelte + IndexedDB

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious input in score picker | Tampering | Hard-code the tap-button values (0-10, X, M) — do NOT accept arbitrary input. No text field, no user-typed values. Whitelist only. |
| IndexedDB data tampering via browser DevTools | Tampering | IndexedDB is inherently open to DevTools inspection/manipulation (client-side storage limitation). Not a realistic threat for an offline tournament app — trainers aren't expected to be adversaries. If needed in v2, consider `dexie-encrypted` (third-party lib, not currently in stack). For now, rely on trainer trustworthiness. |
| XSS via unsanitized shooter names | Injection | Svelte's template syntax auto-escapes text by default. No risk if shooter names are rendered as `{shooter.name}` in templates. Avoid `{@html shooter.name}` or `.innerHTML` — never use these for user-provided data. |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual "Save" button per row | True autosave-per-cell (D-06/D-07) | Phase 3 (2026-07-05) | Faster entry, no data loss on mid-entry interruption, simpler UI (no save UI). |
| Per-shooter finalization | Tournament-wide finalization (D-09/D-10) | Phase 3 (2026-07-05) | Simpler completion check, clearer UX (one [Abschließen] for the whole tournament). |
| Generic "M counts as 0" logic | Explicit WA scoring convention (D-02) | Phase 3 (2026-07-05) | Matches trainer's mental model of archery scoring. |
| External state library (Redux/Zustand) for sort state | Svelte 5 runes (`$state`, `$derived`) | Phases 2–3 (confirmed best practice) | Simpler, less boilerplate, integrated with framework. |

**Deprecated/outdated:**
- `localStorage` for score data — replaced by Dexie (IndexedDB) for structured, relational storage (Phase 2 onwards).
- Hand-written service-worker cache strategies — replaced by `vite-plugin-pwa`'s `generateSW` (Phase 1).
- Configurable scoring scales per round (e.g., 1-5 for beginners) — decided against for v1 (D-03); use WA 0-10/X/M for all rounds.

## Sources

### Primary (HIGH confidence)
- CLAUDE.md (Sections: Technology Stack, Stack Patterns by Variant, Version Compatibility, PDF Generation, What NOT to Use) — Locked tech stack (Svelte 5.56.4, Vite 8.1.3, Dexie 4.4.4, Tailwind CSS 4.3.2, @testing-library/svelte 5.4.2, Vitest 4.1.9, @playwright/test 1.61.1), `liveQuery()` + `$derived` best practice, peer-dependency constraints verified.
- `.planning/phases/03-score-entry/03-CONTEXT.md` — All architectural decisions (D-01 through D-10), locked phase boundary, code-context reusable assets (ConfirmDialog, resetDb pattern, liveQuery + $derived pattern).
- `.planning/phases/02-setup-registration/02-CONTEXT.md` (D-01/D-02, D-08/D-09) — "Passe" terminology, AB vs AB/CD mode, line assignment logic — context needed for score table row ordering and completion check.
- `.planning/phases/01-foundation/01-CONTEXT.md` (D-11) — Score-entry table must stay opaque/high-contrast (no glassmorphism).
- `src/lib/db/schema.ts` — Current Dexie schema (version 2, 5 tables), index naming conventions, interface patterns.
- `src/lib/components/ConfirmDialog.svelte` — Existing non-dismissible confirmation modal (reusable for finalize action).
- `src/lib/db/testHelpers.ts` — Test reset pattern used throughout Phase 2/3.
- `npm view <pkg> version` (checked 2026-07-05 for all locked dependencies) — Verified exact versions in package.json match CLAUDE.md recommendations.

### Secondary (MEDIUM confidence)
- Dexie.org documentation (https://dexie.org/docs/Tutorial/Svelte) — `liveQuery()` + Svelte auto-subscription pattern, compound index syntax.
- Svelte 5 official docs (https://svelte.dev/docs/5) — Runes API (`$state`, `$derived`, `$effect`), reactivity rules.
- REQUIREMENTS.md (§Score Entry, SCORE-01 through SCORE-07) — Locked requirements this phase implements.
- WebSearch: "Dexie autosave per-cell pattern" (not found a canonical source; pattern confirmed via Phase 2 codebase usage and CLAUDE.md recommendation) — [ASSUMED]

### Tertiary (LOW confidence)
- None — all major claims verified against official docs or locked project decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — All dependencies locked in CLAUDE.md, verified in package.json, peer constraints checked.
- Architecture: **HIGH** — Phase decisions (D-01 through D-10) are locked in CONTEXT.md, no ambiguity.
- Data model (Dexie schema): **MEDIUM** — Proposed schema follows Phase 2 patterns and is optimized for the identified access patterns, but not yet reviewed/approved by planner. Feedback during planning may adjust indexing or field names.
- Patterns (autosave, sorting, completion check): **MEDIUM** — Based on confirmed stack (Svelte 5, Dexie, @testing-library) and existing codebase patterns (Phase 2 Registration, Presets), but Phase 3 implementation will be the first use of autosave in this project — potential edge cases on rapid cell edits may surface during testing.
- Testing: **MEDIUM** — Test framework stack is confirmed (Vitest, Playwright, fake-indexeddb), but Wave 0 tests don't exist yet. Completion-check edge cases and offline autosave verification may require additional test coverage during planning/implementation.
- Common pitfalls: **MEDIUM** — Pitfalls inferred from general autosave/tabular-UI wisdom and Dexie/iOS Safari known limitations (documented in CLAUDE.md). Phase 3 execution may surface different/new pitfalls.

**Research date:** 2026-07-05
**Valid until:** 2026-07-12 (7 days — fast-moving testing requirements; if Vitest/Playwright behavior changes, refresh; otherwise stable given locked stack)

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Score input is a tap-button picker (0-10, X, M), not text input or `<select>`.
- **D-02:** WA scoring convention: X = inner-ten, counts as 10 in sum; M = miss, counts as 0. X and M are displayed distinctly.
- **D-03:** Scoring scale is fixed (0-10/X/M) for all rounds — not configurable per round.
- **D-04:** Navigation is dropdown selectors for Runde and Passe — table shows only current passe's columns and sum.
- **D-05:** "Summe" column shows only current passe's sum, not running total across rounds.
- **D-06:** True autosave per cell — every tap immediately writes to IndexedDB.
- **D-07:** No save UI at all — no "Speichern" button, no inline "saved" indicator.
- **D-08:** D-07 resolves tension in ROADMAP.md — "Abschließen" is the only explicit action; everything before it is automatic.
- **D-09:** "Abschließen" available only when every arrow cell is filled for every shooter, every passe, every configured round.
- **D-10:** Once "Abschließen" clicked, entries are permanently locked — no unlock/reopen path in v1.

### Claude's Discretion
- Exact visual/interaction design of the tap-button picker (grid layout, button sizing, color coding) — subject to Phase 1 D-11 constraint (opaque/high-contrast).
- Exact confirmation UX for "Abschließen" — a confirmation dialog is recommended, consistent with Phase 2's ConfirmDialog pattern, but exact wording/styling left to implementation.
- Data model shape for the scores table — must key by shooter + round + passe + arrow index, support autosave-per-cell efficiently, but exact column names/field layout left to research/planning.

### Deferred Ideas (OUT OF SCOPE)
- Configurable scoring scales per round (e.g., 1-5 for beginners) — decided against for v1, not deferred; revisit only if real need surfaces.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCORE-01 | Trainer can enter per-arrow scores (0-10, M) for each shooter per round/passe in a table showing line, name, class, per-arrow values, and sum | Tap-button picker design (D-01), score table structure with dropdown navigation (D-04/D-05), Dexie schema with scores table, reactive query pattern via liveQuery() + $derived. Component structure: RoundPasseSelector (nav), ScoreTable (rows + columns), ScorePicker (tap buttons). |
| SCORE-02 | "M" (miss) is automatically treated as zero in sum calculations | WA scoring convention (D-02), explicit handling in sum derivation: `value === 'M' ? 0 : parseInt(value)`. Unit test for scoreSum() function. |
| SCORE-03 | Score entries are saved as they're entered — no data loss if device/tab closes mid-entry | Autosave-per-cell via non-blocking db.scores.put() (D-06), liveQuery() re-fetches from IndexedDB on page reload. E2E test simulates offline mode and device close via Playwright. |
| SCORE-04 | Table is sortable by clicking column headers (line, name, class, sum) | Sort state in $state (local, ephemeral), column headers with onclick handlers toggle sort key, $derived re-sorts the shooter array. Test sort interaction per column with ties. |
| SCORE-05 | Trainer can interim-save progress at any point; entries remain editable until finalized | Autosave is transparent (D-06/D-07) — no explicit "save" action needed, all entries editable until D-10's finalization lock. |
| SCORE-06 | App detects when all configured rounds/passes are fully entered and offers distinct "Abschließen" (finalize) action, separate from "Speichern" (save) | Completion check via allScoresEntered() function (pure, testable), gated behind $derived boolean that enables [Abschließen] button only when true. "Speichern" does not exist in UI (D-07/D-08); all persistence is autosave. |
| SCORE-07 | Once finalized, score entries are locked and cannot be further edited | Finalization sets finalized: true on all scores via db.scores.bulkPut(). UI derives isFinalized from scores, disables all tap-button cells. E2E test verifies cells are untappable after finalization. |

---

*Phase: 3-Score Entry*
*Research completed: 2026-07-05*
