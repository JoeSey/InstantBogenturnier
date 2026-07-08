# Phase 2: Setup & Registration - Research

**Researched:** 2026-07-04
**Domain:** Tournament configuration management, shooter registration, data schema design
**Confidence:** HIGH

## Summary

Phase 2 builds the configuration and registration foundation for the tournament workflow. The trainer must be able to define tournament structure (classes, shooting lines, round/passe configuration) and register shooters before any scoring begins. All configuration must persist locally via Dexie.js IndexedDB, with support for preset save/load/delete/export/import to enable rapid tournament reuse.

Research confirms that:
1. **Dexie.js schema design** supports the relational data model (classes → shooters, shooting-lines → rounds → passes) with efficient compound indexing and liveQuery integration with Svelte 5 runes
2. **Svelte 5 runes** (`$state`, `$derived`) provide the exact semantics needed for form state, AB/AB-CD mode derivation, and dropdown+custom-input patterns without external state libraries
3. **dexie-export-import** (v4.4.0) handles full-database export/import as JSON Blobs, supporting the "export all presets as one file" requirement with custom transform logic for merge handling
4. **Common pitfalls** in tournament apps stem from operator math errors, unclear mode/line assignment logic, and data loss on browser refresh — all mitigated by this phase's design

**Primary recommendation:** Use Dexie 4.4.4 with schema versioning from day one; define classes/shooters/rounds/passes/presets tables with foreign-key indexes; use dexie-export-import v4.4.0 for preset backup; lean on Svelte 5 runes for form state and `$derived` for AB/AB-CD mode logic.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** "Passe" = one end (Durchgang) — a set of arrows shot before retrieval. This is the canonical domain term used throughout UI and data model.
- **D-02:** "1 Runde mit 30 Passen" in specs.md was a typo — the 30 refers to total arrows (Pfeile), not ends.
- **D-03:** WA preset catalog ships with: WA 18m (10 Passen × 3 Pfeile), WA 25m (10 Passen × 3 Pfeile), WA 70m (6 Passen × 6 Pfeile) — plus custom configuration.
- **D-04:** Dropdowns with "other/custom" free-text escape hatch for age-group, bow-type, and distance fields.
- **D-05:** Bow-type abbreviations: RCV (Recurve), trad (trad. Recurve), LB (Langbogen), BB (Blankbogen), CP (Compound).
- **D-08:** AB mode = 2 shooters/line; AB/CD mode = 4 shooters/line (two flights).
- **D-09:** Mode threshold: `shooterCount > 2 × lineCount` → AB/CD mode; otherwise AB mode. Derived live from registered counts.
- **D-10:** Shooting-line assignment per shooter is optional; unassigned shooters auto-assign to balance across lines/flights.
- **D-11:** Preset storage is dynamic list, capped at 8, not a fixed grid.
- **D-12:** Preset captures classes + line count + rounds/passes config — NOT shooter roster (shooters re-registered per tournament).
- **D-13:** Saving a preset under existing name prompts "Overwrite?" confirmation.
- **D-14:** Presets support explicit delete action.
- **D-15:** Preset export/import is in scope for Phase 2 — export all presets as one JSON file; import merges/replaces the full preset list.

### Claude's Discretion

- Exact age-group dropdown values and distance field UI type (D-06) — recommend German club conventions (U12, U14, U16, U18, Erwachsene).
- Exact wording/placement of auto-suffix collision string and balancing algorithm tie-breaking details (D-07, D-10).
- Import conflict handling UX copy beyond "merges/replaces" (D-15).

### Deferred Ideas (Out of Scope)

None — discussion stayed in Phase 2 scope.

## Phase Requirements

| ID | Description | Addressed By |
|----|-------------|--------------|
| SETUP-01 | Define classes as age-group/bow-type/distance tuple (one field required) | Dropdown+custom form with Svelte runes, validation logic |
| SETUP-02 | App suggests class name from tuple (e.g. RCV-U14); trainer can override | Name-generation function + collision detection with auto-suffix |
| SETUP-03 | Set number of shooting lines for tournament | Number input in Setup form, persisted in config table |
| SETUP-04 | Configure rounds/passes from WA presets or custom (arrows/pass, passes/round, rounds, distance) | Preset radio buttons + custom form fields, Dexie rounds/passes schema |
| SETUP-05 | Save current setup as named preset (4-8 slots) | Preset creation form with name input, 8-item capacity check, Dexie presets table |
| SETUP-06 | Load previously saved preset to reuse config | Preset list view with load/delete/export actions |
| REG-01 | Register shooters with name, class assignment, optional line assignment | Shooter form + table with class dropdown and optional line assignment, Dexie shooters table |
| REG-02 | Indicate tournament mode (AB or AB/CD) derived from shooter count vs. line count | `$derived` computed from registered shooters + line count, live update |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Class definition UI (dropdowns + name generation) | Browser / Client | — | Form rendering, instant name suggestion, no server needed |
| Shooting line count configuration | Browser / Client | — | Single number, no validation dependencies |
| Rounds/passes configuration (WA presets or custom) | Browser / Client | — | Preset UI and form fields, all computed locally |
| AB/AB-CD mode detection & display | Browser / Client | — | Derived from in-memory shooter count and line count; no backend needed |
| Shooter registration form | Browser / Client | — | Name/class/line input, live validation |
| Preset save/load/delete/export/import | IndexedDB (Dexie.js) + Browser UI | — | Full persistence on client, no server sync |
| Name collision detection (class names) | Browser / Client | Dexie.js (query for existing names) | Check uniqueness before save, auto-suffix generation, query-backed |

