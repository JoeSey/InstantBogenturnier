# Architecture Research

**Domain:** Client-only, offline-first, single-device workflow PWA (archery training-tournament management)
**Researched:** 2026-07-03
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              VIEW LAYER (src/lib/views)                    │
│  Phase 1        Phase 2            Phase 3            Phase 4              │
│ ┌─────────┐  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐   │
│ │SetupView│  │RegistrationView│  │ScoreEntryView   │  │ ResultsView    │   │
│ │+Presets │  │ (AB/AB-CD calc)│  │(round/passe sel,│  │(class group,   │   │
│ │picker   │  │                │  │ sortable table, │  │ ranked, resp.) │   │
│ └────┬────┘  └───────┬────────┘  │ save/complete)  │  └───────┬────────┘   │
│      │               │           └────────┬────────┘          │            │
├──────┴───────────────┴────────────────────┴──────────────────┴────────────┤
│                    App.svelte  (reads tournamentMeta.status,               │
│                     mounts the current phase's View — no router)           │
├─────────────────────────────────────────────────────────────────────────────┤
│                   PRESENTATIONAL COMPONENTS (src/lib/components)            │
│   SortableTable · ClassBadge · PresetPicker · ThemeToggle  (no DB access)   │
├─────────────────────────────────────────────────────────────────────────────┤
│                     DOMAIN LOGIC (src/lib/logic) — pure TS, no DB/Svelte    │
│   ranking.ts (1224 tie ranking) · mode.ts (AB/AB-CD) · completion.ts        │
│   className.ts (suggested names) · waPresets.ts (WA round/passe catalog)   │
├─────────────────────────────────────────────────────────────────────────────┤
│               PERSISTENCE LAYER (src/lib/db) — Dexie repositories          │
│  repository.presets · repository.tournament · repository.shooters ·        │
│  repository.scores            +          live.svelte.ts (liveQuery bridge) │
├─────────────────────────────────────────────────────────────────────────────┤
│                       IndexedDB (via Dexie) — SINGLE source of truth        │
│   presets │ classes │ shooters │ scores │ tournamentMeta (singleton row)    │
└───────────────────────────────────────────────────────────────────────────┘
                                    ▲
                         Service Worker (vite-plugin-pwa)
                    precaches app shell/assets for offline load
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `App.svelte` | Reads persisted `tournamentMeta.status` and renders the matching phase view; no other logic | Top-level component, one `{#if}`/`{:else if}` chain, no router library needed |
| Views (`SetupView`, `RegistrationView`, `ScoreEntryView`, `ResultsView`) | Own the live queries for their phase, hold ephemeral UI-only state (sort column, selected round/passe dropdowns), call repository functions on user actions, pass data down to presentational components | Svelte 5 components using runes (`$state`, `$derived`, `$effect`) |
| Presentational components (`SortableTable`, `PresetPicker`, `ClassBadge`, `ThemeToggle`) | Render props, emit events; never import `db` directly | Reusable across views (e.g. `SortableTable` used in both score entry and results) |
| Domain logic (`logic/*.ts`) | Pure functions: tie-aware ranking, AB/AB-CD mode detection, completion detection, class-name suggestion, WA round/passe preset catalog | Plain TypeScript modules, unit-testable without Svelte or Dexie in scope |
| Persistence layer (`db/repository.*.ts`) | The *only* code that calls `db.table.*`; encapsulates schema knowledge, upserts, transactions | Thin wrapper functions per table, e.g. `addShooter()`, `saveScores()`, `loadPreset()` |
| `db/live.svelte.ts` | Bridges Dexie's built-in `liveQuery` (Observable) into a Svelte 5 `$state`-backed reactive value | ~15-line `$effect`-based subscribe/unsubscribe helper — no extra dependency |
| Dexie/IndexedDB | Single source of truth for both the in-progress "live tournament" and the persisted presets | One Dexie database, multiple tables with different lifecycles (see Data Flow) |
| Service Worker (vite-plugin-pwa) | Precaches the app shell so the PWA loads and runs with zero network at the range | `generateSW` strategy is sufficient here (no custom runtime fetch logic needed) |

## Recommended Project Structure

```
src/
├── main.ts                       # Vite entry: mounts App.svelte, registers SW, requests persistent storage
├── App.svelte                    # Reads tournamentMeta.status, renders current phase view (no router)
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Dexie subclass, db.version(1).stores({...}), typed table interfaces
│   │   ├── repository.presets.ts       # save/load/list/delete presets (cap enforcement at 4-8)
│   │   ├── repository.tournament.ts    # classes CRUD, lineCount, roundsConfig, status transitions
│   │   ├── repository.shooters.ts      # shooter CRUD, line assignment
│   │   ├── repository.scores.ts        # pre-create empty rows, bulkPut on "Speichern"
│   │   └── live.svelte.ts        # liveQuery → $state adapter used inside view components
│   ├── logic/                    # pure, framework-agnostic — unit-testable in isolation
│   │   ├── ranking.ts            # group by class, sum, sort desc, standard competition ("1224") ranks
│   │   ├── mode.ts                # AB vs AB/CD detection from shooterCount vs lineCount
│   │   ├── completion.ts         # all expected score rows fully filled? → unlock "Abschließen"
│   │   ├── className.ts          # suggest e.g. "RCV-U14" from ageGroup/bowType/distance tuple
│   │   └── waPresets.ts          # static catalog of WA rounds/passes presets
│   ├── views/                    # one container per tournament phase
│   │   ├── SetupView.svelte
│   │   ├── RegistrationView.svelte
│   │   ├── ScoreEntryView.svelte
│   │   └── ResultsView.svelte
│   ├── components/                # presentational only, no db/ imports
│   │   ├── SortableTable.svelte
│   │   ├── ClassBadge.svelte
│   │   ├── PresetPicker.svelte
│   │   └── ThemeToggle.svelte
│   └── styles/                   # tailwind.config + glassmorphism utility classes
├── service-worker registration via vite-plugin-pwa (virtual:pwa-register)
└── app.css
```

### Structure Rationale

- **`db/`:** Every Dexie call lives behind repository functions. This is the single seam where a future storage-engine change (unlikely, but keeps the door open) or the eventual open-source club-config refactor (v2.5) would land, without touching views or logic.
- **`logic/`:** Kept dependency-free (no Svelte imports, no Dexie imports) so the trickiest rules — tie-aware ranking, AB/AB-CD detection, "is this tournament actually complete" — can be written and tested before any UI exists, and re-verified in isolation later.
- **`views/` vs `components/`:** A strict container/presentational split. Only views call `db/live.svelte.ts` or repository functions; only views hold ephemeral state (selected round/passe, active sort column). This keeps `SortableTable` genuinely reusable (score-entry table and results table are the same component with different column defs) and prevents "hidden" Dexie calls buried in deep component trees.
- **No router / no SvelteKit:** Stack is plain Vite + Svelte (not SvelteKit), and the app has no need for URL-addressable pages on a single device. Phase navigation is driven by a persisted `tournamentMeta.status` field instead of a router — this also means an accidental tab reload at the range resumes exactly where the trainer left off, for free.

## Architectural Patterns

### Pattern 1: IndexedDB as single source of truth, Svelte runes as a reactive projection

**What:** Rather than maintaining a separate writable-store cache that is manually kept in sync with IndexedDB, use Dexie's built-in `liveQuery()` (part of Dexie core, not an extra package) wrapped in a small custom Svelte 5 adapter. Views subscribe directly to live queries; there is exactly one place data "lives."
**When to use:** Any read used in a view. At this project's scale (8-14 shooters, 2-5 classes) query cost is negligible, so there is no performance reason to introduce a manual cache layer.
**Trade-offs:** Slightly more boilerplate per view (a small `$effect` subscribe/unsubscribe) than a naive `onMount` fetch-once, but eliminates an entire class of "store drifted from DB" bugs common in hand-rolled offline-first store/DB sync code.

**Example:**
```ts
// lib/db/live.svelte.ts
import { liveQuery, type Subscription } from 'dexie';

export function liveState<T>(querier: () => Promise<T> | T, initial: T) {
  let value = $state(initial);
  $effect(() => {
    const sub: Subscription = liveQuery(querier).subscribe({
      next: (v) => (value = v),
      error: (e) => console.error(e),
    });
    return () => sub.unsubscribe();
  });
  return { get current() { return value; } };
}
```
```svelte
<!-- ScoreEntryView.svelte -->
<script lang="ts">
  import { liveState } from '$lib/db/live.svelte';
  import { db } from '$lib/db/schema';

  let round = $state(1);
  let passe = $state(1);

  const rows = liveState(
    () => db.scores.where('[shooterId+round+passe]').between([0, round, passe], [Infinity, round, passe]).toArray(),
    []
  );
</script>
```
(Note: `$effect` — and therefore `liveState`— must be called from within a component's script or another effect, not from a plain module scope.)

### Pattern 2: Two-tier persistence lifecycle — "live tournament" vs "saved presets"

**What:** All IndexedDB tables live in the same Dexie database, but fall into two lifecycle groups:
- **Ephemeral-but-durable:** `classes`, `shooters`, `scores`, `tournamentMeta` — persisted continuously so an accidental reload/crash never loses progress, but wiped entirely by an explicit "Start New Tournament" action.
- **Durable-and-persistent:** `presets` — survives every "new tournament" reset; only removed by explicit user deletion, capped at 4-8 entries.
Saving a preset is a **one-way copy** (snapshot) from the live tables into a new `presets` row. Loading a preset is a one-way copy in the other direction. There is no live link between a loaded preset and the tournament that follows — editing classes after loading a preset never mutates the preset itself.
**When to use:** Any "start from template, then diverge" workflow — this is the correct mental model for the "load preset → registration → live edits" flow described in the spec.
**Trade-offs:** Requires an explicit reset/copy step (a few extra lines in `repository.tournament.ts`) rather than a single shared object, but makes the mutation boundary unambiguous and prevents accidentally corrupting a saved preset while running a tournament.

### Pattern 3: Pure domain logic separated from both persistence and presentation

**What:** Tie-aware ranking, AB/AB-CD mode detection, and completion detection are implemented as plain functions taking arrays/values in and returning values out — no Dexie, no Svelte reactivity.
**When to use:** Any business rule where correctness matters more than reactivity plumbing (ranking is the single most failure-prone piece of this domain — see Pitfalls).
**Trade-offs:** None significant; this is nearly free to do correctly if it's the pattern from day one, and expensive to retrofit if ranking/mode logic starts out entangled inside a component's `<script>` block.

**Example:**
```ts
// lib/logic/ranking.ts
export type ArrowValue = number | 'M';
export const arrowScore = (a: ArrowValue) => (a === 'M' ? 0 : a);

export interface RankedShooter { shooterId: number; total: number; rank: number }

export function rankShooters(totals: { shooterId: number; total: number }[]): RankedShooter[] {
  const sorted = [...totals].sort((a, b) => b.total - a.total);
  const ranked: RankedShooter[] = [];
  let rank = 0;
  let seen = 0;
  let lastTotal: number | null = null;
  for (const s of sorted) {
    seen++;
    if (s.total !== lastTotal) rank = seen; // standard competition ("1224") ranking
    lastTotal = s.total;
    ranked.push({ ...s, rank });
  }
  return ranked;
}
```

## Data Flow

### Request Flow (score entry example)

```
Trainer edits arrow cell in ScoreEntryView
    ↓
local $state row buffer (uncommitted edits held in the view, not yet written)
    ↓ (click "Speichern")
repository.scores.saveMany(rows) → db.transaction('rw', scores, () => bulkPut(...))
    ↓
IndexedDB write commits
    ↓
Dexie liveQuery re-emits automatically → liveState's $effect updates → view re-renders
    ↓
logic/completion.ts re-evaluates over ALL round/passe rows → "Abschließen" button shown/hidden
```

### State Management

```
IndexedDB (Dexie tables)
    ↕ (repository.*.ts — the only code with schema knowledge)
liveQuery (Observable, Dexie core)
    ↕ (live.svelte.ts adapter)
$state inside a View component
    ↓ ($derived)
logic/*.ts pure transforms (ranking, mode, completion)
    ↓ (props)
Presentational components (SortableTable, ClassBadge, ...)
```

There is no separate global store layer duplicating IndexedDB's contents — the database *is* the app state. Ephemeral UI-only concerns (which round/passe dropdown is selected, which column is currently sorted, viewport breakpoint) live in local `$state` inside the relevant view and are never persisted.

### Key Data Flows

1. **Preset → live tournament:** `repository.presets.load(id)` reads one `presets` row, then writes its `classes`/`lineCount`/`roundsConfig` into the live `classes` table and `tournamentMeta`, setting `status = 'setup'`. One-way copy, no ongoing link.
2. **Registration → scoring transition:** On leaving Phase 2, `repository.scores` bulk-inserts one empty row per `(shooter × round × passe)` combination derived from `roundsConfig`. This fixes "expected total row count" once, which `completion.ts` compares against "rows with a fully populated arrows array" to decide when to reveal "Abschließen."
3. **Live tournament → results:** `ResultsView` live-queries all `scores` joined (in-memory, trivial at this scale) with `shooters` and `classes`, groups by `classId`, sums each shooter's rows via `arrowScore()`, and calls `rankShooters()` — ranking is **always computed at read time**, never persisted, since it depends on the full current dataset.
4. **Live tournament → new preset:** `repository.presets.save(name)` reads current `classes`/`lineCount`/`roundsConfig` and inserts a new `presets` row; UI enforces the 4-8 cap (block or prompt to overwrite oldest) before insert.
5. **"Start New Tournament":** `repository.tournament.reset()` clears `classes`, `shooters`, `scores`, and resets `tournamentMeta` to `status = 'setup'`. `presets` is untouched.

## Scaling Considerations

There is no multi-user or network-load scaling story for this app (single device, single judge, 8-14 shooters, 2-5 classes per the confirmed usage pattern). The relevant "scale" axis is dataset size per tournament and IndexedDB durability over time between the club's infrequent tournaments, not concurrent users.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Confirmed scale (8-14 shooters, 2-5 classes, 1-2 rounds) | Everything above (in-memory joins, liveQuery, no pagination) is comfortably sufficient; no optimization needed |
| Larger informal tournament (e.g. 50-100 shooters) | Still fine unmodified — IndexedDB and Dexie's compound indexes handle this trivially; in-memory grouping/sorting of a few hundred rows is sub-millisecond |
| Hypothetical "official tournament" scale (500+ shooters, if scope ever expands) | Would be the point to revisit: add pagination/virtualized table rendering for `SortableTable`, and reconsider whether ranking needs to run in a Web Worker to avoid blocking the main thread during entry |

### Scaling Priorities

1. **Not a bottleneck at target scale:** query/render performance. Do not add virtualization, workers, or manual caching pre-emptively — it adds complexity this project doesn't need and slightly obscures the "DB is the single source of truth" model that keeps the app easy to reason about.
2. **Real risk instead is storage durability, not throughput:** the club runs this only once a year, so IndexedDB data (specifically the `presets` table) must survive long idle periods without being evicted. Mitigate by calling `navigator.storage.persist()` on first load (Storage Manager API) to request persistent (non-evictable) storage, and treat this as part of the PWA setup, not an afterthought.

## Anti-Patterns

### Anti-Pattern 1: Parallel writable-store cache manually synced with Dexie

**What people do:** Create a Svelte `writable([])` for e.g. shooters, fetch once in `onMount`, and manually call `.set()`/`.update()` after every Dexie write to "keep it in sync."
**Why it's wrong:** Every new write path is another place that can forget to update the store, silently producing a UI that's stale relative to IndexedDB — exactly the "two sources of truth" bug class offline-first apps are most prone to.
**Instead:** Use Dexie's built-in `liveQuery()` (Pattern 1 above) so the "store" updates itself automatically whenever the underlying table changes, from any code path.

### Anti-Pattern 2: Persisting computed rank (or other read-time-only derived values)

**What people do:** Store a `rank` field on each shooter/score row and update it whenever a score changes.
**Why it's wrong:** Rank is a function of the *entire current dataset* for a class, not of a single row — persisting it creates a second source of truth for a value that must be recomputed the instant any sibling row changes, and is trivial to recompute anyway.
**Instead:** Only persist the raw inputs (`arrows`, `sum` per row is fine to store since it's derivable from that row alone). Compute rank live in `logic/ranking.ts` at render time in `ResultsView`.

### Anti-Pattern 3: Reaching for a router / SvelteKit for phase navigation

**What people do:** Default to file-based routing (SvelteKit) or a client router library to move between "pages" even when the app has no URL-addressable content and runs on one device.
**Why it's wrong:** Adds routing/hydration complexity and a second navigation-state mechanism (URL) that has to be kept in sync with the "is the tournament in setup/registration/scoring/results phase" state that must be persisted in IndexedDB anyway for offline-reload resilience.
**Instead:** Persist `tournamentMeta.status` and let `App.svelte` switch views based on that single field — this doubles as both navigation state and "resume after reload" state.

### Anti-Pattern 4: Mixing localStorage/sessionStorage in alongside IndexedDB

**What people do:** Stash "just one small setting" (theme choice, last-used preset id) in `localStorage` because it's quick, while the rest of the data lives in Dexie/IndexedDB.
**Why it's wrong:** Splits persistence across two storage mechanisms with different eviction/quota/offline behavior, doubling the surface area for "why did this get wiped/not sync" bugs, for no real benefit at this data size.
**Instead:** Keep everything — including small settings like theme preference — in the same Dexie database (e.g. a `settings` table or a field on `tournamentMeta`), so there is exactly one persistence story to reason about and test offline.

## Integration Points

### External Services

None. This is explicitly a client-only, no-backend, no-hosted-DB application per the project constraints — there is no network integration to design for in v1.

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Service Worker (Workbox, via `vite-plugin-pwa`) | `generateSW` strategy: precache the built app shell/assets; no custom runtime-caching logic needed since there are no network requests to intercept at runtime | Use `registerType: 'autoUpdate'` so the trainer gets the latest build automatically whenever online (typically at home before heading to the range), without needing an in-app "update available" prompt for a single-user tool |
| Storage Manager API (`navigator.storage.persist()`) | Call once on app start (in `main.ts`) to request persistent (non-evictable) storage | Not a "service" in the network sense, but a browser API integration critical to this domain: the club uses the app only once a year, so origin storage must not be silently evicted between uses |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Views ↔ `db/repository.*.ts` | Direct function calls (async) | Views never import `schema.ts`/`db` directly — only through repository functions, keeping schema knowledge in one place |
| Views ↔ `db/live.svelte.ts` | `liveState()` returns a reactive `{ current }` object consumed via `$derived`/template bindings | Must be invoked from component script scope (uses `$effect` internally) |
| Views ↔ `logic/*.ts` | Direct function calls on plain data (arrays/objects), no side effects | Pure — safe to unit test without mocking Dexie or Svelte |
| Views ↔ presentational `components/*` | Props down, callback/event props up | Components never import `db/*`; e.g. `SortableTable` receives `rows`, `columns`, and an `onSort` callback |
| `presets` table ↔ live tables (`classes`, `shooters`, `scores`, `tournamentMeta`) | One-way copy functions in `repository.tournament.ts` (`loadPreset`, `saveAsPreset`, `reset`) | No live/foreign-key relationship between a preset and the tournament it seeded — see Pattern 2 |

## Sources

- [Dexie.js official docs — liveQuery()](https://dexie.org) — HIGH confidence, verified via Context7 (`/dexie/dexie.js`)
- [Svelte 5 documentation — runes, `.svelte.js`/`.svelte.ts` files, shared state patterns](https://svelte.dev/docs) — HIGH confidence, verified via Context7 (`/sveltejs/svelte`, svelte@5.37.0)
- [Dexie.js schema versioning guidance](https://dexie.org/docs/Tutorial/Understanding-the-basics) — MEDIUM-HIGH confidence, WebSearch cross-referenced with official Dexie docs
- [Standard competition ("1224") ranking algorithm](https://programming.guide/generating-competition-rankings.html) — HIGH confidence, well-established, matches the tie behavior described in the project spec exactly
- [Vite Plugin PWA — generateSW vs injectManifest strategies](https://vite-pwa-org.netlify.app/guide/development) — MEDIUM confidence, WebSearch-sourced official plugin docs; no custom runtime caching is needed for this project so `generateSW` is the appropriate (simpler) choice
- Storage Manager API (`navigator.storage.persist()`) — HIGH confidence, standard web platform API (MDN), well-established for offline-first PWA durability

---
*Architecture research for: client-only offline-first tournament management PWA*
*Researched: 2026-07-03*
