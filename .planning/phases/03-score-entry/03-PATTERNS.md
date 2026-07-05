# Phase 3: Score Entry - Pattern Map

**Mapped:** 2026-07-05
**Files analyzed:** 9 new/modified files
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` | model | CRUD | same file (Phase 2) | exact |
| `src/lib/db/testHelpers.ts` | utility | CRUD | same file (Phase 2) | exact |
| `src/lib/components/ScorePicker.svelte` | component | request-response | `src/lib/components/DropdownWithCustom.svelte` | role-match |
| `src/lib/components/ScoreTable.svelte` | component | CRUD | `src/lib/views/Registration.svelte` | role-match |
| `src/lib/components/RoundPasseSelector.svelte` | component | request-response | `src/lib/views/SetupRounds.svelte` | role-match |
| `src/lib/views/ScoreEntry.svelte` | component | CRUD + event-driven | `src/lib/views/Registration.svelte` | role-match |
| `src/lib/utils/scoreCompletion.ts` | utility | transform | `src/lib/utils/modeDetection.ts` | role-match |
| `src/lib/utils/sortComparators.ts` | utility | transform | `src/lib/utils/modeDetection.ts` | role-match |
| `src/lib/views/ScoreEntry.test.ts` | test | CRUD | `src/lib/components/ShooterForm.test.ts` | role-match |

## Pattern Assignments

### `src/lib/db/schema.ts` (model, CRUD)

**Analog:** Same file — Phase 2 established Dexie schema patterns

**Imports pattern** (lines 1-4):
```typescript
import Dexie, { type Table } from 'dexie';

// TypeScript interfaces at the top, Dexie class below, export db instance at the end
export interface ScoreRecord {
  id?: number;
  shooterId: number;
  roundId: number;
  passeIndex: number;
  arrowIndex: number;
  value: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'X' | 'M' | null;
  finalized: boolean;
}
```

**Dexie class pattern** (lines 46-68):
```typescript
class InstantBogenturnierDB extends Dexie {
  classes!: Table<ClassRecord, number>;
  shootingLines!: Table<ShootingLineConfig, number>;
  rounds!: Table<RoundConfig, number>;
  shooters!: Table<ShooterRecord, number>;
  presets!: Table<PresetRecord, number>;
  scores!: Table<ScoreRecord, number>;  // ADD THIS TABLE

  constructor() {
    super('InstantBogenturnierDB');
    this.version(1).stores({});
    this.version(2).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
    });
    // ADD VERSION 3 BELOW:
    this.version(3).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
      scores: '++id, shooterId, roundId, [shooterId+roundId+passeIndex+arrowIndex]',
    });
  }
}
```

**Export pattern** (line 68):
```typescript
export const db = new InstantBogenturnierDB();
```

---

### `src/lib/db/testHelpers.ts` (utility, CRUD)

**Analog:** Same file — Phase 2 established resetDb pattern

**Extension pattern** (lines 5-13):
```typescript
export async function resetDb(): Promise<void> {
  await Promise.all([
    db.classes.clear(),
    db.shootingLines.clear(),
    db.rounds.clear(),
    db.shooters.clear(),
    db.presets.clear(),
    db.scores.clear(),  // ADD THIS LINE
  ]);
}
```

---

### `src/lib/components/ScorePicker.svelte` (component, request-response)

**Analog:** `src/lib/components/DropdownWithCustom.svelte` (lines 1-57)

**Props pattern** (lines 9-20):
```typescript
let {
  label,
  options,
  value = '',
  onchange,
}: {
  label: string;
  options: readonly Option[];
  value?: string;
  onchange: (value: string) => void;
} = $props();
```

**State management pattern** (lines 22-29):
```typescript
let isCustom = $state(false);
let customInput = $state('');
let lastEmittedValue = $state<string | null>(null);