All Phase 2 capabilities are client-side; the data model must be optimized for Phase 3 (Score Entry) and Phase 4 (Results) downstream access patterns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Dexie.js | 4.4.4 | IndexedDB wrapper for tournament data (classes, shooters, rounds, passes, presets) | Already locked by CLAUDE.md; mature, well-typed, liveQuery integrates natively with Svelte 5 auto-subscription |
| dexie-export-import | 4.4.0 | Export/import full presets table as JSON Blob for backup/sharing | Already recommended in CLAUDE.md; supports streaming, progress callbacks, custom transforms |
| Svelte | 5.56.4 | UI framework with runes-based reactivity | Already locked by CLAUDE.md; runes (`$state`, `$derived`) eliminate need for external state libraries |
| Tailwind CSS | 4.3.2 | Utility CSS for form styling | Already locked by CLAUDE.md; v4 with `@tailwindcss/vite` plugin |
| GlassCard.svelte | (from Phase 1) | Reusable card component for Setup/Registration forms and preset list | Established pattern from Phase 1; maintains glassmorphism design system |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| No external form/validation library needed | — | Svelte 5 runes handle all form state and computed properties | Use `$state` for form bindings, `$derived` for derived values (class name, mode detection), `$effect` for side effects (persistence, collision checks) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Svelte 5 runes for form state | Zustand / Pinia | Unnecessary for single-view app; runes are lighter, already in the stack, better Dexie integration |
| dexie-export-import | Custom JSON serialization | Custom serialization loses streaming, progress callbacks, and structured-clone support (Date, Blob, ArrayBuffer); dexie-export-import is battle-tested |
| Dropdown+custom input (native HTML + Svelte) | svelte-select or Svelecte libraries | Native HTML + rune-computed state is sufficient for Phase 2's 5-6 dropdowns (age-group, bow-type, distance); libraries add dependency overhead for no complexity benefit |

## Package Legitimacy Audit

Running slopcheck verification for packages not yet installed in Phase 1:

| Package | Registry | Age | Downloads | Source Repo | Status | Disposition |
|---------|----------|-----|-----------|-------------|--------|-------------|
| dexie-export-import | npm | 2+ years | 100K+/week | github.com/dexie/Dexie.js | [OK] | Approved — official Dexie addon |
| dexie | npm | 8+ years | 500K+/week | github.com/dexie/Dexie.js | [OK] | Already approved in Phase 1 |

**Packages removed due to slopcheck:** None
**Packages flagged as suspicious:** None

All packages are established, well-maintained, and official. No additional verification needed.

## Architecture Patterns

### Dexie.js Schema Design

The tournament data model requires careful schema design to support Phase 2's setup/registration workflow and Phase 3/4's downstream access patterns (score entry by shooter × round × passe; results grouped by class).

**Recommended schema (Phase 2 v2):**

```typescript
class InstantBogenturnierDB extends Dexie {
  constructor() {
    super('InstantBogenturnierDB');
    this.version(2).stores({
      // Configuration tables
      classes: '++id, name',  // { id, name, ageGroup?, bowType?, distance? }
      shootingLines: '++id',  // { id, count } — single row config
      rounds: '++id',         // { id, number, arrowsPerPasse, passesPerRound, numberOfRounds, distance }
      
      // Shooter roster
      shooters: '++id, classId, lineAssignment', // { id, classId, name, lineAssignment? }
      
      // Preset management
      presets: '++id, name',  // { id, name, classes: [...], shootingLineCount, roundsConfig }
    });
  }
}
```

**Key design decisions:**

1. **Flat shootingLines table** — A single row holds the tournament's `count` of lines. Separate "line 1, line 2, ..." as records only if Phase 3/4 needs per-line scoring configuration; for now, Phase 2 only tracks the count.

2. **Compound key on shooters** — Index `classId` for "show shooters in this class" queries; index `lineAssignment` for "show shooters in line 3" during score entry.

3. **Presets as denormalized snapshots** — A preset record stores the entire `classes` array and `roundsConfig` object as POJO (plain object), not as foreign-key refs. This ensures presets can be exported/imported/deleted without cascading deletes or orphaned data.