$effect(() => {
  if (value === '' && value !== lastEmittedValue) {
    isCustom = false;
    customInput = '';
  }
});
```

**Event handler pattern** (lines 40-57):
```typescript
function handleSelectChange(e: Event) {
  const selected = (e.target as HTMLSelectElement).value;
  if (selected === 'custom') {
    isCustom = true;
    lastEmittedValue = customInput;
    onchange(customInput);
  } else {
    isCustom = false;
    lastEmittedValue = selected;
    onchange(selected);
  }
}

function handleCustomInput(e: Event) {
  customInput = (e.target as HTMLInputElement).value;
  lastEmittedValue = customInput;
  onchange(customInput);
}
```

**Template pattern** (lines 60-72):
```svelte
<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {label}
  <div class="grid grid-cols-5 gap-2 p-4">
    {#each options as option (option.value)}
      <button
        type="button"
        onclick={() => onchange(option.value)}
        class="min-h-[44px] rounded-lg font-semibold text-[16px] leading-[1.5]"
      >
        {option}
      </button>
    {/each}
  </div>
</label>
```

---

### `src/lib/components/ScoreTable.svelte` (component, CRUD)

**Analog:** `src/lib/views/Registration.svelte` (lines 1-52)

**Imports pattern** (lines 1-8):
```typescript
import { liveQuery } from 'dexie';
import { Pencil, Trash2 } from '@lucide/svelte';
import { db } from '../db/schema';
import type { ShooterRecord } from '../db/schema';
import { strings } from '../i18n/strings.de';
import { detectMode } from '../utils/modeDetection';
import GlassCard from '../components/GlassCard.svelte';
import ShooterForm from '../components/ShooterForm.svelte';
```

**liveQuery + $derived pattern** (lines 11-22):
```typescript
const shootersQuery = liveQuery(() => db.shooters.toArray());
let shooters = $derived($shootersQuery ?? []);

const classesQuery = liveQuery(() => db.classes.toArray());
let classes = $derived($classesQuery ?? []);
let classNameById = $derived(new Map(classes.map((c) => [c.id, c.name])));

const lineConfigQuery = liveQuery(() => db.shootingLines.get(1));
let lineCount = $derived($lineConfigQuery?.count ?? 2);

let shooterCount = $derived(shooters.length);
let mode = $derived(detectMode(shooterCount, lineCount));
```

**State management pattern** (lines 24-25):
```typescript
let editingShooter = $state<ShooterRecord | null>(null);
let errorFeedback = $state('');
```

**Error handling pattern** (lines 35-47):
```typescript
async function deleteShooter(id: number | undefined) {
  if (id === undefined) return;
  errorFeedback = '';
  try {
    await db.shooters.delete(id);
  } catch (err) {
    // WR-04: surface write failures instead of failing silently.
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  }
}
```

**Table template pattern** (lines 97-141):
```svelte
<table class="hidden w-full rounded-lg bg-white text-[16px] leading-[1.5] text-slate-900 md:table dark:bg-slate-800 dark:text-slate-100">
  <thead>
    <tr class="border-b border-slate-200 text-left dark:border-slate-700">
      <th class="p-3 text-[14px] font-normal leading-[1.4]">{strings.registration.tableNameColumn}</th>
      <th class="p-3 text-[14px] font-normal leading-[1.4]">{strings.registration.tableClassColumn}</th>
      <th class="p-3"></th>
    </tr>
  </thead>
  <tbody>
    {#each shooters as shooter (shooter.id)}
      <tr class="border-b border-slate-100 dark:border-slate-700">
        <td class="p-3">{shooter.name}</td>
        <td class="p-3">{className(shooter.classId)}</td>
        <td class="p-3">
          <div class="flex justify-end gap-2">
            <button type="button" onclick={() => startEdit(shooter)}>
              <Pencil size={20} />
            </button>
          </div>
        </td>
      </tr>
    {/each}
  </tbody>
</table>
```

---

### `src/lib/components/RoundPasseSelector.svelte` (component, request-response)

**Analog:** `src/lib/views/SetupRounds.svelte` (lines 1-64)

**State pattern** (lines 12-18):
```typescript
let selectedMode = $state<'preset' | 'custom'>('preset');
let selectedPresetId = $state<string>(WA_PRESETS[0].id);

let customRounds = $state(1);
let customPassesPerRound = $state(10);
let customArrowsPerPasse = $state(3);
let customDistance = $state('18m');
```

**Derived config pattern** (lines 22-40):
```typescript
let resolvedConfig = $derived.by(() => {
  if (selectedMode === 'preset') {
    const preset = WA_PRESETS.find((p) => p.id === selectedPresetId) ?? WA_PRESETS[0];
    return {
      arrowsPerPasse: preset.arrowsPerPasse,
      passesPerRound: preset.passesPerRound,
      numberOfRounds: preset.numberOfRounds,
      distance: preset.distance,
      presetId: preset.id as string | undefined,
    };
  }
  return {
    arrowsPerPasse: customArrowsPerPasse,
    passesPerRound: customPassesPerRound,
    numberOfRounds: customRounds,
    distance: customDistance,
    presetId: undefined as string | undefined,
  };
});
```

**Validation pattern** (lines 46-58):
```typescript
function isValidResolvedConfig(config: typeof resolvedConfig): boolean {
  return (
    Number.isInteger(config.numberOfRounds) &&
    config.numberOfRounds >= 1 &&
    config.numberOfRounds <= 20 &&
    Number.isInteger(config.passesPerRound) &&
    config.passesPerRound >= 1 &&
    config.passesPerRound <= 30
  );
}
```

**Radio/select pattern** (lines 67-92):
```svelte
<div class="flex gap-4">
  <label class="flex items-center gap-2 text-[14px] leading-[1.4]">
    <input
      type="radio"
      name="rounds-mode"
      value="preset"
      checked={selectedMode === 'preset'}
      onchange={() => (selectedMode = 'preset')}
    />
    {strings.setup.waPresetsLabel}
  </label>
  <label class="flex items-center gap-2 text-[14px] leading-[1.4]">
    <input
      type="radio"
      name="rounds-mode"
      value="custom"
      checked={selectedMode === 'custom'}
      onchange={() => (selectedMode = 'custom')}
    />
    {strings.setup.customLabel}
  </label>
</div>
```

---

### `src/lib/views/ScoreEntry.svelte` (component, CRUD + event-driven)

**Analog:** `src/lib/views/Registration.svelte` (lines 1-178)

**Component structure pattern** (lines 1-52):
```typescript
import { liveQuery } from 'dexie';
import { db } from '../db/schema';
import type { ShooterRecord } from '../db/schema';
import { strings } from '../i18n/strings.de';
import ConfirmDialog from '../components/ConfirmDialog.svelte';
import ScoreTable from '../components/ScoreTable.svelte';
import RoundPasseSelector from '../components/RoundPasseSelector.svelte';
import ScorePicker from '../components/ScorePicker.svelte';

// Reactive query pattern from Phase 2
const shootersQuery = liveQuery(() => db.shooters.toArray());
let shooters = $derived($shootersQuery ?? []);

const roundsQuery = liveQuery(() => db.rounds.get(1));
let rounds = $derived($roundsQuery);

// Local state for UI
let selectedRound = $state(0);
let selectedPasse = $state(0);
let sortBy = $state<'line' | 'name' | 'class' | 'sum'>('line');
let finalize = $state(false);
let errorFeedback = $state('');
```

**View structure pattern** (lines 54-178):
```svelte
<div class="mx-auto flex max-w-[720px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2]">
    {strings.scoring.heading}
  </h1>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600">{errorFeedback}</p>
  {/if}

  <!-- Component composition pattern -->
  <RoundPasseSelector bind:selectedRound bind:selectedPasse {rounds} />
  
  <ScoreTable {shooters} {selectedRound} {selectedPasse} {sortBy} />
  
  <button
    type="button"
    class="min-h-[44px] rounded-lg bg-teal-500 text-white"
    onscoreselected={handleFinalizeClick}
  >
    {strings.scoring.finalizeButton}
  </button>
</div>

<!-- Finalization dialog using Phase 2 pattern -->
<ConfirmDialog
  open={finalize}
  title="Turnier abschließen?"
  body="Diese Aktion sperrt alle Ergebnisse."
  confirmLabel="Ja, abschließen"
  cancelLabel="Abbrechen"
  destructive={true}
  onconfirm={handleFinalize}
  oncancel={() => { finalize = false; }}
/>
```

**Autosave handler pattern** (inspired by RESEARCH.md code examples, lines 292-328):
```typescript
async function saveScore(
  shooterId: number,
  roundId: number,
  passeIndex: number,
  arrowIndex: number,
  value: string | null,
): Promise<void> {
  try {
    // Non-blocking write — fire and forget
    db.scores.put({
      shooterId,
      roundId,
      passeIndex,
      arrowIndex,
      value,
      finalized: false,
    }).catch((err) => {
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

---

### `src/lib/utils/scoreCompletion.ts` (utility, transform)

**Analog:** `src/lib/utils/modeDetection.ts` (lines 1-11)

**Pure function pattern** (lines 1-11):
```typescript
// Completion detection: pure function, testable in isolation
// Based on RESEARCH.md Common Pitfalls section (Pitfall 2: completion check accuracy)

export type ScoreRecord = {
  shooterId: number;
  roundId: number;
  passeIndex: number;
  arrowIndex: number;
  value: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'X' | 'M' | null;
  finalized: boolean;
};

export type ShooterRecord = {
  id?: number;
  name: string;
  classId: number;
  lineAssignment?: number | null;
  flight?: 'A/B' | 'C/D' | null;
};

export type RoundConfig = {
  id?: number;
  arrowsPerPasse: number;
  passesPerRound: number;
  numberOfRounds: number;
  distance: string;
  presetId?: string;
};

// Pure function — no side effects, easily testable
export function areAllScoresEntered(
  shooters: ShooterRecord[],
  rounds: RoundConfig[],
  scores: ScoreRecord[],
): boolean {
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

// Helper: calculate sum for a single passe
export function calculatePasseSum(
  passeScores: ScoreRecord[],
): number {
  return passeScores.reduce((sum, score) => {
    if (score.value === 'M') return sum + 0;
    if (score.value === 'X') return sum + 10;
    return sum + (parseInt(score.value ?? '0', 10) || 0);
  }, 0);
}
```

---

### `src/lib/utils/sortComparators.ts` (utility, transform)

**Analog:** `src/lib/utils/modeDetection.ts` (pure functions, no external dependencies)

**Pure function pattern** (based on RESEARCH.md code examples and CLAUDE.md conventions):
```typescript
// Sort comparator functions — pure, framework-free
// Based on RESEARCH.md "Don't Hand-Roll" section: use plain .sort() on arrays

export type ShooterWithScore = {
  shooter: {
    id?: number;
    name: string;
    classId: number;
    lineAssignment?: number | null;
    flight?: 'A/B' | 'C/D' | null;
  };
  sum: number;
  className: string;
};

// Sort by line assignment (default for range use)
export function compareByLine(a: ShooterWithScore, b: ShooterWithScore): number {
  const lineA = a.shooter.lineAssignment ?? 999;
  const lineB = b.shooter.lineAssignment ?? 999;
  return lineA - lineB;
}

// Sort by name (alphabetical)
export function compareByName(a: ShooterWithScore, b: ShooterWithScore): number {
  return a.shooter.name.localeCompare(b.shooter.name);
}

// Sort by class name (alphabetical)
export function compareByClass(a: ShooterWithScore, b: ShooterWithScore): number {
  return a.className.localeCompare(b.className);
}

// Sort by passe sum (numeric)
export function compareBySum(a: ShooterWithScore, b: ShooterWithScore): number {
  return a.sum - b.sum;
}

// Master sort function — takes an array and returns sorted copy
export function sortShooters(
  shooters: ShooterWithScore[],
  sortBy: 'line' | 'name' | 'class' | 'sum',
  direction: 'asc' | 'desc' = 'asc',
): ShooterWithScore[] {
  const comparator = {
    line: compareByLine,
    name: compareByName,
    class: compareByClass,
    sum: compareBySum,
  }[sortBy];

  const sorted = [...shooters].sort(comparator);
  return direction === 'desc' ? sorted.reverse() : sorted;
}
```

---

### `src/lib/views/ScoreEntry.test.ts` (test, CRUD)

**Analog:** `src/lib/components/ShooterForm.test.ts` (lines 1-64)

**Test file structure pattern** (lines 1-18):
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/svelte';
import ScoreEntry from './ScoreEntry.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';

// Behavior per Phase 3 requirements
describe('ScoreEntry', () => {
  beforeEach(async () => {
    await resetDb();
  });
```

**Component test pattern** (lines 20-30):
```typescript
it('renders the score table with all registered shooters', async () => {
  const classId = await db.classes.add({ name: 'RCV-U14' });
  await db.shootingLines.put({ id: 1, count: 2 });
  await db.rounds.put({
    id: 1,
    numberOfRounds: 1,
    passesPerRound: 3,
    arrowsPerPasse: 3,
    distance: '18m',
  });
  await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

  render(ScoreEntry);

  await screen.findByText('Anna');
  expect(screen.getByText('Anna')).toBeInTheDocument();
});
```

**Autosave test pattern** (lines 32-50):
```typescript
it('autosaves score on tap-button click', async () => {
  // ... setup ...
  
  render(ScoreEntry);
  
  // Find a score cell tap button
  const scoreButton = await screen.findByRole('button', { name: '8' });
  await fireEvent.click(scoreButton);

  // Verify write to DB (without waiting for success message)
  await waitFor(async () => {
    const scores = await db.scores.toArray();
    expect(scores.length).toBeGreaterThan(0);
  });
});
```

**Finalization test pattern** (lines 52-70):
```typescript
it('disables score cells after finalization', async () => {
  // ... setup ...
  
  render(ScoreEntry);
  
  // Fill all cells (tests omitted for brevity)
  // ...
  
  const finalizeButton = await screen.findByRole('button', { name: 'Turnier abschließen' });
  const confirmButton = await screen.findByRole('button', { name: 'Ja, abschließen' });

  await fireEvent.click(finalizeButton);
  await fireEvent.click(confirmButton);

  // Verify cells are disabled
  const scoreCells = screen.getAllByRole('button', { name: /[0-9X M]/ });
  for (const cell of scoreCells) {
    expect((cell as HTMLButtonElement).disabled).toBe(true);
  }
});
```

---

## Shared Patterns

### Error Handling Pattern (WR-04 from Phase 2)

**Source:** `src/lib/views/Registration.svelte` (lines 35-47)

**Apply to:** All view files and components with async database operations (ScoreEntry, ScorePicker autosave handlers)

```typescript
// Try-catch with error feedback state
let errorFeedback = $state('');

async function handleDatabaseOperation() {
  errorFeedback = '';
  try {
    await db.scores.put({ /* ... */ });
  } catch (err) {
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  }
}
```

**Render pattern:**
```svelte
{#if errorFeedback}
  <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
{/if}
```

---

### Reactive Query Pattern (liveQuery + $derived)

**Source:** `src/lib/views/Registration.svelte` (lines 11-22)

**Apply to:** Any component that needs reactive data from Dexie (ScoreEntry, ScoreTable for scores/shooters/rounds)

```typescript
// Pattern: liveQuery() returns a store-like object; $derived unwraps it
const shootersQuery = liveQuery(() => db.shooters.toArray());
let shooters = $derived($shootersQuery ?? []);

const roundsQuery = liveQuery(() => db.rounds.get(1));
let rounds = $derived($roundsQuery);

// Derived computations on the reactive data
let shooterCount = $derived(shooters.length);
```

---

### Confirmation Dialog Pattern (Reuse Phase 2 component)

**Source:** `src/lib/components/ConfirmDialog.svelte` (lines 1-66)

**Apply to:** Finalization action in ScoreEntry

```typescript
import ConfirmDialog from '../components/ConfirmDialog.svelte';

let finalize = $state(false);

async function handleFinalizeClick() {
  finalize = true;
}

async function handleFinalize() {
  try {
    const allScores = await db.scores.toArray();
    await db.scores.bulkPut(
      allScores.map((s) => ({ ...s, finalized: true })),
    );
    finalize = false;
  } catch (err) {
    // Handle error
  }
}
```

**Template pattern:**
```svelte
<ConfirmDialog
  open={finalize}
  title="Turnier abschließen?"
  body="Diese Aktion sperrt alle Ergebnisse und kann nicht rückgängig gemacht werden."
  confirmLabel="Ja, abschließen"
  cancelLabel="Abbrechen"
  destructive={true}
  onconfirm={handleFinalize}
  oncancel={() => { finalize = false; }}
/>
```

---

### Tap-Button Grid Pattern

**Source:** RESEARCH.md code examples (lines 405-420) + Phase 1 D-11 constraint (opaque/high-contrast)

**Apply to:** ScorePicker component and any score-cell render in ScoreTable

```svelte
<!-- Grid of tap buttons for score values 0-10, X, M -->
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

---

## Test File Analogs

### `src/lib/utils/scoreCompletion.test.ts` (unit test)

**Analog:** `src/lib/utils/modeDetection.test.ts` (lines 1-17)

**Pattern** (pure function testing):
```typescript
import { describe, it, expect } from 'vitest';
import { areAllScoresEntered, calculatePasseSum } from './scoreCompletion';
import type { ShooterRecord, RoundConfig, ScoreRecord } from './scoreCompletion';

describe('areAllScoresEntered', () => {
  it('returns false when any cell is unfilled', () => {
    const shooters: ShooterRecord[] = [{ id: 1, name: 'Anna', classId: 1 }];
    const rounds: RoundConfig[] = [{ id: 1, numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 3, distance: '18m' }];
    const scores: ScoreRecord[] = [
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 0, value: '8', finalized: false },
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 1, value: null, finalized: false },
    ];

    expect(areAllScoresEntered(shooters, rounds, scores)).toBe(false);
  });

  it('returns true when all cells are filled', () => {
    // ... all cells filled with values ...
    expect(areAllScoresEntered(shooters, rounds, scores)).toBe(true);
  });
});

describe('calculatePasseSum', () => {
  it('treats M (miss) as 0', () => {
    const scores: ScoreRecord[] = [
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 0, value: '8', finalized: false },
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 1, value: 'M', finalized: false },
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 2, value: '9', finalized: false },
    ];
    expect(calculatePasseSum(scores)).toBe(17);
  });

  it('treats X (inner-ten) as 10', () => {
    const scores: ScoreRecord[] = [
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 0, value: 'X', finalized: false },
      { shooterId: 1, roundId: 1, passeIndex: 0, arrowIndex: 1, value: '9', finalized: false },
    ];
    expect(calculatePasseSum(scores)).toBe(19);
  });
});
```

---

### `src/lib/utils/sortComparators.test.ts` (unit test)

**Analog:** `src/lib/utils/modeDetection.test.ts` (pure function testing pattern)

**Pattern:**
```typescript
import { describe, it, expect } from 'vitest';
import { sortShooters, compareByLine, compareByName, compareBySum } from './sortComparators';
import type { ShooterWithScore } from './sortComparators';

describe('sortShooters', () => {
  it('sorts by line assignment (default)', () => {
    const shooters: ShooterWithScore[] = [
      { shooter: { id: 1, name: 'Bob', classId: 1, lineAssignment: 2 }, sum: 20, className: 'U14' },
      { shooter: { id: 2, name: 'Anna', classId: 1, lineAssignment: 1 }, sum: 22, className: 'U14' },
    ];
    
    const sorted = sortShooters(shooters, 'line', 'asc');
    expect(sorted[0].shooter.name).toBe('Anna');
    expect(sorted[1].shooter.name).toBe('Bob');
  });

  it('sorts by name (alphabetical)', () => {
    const shooters: ShooterWithScore[] = [
      { shooter: { id: 1, name: 'Bob', classId: 1 }, sum: 20, className: 'U14' },
      { shooter: { id: 2, name: 'Anna', classId: 1 }, sum: 22, className: 'U14' },
    ];
    
    const sorted = sortShooters(shooters, 'name', 'asc');
    expect(sorted[0].shooter.name).toBe('Anna');
  });

  it('sorts by sum descending', () => {
    const shooters: ShooterWithScore[] = [
      { shooter: { id: 1, name: 'Bob', classId: 1 }, sum: 20, className: 'U14' },
      { shooter: { id: 2, name: 'Anna', classId: 1 }, sum: 25, className: 'U14' },
    ];
    
    const sorted = sortShooters(shooters, 'sum', 'desc');
    expect(sorted[0].sum).toBe(25);
    expect(sorted[1].sum).toBe(20);
  });
});
```

---

### `e2e/scoring.spec.ts` (end-to-end test)

**Analog:** Not yet present in codebase (Phase 1/2 had nav.spec.ts, but scoring-specific e2e is new)

**Pattern based on RESEARCH.md and CLAUDE.md e2e recommendations** (lines 41-45 of App.svelte):

```typescript
import { test, expect } from '@playwright/test';

test.describe('Score Entry E2E', () => {
  test('autosaves scores and persists across page reload (SCORE-03)', async ({ page }) => {
    // Setup: navigate to scoring, fill a cell
    await page.goto('http://localhost:5173');
    await page.click('[data-nav="scoring"]');

    const scoreButton = page.locator('button:has-text("8")').first();
    await scoreButton.click();

    // Reload page and verify the score is still there
    await page.reload();
    
    // E2E test verifies IndexedDB persistence across reload
    const scoreCell = page.locator('[data-score-cell="1-0-0-0"]');
    await expect(scoreCell).toContainText('8');
  });

  test('locks cells after finalization (SCORE-07)', async ({ page }) => {
    // Setup: fill all cells, finalize
    // ... fill all cells ...
    
    const finalizeButton = page.locator('button:has-text("Turnier abschließen")');
    await finalizeButton.click();

    const confirmButton = page.locator('button:has-text("Ja, abschließen")');
    await confirmButton.click();

    // Verify cells are disabled
    const scoreButtons = page.locator('button[data-score-cell]');
    for (const btn of await scoreButtons.all()) {
      await expect(btn).toBeDisabled();
    }
  });

  test('works offline (SCORE-03 offline variant)', async ({ browser, context }) => {
    const page = await context.newPage();
    
    // Go online, fill some data
    await page.goto('http://localhost:5173');
    // ... fill cells ...
    
    // Go offline
    await context.setOffline(true);
    
    // Fill more cells (should work without network)
    const scoreButton = page.locator('button:has-text("9")').first();
    await scoreButton.click();

    // Go online, reload — data should still be there
    await context.setOffline(false);
    await page.reload();

    // Verify all data persisted
    const cells = page.locator('[data-score-cell]');
    expect(await cells.count()).toBeGreaterThan(0);
  });
});
```

---

## No Analog Found

All Phase 3 files have clear analogs in Phase 1/2 codebase or are direct extensions of existing patterns. No files without a match.

---

## Metadata

**Analog search scope:** `src/lib/`, `src/views/`, test files
**Files scanned:** 20+ source/test files from Phase 1/2
**Pattern extraction date:** 2026-07-05
**Classification confidence:** HIGH — all files directly analogous to Phase 1/2 patterns
**Test coverage baseline:** Phase 2 test patterns fully applied

---

*Phase: 3-Score Entry*
*Patterns mapped: 2026-07-05*