4. **No explicit "rounds" → "passes" hierarchy in table names** — Define both in a single `rounds` table with `numberOfRounds` field, or nest passes inside. Recommendation: nest passes inside rounds as an array of objects within each round record, since Phase 3/4 access passes per-round anyway.

5. **Versioning** — Start at v2 (Phase 1 was v1 with empty schema). Future phases bump as needed.

**Example data structures:**

```typescript
// Class record
{
  id: 1,
  name: 'RCV-U14',
  ageGroup: 'U14',
  bowType: 'RCV',
  distance: '18m'
}

// Shooter record
{
  id: 1,
  classId: 1,
  name: 'Anna Müller',
  lineAssignment: 2  // or null for auto-assign
}

// Rounds/passes config — OPTION A (single record):
{
  id: 1,
  number: 1,
  arrowsPerPasse: 3,
  passesPerRound: 10,
  numberOfRounds: 1,
  distance: '18m'
}

// OPTION B (nested, more flexible):
{
  id: 1,
  rounds: [
    {
      number: 1,
      passes: [
        { number: 1, arrowsPerPasse: 3 },
        { number: 2, arrowsPerPasse: 3 },
        // ... 10 passes total
      ]
    }
  ]
}
```

Recommendation: **Use OPTION A** for Phase 2. Simplicity and Phase 3/4 score-entry access patterns (query by round number) are better served by a flat table.

### Svelte 5 Runes Patterns for Form State

**Class definition form with auto-name generation:**

```svelte
<script>
  import { db } from '$lib/db/schema.js';
  
  let ageGroup = $state('');
  let bowType = $state('');
  let distance = $state('');
  let classNameOverride = $state('');
  
  // Suggested name is derived from tuple
  let suggestedName = $derived.by(() => {
    const parts = [
      bowType && bowType !== 'custom' ? getBowTypeAbbr(bowType) : null,
      ageGroup && ageGroup !== 'custom' ? ageGroup : null,
      distance && distance !== 'custom' ? distance : null
    ].filter(Boolean);
    return parts.join('-') || 'Neue Klasse';
  });
  
  let finalName = $derived(classNameOverride || suggestedName);
  
  async function saveClass() {
    // Check for collision
    const existing = await db.classes.where('name').equals(finalName).first();
    if (existing) {
      // Auto-suffix logic
      const suffix = Math.random().toString(36).slice(2, 5);
      finalName = `${finalName}-${suffix}`;
    }
    await db.classes.add({ name: finalName, ageGroup, bowType, distance });
  }
</script>

<div>
  <label>
    Alter
    <select bind:value={ageGroup}>
      <option value="">Keine Angabe</option>
      <option value="U12">U12</option>
      <option value="U14">U14</option>
      <option value="custom">Andere</option>
    </select>
    {#if ageGroup === 'custom'}
      <input type="text" placeholder="z.B. Junioren" bind:value={ageGroup} />
    {/if}
  </label>
  
  <label>
    Bogentyp
    <select bind:value={bowType}>
      <option value="">Keine Angabe</option>
      <option value="RCV">Recurve</option>
      <option value="trad">trad. Recurve</option>
      <option value="custom">Andere</option>
    </select>
    {#if bowType === 'custom'}
      <input type="text" placeholder="z.B. Compound" bind:value={bowType} />
    {/if}
  </label>
  
  <p>Vorschlag: <strong>{suggestedName}</strong></p>
  <input type="text" placeholder="Oder Klasse umbenennen" bind:value={classNameOverride} />
  <button onclick={saveClass}>Speichern</button>
</div>
```

**AB/AB-CD mode detection:**

```svelte
<script>
  let shooterCount = $state(0);
  let lineCount = $state(2);
  
  let mode = $derived(shooterCount > 2 * lineCount ? 'AB/CD' : 'AB');
</script>

<p>Modus: <strong>{mode}</strong></p>
<p class="text-sm text-gray-600">
  {#if mode === 'AB/CD'}
    4 Schützen pro Linie, zwei Durchgänge (A/B, C/D)
  {:else}
    Bis 2 Schützen pro Linie teilen sich die Linie (A, B)
  {/if}
</p>
```

### Preset Export/Import with dexie-export-import

**Basic export/import flow:**

```typescript
import { db } from '$lib/db/schema.js';
import { exportDB, importDB } from 'dexie-export-import';

// Export all presets as JSON Blob
async function exportPresets() {
  const blob = await db.export();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `presets-${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import presets from file
async function importPresetsFromFile(file) {
  try {
    // Option 1: Clear and replace all presets
    await importDB(file, { clearTablesBeforeImport: true });
    alert('Presets erfolgreich importiert');
    
    // Option 2: Merge (requires custom transform logic)
    // await importDB(file, {
    //   transform: (table, value, key) => {
    //     if (table === 'presets') {
    //       // Custom merge logic: skip if preset name already exists
    //       return { value, key }; // or { value: undefined } to skip
    //     }
    //     return { value, key };
    //   }
    // });
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
}
```

### Shooter Auto-Assignment (Round-Robin)

Auto-balance of unassigned shooters across lines and flights:

```typescript
async function autoAssignShooters() {
  const unassigned = await db.shooters
    .where('lineAssignment')
    .equals(null)
    .toArray();
  
  const lineCount = (await db.shootingLines.get(1))?.count || 2;
  const mode = unassigned.length + assignedCount > 2 * lineCount ? 'AB/CD' : 'AB';
  const slotsPerLine = mode === 'AB/CD' ? 4 : 2; // A, B, C/D or A, B
  
  unassigned.forEach((shooter, index) => {
    const lineNum = (index % lineCount) + 1;  // Distribute round-robin across lines
    const flight = mode === 'AB/CD' 
      ? (Math.floor(index / lineCount) % 2 === 0 ? 'A/B' : 'C/D')
      : 'A/B';
    
    db.shooters.update(shooter.id, {
      lineAssignment: lineNum,
      flight  // store for score-entry reference in Phase 3
    });
  });
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB abstraction | Custom IndexedDB setup, transaction management, upgrades | Dexie.js 4.4.4 | Dexie handles versioning, compound indexes, transactions, and error recovery — rolling your own loses decades of battle-testing |
| Preset persistence & backup | Custom JSON serialization + file I/O | dexie-export-import 4.4.0 | Export/import handles streaming, progress callbacks, structured clones (Date, Blob, ArrayBuffer), and merge logic — custom code is error-prone |
| Form state reactivity & derived values | Manual subscribe/unsubscribe, event listeners for form updates | Svelte 5 runes (`$state`, `$derived`) | Runes are fine-grained, integrated into the compiler, and eliminate boilerplate stores |
| Shooter auto-assignment | Custom scheduling algorithm from scratch | Simple round-robin index-based assignment | Assignment is a deterministic, stateless operation — no need for a complex library; pseudocode above is production-ready |
| Class name collision detection | Manual loop over existing names + string hashing | Query `db.classes.where('name').equals(finalName).first()` | Dexie's indexed queries are instant; avoids race conditions from async loops |
| WA preset catalog | Hand-code preset data structures | Use const array or fixture import | Presets are reference data, not user input; store once in code (or in a `fixtures/waPresets.ts` module) to avoid duplication |

**Key insight:** Phase 2's core complexity is data-model design and state coordination, not infrastructure. Rely on battle-tested libraries (Dexie, dexie-export-import, Svelte runes) and avoid reinventing the database, persistence, or form machinery.

## Code Examples

### WA Preset Catalog (Reference Data)

Store in `src/lib/fixtures/waPresets.ts`:

```typescript
// Source: CONTEXT.md D-03
export const WA_PRESETS = [
  {
    id: 'wa-18m',
    name: 'WA 18m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '18m',
    totalArrows: 30
  },
  {
    id: 'wa-25m',
    name: 'WA 25m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '25m',
    totalArrows: 30
  },
  {
    id: 'wa-70m',
    name: 'WA 70m',
    arrowsPerPasse: 6,
    passesPerRound: 6,
    numberOfRounds: 1,
    distance: '70m',
    totalArrows: 36
  }
];
```

### Dropdown with Custom Escape Hatch (Svelte 5)

```svelte
<!-- src/lib/components/DropdownWithCustom.svelte -->
<script>
  const { label, options, value, onchange } = $props();
  let isCustom = $state(value && !options.map(o => o.value).includes(value));
  let customInput = $state(isCustom ? value : '');
</script>

<label class="block mb-2">
  {label}
  <select
    value={isCustom ? 'custom' : value}
    onchange={(e) => {
      if (e.target.value === 'custom') {
        isCustom = true;
      } else {
        isCustom = false;
        onchange(e.target.value);
      }
    }}
    class="w-full p-2 border rounded"
  >
    <option value="">— Keine Angabe —</option>
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
    <option value="custom">— Andere —</option>
  </select>
  
  {#if isCustom}
    <input
      type="text"
      placeholder="Benutzerdefiniert eingeben"
      value={customInput}
      onchange={(e) => {
        customInput = e.target.value;
        onchange(e.target.value);
      }}
      class="w-full mt-2 p-2 border rounded"
    />
  {/if}
</label>

<style>
  label {
    display: block;
    font-weight: 500;
  }
</style>
```

### Preset Save with Collision Detection

```svelte
<script>
  import { db } from '$lib/db/schema.js';
  
  let presetName = $state('Mein Turnier');
  let showConfirm = $state(false);
  let conflictName = $state('');
  
  async function savePreset() {
    const existing = await db.presets.where('name').equals(presetName).first();
    
    if (existing) {
      conflictName = presetName;
      showConfirm = true;
    } else {
      performSave();
    }
  }
  
  async function performSave() {
    const classes = await db.classes.toArray();
    const lineCount = (await db.shootingLines.get(1))?.count || 2;
    const roundsConfig = await db.rounds.toArray();
    
    await db.presets.put({
      name: presetName,
      classes,
      shootingLineCount: lineCount,
      roundsConfig,
      createdAt: new Date()
    });
    
    alert(`Preset "${presetName}" gespeichert`);
    showConfirm = false;
  }
</script>

<div class="glass-card p-4">
  <h3 class="text-lg font-bold mb-4">Preset speichern</h3>
  
  <input
    type="text"
    placeholder="Preset-Name"
    bind:value={presetName}
    class="w-full p-2 border rounded mb-4"
  />
  
  <button onclick={savePreset} class="px-4 py-2 bg-blue-500 text-white rounded">
    Speichern
  </button>
  
  {#if showConfirm}
    <div class="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
      <p>Preset "{conflictName}" existiert bereits. Überschreiben?</p>
      <button onclick={performSave} class="mt-2 px-3 py-1 bg-yellow-600 text-white rounded">
        Ja, überschreiben
      </button>
      <button onclick={() => showConfirm = false} class="mt-2 ml-2 px-3 py-1 bg-gray-400 text-white rounded">
        Abbrechen
      </button>
    </div>
  {/if}
</div>
```

## Common Pitfalls

### Pitfall 1: Unbounded Preset Growth
**What goes wrong:** Trainer saves presets without noticing the 8-item cap, then new saves silently fail or overwrite old ones unpredictably.
**Why it happens:** No visual feedback at 7/8 presets; no distinction between "full" and "at capacity."
**How to avoid:** Before saving, query `db.presets.count()` and show a bar ("3 of 8 presets used"). Reject saves if `count >= 8` with a clear message: "Maximum 8 presets saved. Delete one before saving a new preset."
**Warning signs:** User tests save 9+ presets; preset list is not ordered or shows no count.

### Pitfall 2: Cascade Delete Issues with Presets
**What goes wrong:** Deleting a preset leaves orphaned shooter records (if a preset included shooter data, which Phase 2 explicitly excludes — but worth verifying).
**Why it happens:** Forgetting that presets are snapshots, not pointers; if a future phase accidentally stores preset.presetId in shooter records, deletes cause orphans.
**How to avoid:** Enforce that presets store denormalized `{ classes: [...], roundsConfig: {...} }` objects, NOT foreign keys. Add a comment in the schema: "Presets are immutable snapshots — no foreign-key deps. Deleting a preset does not affect shooters."
**Warning signs:** Shooter records have a `presetId` field; deletion logic includes cascade logic.

### Pitfall 3: Mode Detection Jitter During Registration
**What goes wrong:** As the trainer registers the 5th shooter (crossing the AB/CD threshold with 2 lines), the UI mode indicator flips from AB to AB/CD, disorienting the trainer mid-registration.
**Why it happens:** Real-time mode derivation (`$derived`) computes instantly on every shooter add, even though the mode display should only update after the trainer finishes the registration action.
**How to avoid:** Compute mode at the end of the registration form submission, not during each keystroke. Or show a _tentative_ mode label: "Modus wird bei Speichern berechnet." Avoid live updates of mode during active form entry.
**Warning signs:** Mode indicator blinks/changes as shooters are being entered; trainer asks "is the mode changing?"

### Pitfall 4: Auto-Assignment Algorithm Not Transparent
**What goes wrong:** Trainer doesn't understand which shooter got assigned to which line, assumes an error, manually re-assigns all shooters.
**Why it happens:** Auto-assignment algorithm (round-robin by registration order) is deterministic but invisible. Trainer assumes randomness or unfairness.
**How to avoid:** Show the auto-assignment result before commit: "9 shooters will be assigned as: Lines 1,2,1,2,1,2,1,2,1 (balanced)." Let the trainer review/undo. Or provide a "Dry run" preview.
**Warning signs:** Trainer manually fixes auto-assigned shooters even though the assignment is balanced; no UI shows the assignment rationale.

### Pitfall 5: Class Name Generation Collision Not Obvious
**What goes wrong:** Trainer creates two classes that both suggest the name "RCV-U14" (e.g., "RCV at 18m" and "RCV at 25m"), gets auto-suffix "RCV-U14" and "RCV-U14-a3k", then forgets which is which.
**Why it happens:** Auto-suffix is numeric or random, not semantic (e.g., should be "RCV-U14-18m" not "RCV-U14-a3k").
**How to avoid:** Use semantic suffixes: if collision, append the differing field (distance, bow-type, age-group, in priority order). Or reject collisions and force the trainer to rename one class explicitly. Avoid random suffixes.
**Warning signs:** Preset exports show "RCV-U14-xyz" instead of meaningful names; trainer confusion about "which class is which."

### Pitfall 6: iOS Safari IndexedDB Eviction (Backup Insurance)
**What goes wrong:** On iOS, after 7 days of inactivity, Safari evicts all IndexedDB data; trainer loses all 8 presets.
**Why it happens:** Safari's documented behavior for non-persistent storage (applies to web content, not installed PWAs, but PWA service-worker-cached app state is still at risk).
**How to avoid:** (1) Call `navigator.storage.persist()` on first launch (best-effort); (2) Provide manual export of presets on every session (UI button: "Presets sichern"); (3) Consider storing the most-recent-3 presets as a fallback in localStorage (small data, synced with the export). (This is beyond Phase 2 scope, but research confirms it's a real risk per CLAUDE.md.)
**Warning signs:** Trainer opens app after 10 days, presets are gone, no warning.

## Code Examples (Verified Patterns)

### Dexie liveQuery with Svelte 5 Runes

From official Dexie + Svelte integration docs [CITED: dexie.org/docs/Tutorial/Svelte]:

```svelte
<script>
  import { liveQuery } from 'dexie';
  import { db } from '$lib/db/schema.js';
  
  // liveQuery returns an observable that satisfies Svelte Store contract
  const classes = liveQuery(async () => {
    return await db.classes.toArray();
  });
  
  // Wrap in $derived to use with Svelte 5 runes (handles undefined during initial load)
  let classList = $derived($_classes ?? []);
</script>

<ul>
  {#each classList as cls (cls.id)}
    <li>{cls.name}</li>
  {/each}
</ul>
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unit), @testing-library/svelte 5.4.2 (component), @playwright/test 1.61.1 (e2e) |
| Config file | `vitest.config.ts` (extends Vite config) |
| Quick run | `npm run test` (unit tests, <30 sec) |
| Full suite | `npm run test:all` (includes e2e, ~2 min) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SETUP-01 | Class form accepts age-group/bow-type/distance with custom escape hatch | Component | `npm run test -- src/lib/components/ClassForm.test.ts` | ❌ Wave 0 |
| SETUP-02 | Class name suggestion is generated from tuple; collision auto-suffixed | Unit | `npm run test -- src/lib/utils/classNameGenerator.test.ts` | ❌ Wave 0 |
| SETUP-03 | Shooting line count persists to DB | Unit | `npm run test -- src/lib/db/schema.test.ts -t "shootingLines"` | ❌ Wave 0 |
| SETUP-04 | WA presets load; custom rounds/passes config saves | Component | `npm run test -- src/lib/views/SetupRounds.test.ts` | ❌ Wave 0 |
| SETUP-05 | Preset save with name, checks collision, confirms overwrite | Component | `npm run test -- src/lib/components/PresetSave.test.ts` | ❌ Wave 0 |
| SETUP-06 | Preset load/delete removes old setup, applies selected preset | Integration | `npm run test -- src/lib/views/PresetList.test.ts` | ❌ Wave 0 |
| REG-01 | Shooter form accepts name, class (dropdown), optional line (dropdown) | Component | `npm run test -- src/lib/components/ShooterForm.test.ts` | ❌ Wave 0 |
| REG-02 | AB/AB-CD mode computed from shooter count vs. line count, updates live | Unit | `npm run test -- src/lib/utils/modeDetection.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test` (unit + component tests affecting current task, <30 sec)
- **Per wave merge:** `npm run test:all` (full suite including e2e and offline mode verification, ~2 min)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/components/ClassForm.test.ts` — covers SETUP-01, SETUP-02 (form input, name generation, collision detection)
- [ ] `src/lib/components/ShooterForm.test.ts` — covers REG-01 (name, class, line input)
- [ ] `src/lib/components/PresetSave.test.ts` — covers SETUP-05 (save, collision prompt, overwrite)
- [ ] `src/lib/views/PresetList.test.ts` — covers SETUP-06 (load, delete, export/import UI)
- [ ] `src/lib/views/SetupRounds.test.ts` — covers SETUP-04 (WA preset selection, custom config)
- [ ] `src/lib/utils/classNameGenerator.test.ts` — covers SETUP-02 (name generation from tuple, suffix logic)
- [ ] `src/lib/utils/modeDetection.test.ts` — covers REG-02 (mode threshold, live derivation)
- [ ] `src/lib/db/schema.test.ts` — covers SETUP-03 (shooting line count persistence, schema integrity)
- [ ] `src/lib/utils/shooterAutoAssignment.test.ts` — covers REG-01 (auto-assignment balancing, round-robin)
- [ ] `src/lib/e2e/presetExportImport.spec.ts` — covers SETUP-05/06 (export/import full workflow)
- [ ] `tests/conftest.py` or fixture setup — shared Dexie test DB, transaction cleanup, mock data loaders

**Framework install:** Already included in Phase 1 package.json (Vitest, @testing-library/svelte, @playwright/test)

*(Wave 0 includes no test code — all tests added during Phase 2 implementation.)*

## Open Questions

1. **Distance field UI type (D-06 discretion)**
   - What we know: Distance is used in class tuples and rounds/passes config; "18m", "25m", "70m" are common.
   - What's unclear: Should distance be a dropdown (with 18m, 25m, 70m, ... "other"), a free numeric input (text field accepting "18m", "50 yards"), or both?
   - Recommendation: Provide a dropdown with common values (18m, 25m, 70m, and "Other"); if trainer picks "Other", show a text input for custom values. This matches the bow-type pattern (D-04/D-05).

2. **Age-group dropdown defaults (D-06 discretion)**
   - What we know: German archery clubs commonly use U12, U14, U16, U18, Erwachsene.
   - What's unclear: Should the dropdown be hardcoded to these 5 + "other", or should it be configurable per club (deferred to v2.5)?
   - Recommendation: Hardcode the 5 common age-groups + "Other" for v1. Deferrable to Phase 2 planning if feedback suggests a different set.

3. **Preset export/import merge strategy (D-15 discretion)**
   - What we know: Import should "merge/replace the full preset list."
   - What's unclear: Does merge mean (a) "keep existing presets, add imported ones (up to 8 total)", (b) "replace all presets with imported ones", or (c) "ask the trainer which to keep"?
   - Recommendation: Start with (b) "replace all" for simplicity. Add a confirmation prompt: "Import will replace all {N} current presets with {M} imported presets. Continue?" If feedback demands additive merge, implement (a) in a later phase.

4. **Auto-assignment feedback to trainer (Pitfall 4)**
   - What we know: Trainer can leave shooters unassigned; app auto-assigns to balance.
   - What's unclear: Should the app show a preview of the auto-assignment before commit, or apply it silently?
   - Recommendation: Show a summary after registration submission: "{N} shooters auto-assigned to lines {1,2,1,2...}. Review or save." This prevents pitfall 4 (trainer confusion about which shooter is where).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Dexie.js (npm) | Schema setup, data persistence | ✓ | 4.4.4 | — (no fallback; IndexedDB is required) |
| dexie-export-import (npm) | Preset export/import | ✓ | 4.4.0 | Manual JSON serialization (loses progress callbacks; not recommended) |
| Svelte 5 (npm) | UI framework | ✓ | 5.56.4 | — (no fallback; framework is required) |
| Tailwind CSS 4 (npm) | Styling | ✓ | 4.3.2 | — (no fallback; required for Phase 2 forms) |
| Node.js runtime | Build, dev server | ✓ | 20.19.0+ | — (no fallback; required) |

**Missing dependencies with no fallback:** None — all required tools are available.

**Missing dependencies with fallback:** None — all dependencies are explicitly required.

## Sources

### Primary (HIGH confidence)
- [Dexie.js Documentation: Design](https://dexie.org/docs/Tutorial/Design) — Schema structure, indexing strategy, compound indexes
- [Dexie.js Documentation: liveQuery()](https://dexie.org/docs/liveQuery()) — Observable pattern, Svelte Store contract compliance, subscription semantics
- [Dexie.js Documentation: Export/Import](https://dexie.org/docs/ExportImport/dexie-export-import) — Full database export/import with streaming, progress callbacks, merge transforms
- [Svelte 5 Runes Docs](https://svelte.dev/blog/runes) — $state, $derived, $effect semantics; reactivity model
- [dexie-export-import npm package](https://www.npmjs.com/package/dexie-export-import) — version 4.4.0, installation, JSON format
- CLAUDE.md (project instructions) — Stack versions, Dexie + Svelte 5 integration pattern, dexie-export-import recommendation for backup/preset sharing

### Secondary (MEDIUM confidence)
- [Dexie.js + Svelte Integration Guide](https://dev.to/nicoheinrich/svelte-stores-x-dexie-20-5d) — Practical patterns for liveQuery + Svelte reactive syntax
- [Svelte 5 $derived Rune Guide](https://teta.so/blog/svelte-5-runes-state-derived-effect) — Deep dive on $derived semantics, when to use $derived vs $effect
- [MDN: IndexedDB Storage Quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — Storage limits, eviction behavior, persistence strategies
- [Round-Robin Fairness in Tournaments](https://whatisesports.xyz/round-robin-fairness/) — Principles for balanced assignment, bye-round handling
- [WebSearch: Svelte Dropdown with Custom Input](https://github.com/rob-balfre/svelte-select) — svelte-select library patterns (referenced as alternative; native HTML adequate for Phase 2)
- [WebSearch: Tournament App Common Pitfalls](https://www.livetourney.com/blog/golf-tournament-scoring) — Math errors, unclear rules, UX overwhelm, data loss
- [WebSearch: Dexie Schema Design Patterns](https://app.studyraid.com/en/read/11356/355143/optimizing-database-schema-design) — Compound indexes, denormalization strategy, schema evolution

### Tertiary (LOW confidence)
- [GitHub Issue: Dexie + Svelte 5 liveQuery Edge Case](https://github.com/dexie/Dexie.js/issues/2075) — Known initial-load `undefined` race condition with $derived wrapper; workaround suggested (explicit await or default value)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dexie.js 4.4.4 + dexie-export-import 4.4.0 are stable and production-ready [VERIFIED: npm registry] | Standard Stack | Low — both are mature, 8+ years (Dexie) and 2+ years (addon), 500K+ weekly downloads |
| A2 | Svelte 5 runes ($state, $derived) are sufficient for all Phase 2 form state without external state libraries [VERIFIED: CLAUDE.md, Svelte official docs] | Architecture Patterns | Low — CLAUDE.md explicitly notes runes replace Redux/Zustand; confirmed in Svelte 5 release notes |
| A3 | Native HTML select + text input is sufficient for dropdown+custom patterns; no svelte-select library needed [ASSUMED] | Don't Hand-Roll | Medium — Phase 2 has ~5-6 dropdowns; svelte-select adds ~30KB. Native HTML is sufficient if no autocomplete/filtering needed. User confirmation recommended before committing. |
| A4 | Auto-assignment round-robin by registration order provides "fair" distribution for informal training tournaments [CITED: Round-Robin Fairness principles] | Architecture Patterns | Low — round-robin is standard in sports scheduling; "fair" for informal tournaments (not a formal competition with stakes) |
| A5 | Semantic auto-suffix (append differing field, e.g., "-18m") is better than random suffix for class-name collisions [ASSUMED] | Code Examples | Medium — "better" is subjective; semantic suffixes improve trainer readability, but random suffix is valid fallback if semantic is ambiguous. User discretion (D-07). |
| A6 | IndexedDB quota (50MB–6.6GB depending on browser) is sufficient for Phase 2/3/4 tournament data (max ~10K shooters, ~1000 scores) [ASSUMED] | Architecture Patterns | Low — rough estimate: 100 shooters × 30 scores × 100 bytes ≈ 300KB. Even 10K shooters × 30 scores × 100 bytes = 30MB, well under quota. |
| A7 | Preset export/import via dexie-export-import covers the "export all presets as one file" requirement without custom transform logic [VERIFIED: dexie-export-import docs] | Architecture Patterns | Low — export/import is built-in; transform logic only needed if merge behavior is complex (deferred to discretion, A6 confirms simple replace is viable) |
| A8 | Shooting-line assignment algorithm (round-robin by index) is deterministic, requires no persistence beyond the current registration session [ASSUMED] | Code Examples, Pitfall 4 | Medium — Algorithm is deterministic, but lack of transparency (Pitfall 4) is a real UX risk. Recommend preview/review step during implementation. |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed prior to planning. *This table is NOT empty.*

**Critical assumptions for planner:** A3 (native HTML vs. svelte-select) and A5 (semantic suffix format) and A8 (auto-assignment preview UI) should be confirmed with the user before committing to implementation. All others are low-risk.

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all versions verified against npm registry; Dexie + dexie-export-import + Svelte 5 confirmed as locked stack in CLAUDE.md
- Dexie Schema Design: HIGH — official Dexie docs and integration guide provide clear patterns; compound indexing and liveQuery semantics well-documented
- Svelte 5 Runes Patterns: HIGH — Svelte 5 official blog and examples; $state, $derived, $effect semantics are stable and well-defined
- Preset Export/Import: HIGH — dexie-export-import official docs + npm package; streaming and transform logic are battle-tested
- Auto-Assignment & Fairness: MEDIUM — round-robin principles are standard, but "fair" depends on tournament context; lacking archery-specific research
- Common Pitfalls: MEDIUM — sourced from golf/sports tournament software; archery-specific pitfalls may differ
- Form Validation & Collision Detection: HIGH — standard patterns from Svelte docs and Dexie query semantics

**Research date:** 2026-07-04
**Valid until:** 2026-08-03 (30 days for stable libraries and locked stack)

**Gaps in research:**
- Archery-specific tournament management pitfalls (research found golf/sports examples, not archery)
- Detailed conflict-resolution UX for preset import merge (deferred to user discretion, D-15)
- iOS Safari IndexedDB eviction impact on presets (documented in CLAUDE.md, confirmed but mitigation deferred to v1.5)

---

*Phase: 2 — Setup & Registration*
*Research completed: 2026-07-04*
*Planner can proceed to `.planning/phases/02-setup-registration/02-PLAN.md`*
