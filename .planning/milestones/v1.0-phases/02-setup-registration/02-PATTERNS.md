# Phase 2: Setup & Registration - Pattern Map

**Mapped:** 2026-07-04
**Files analyzed:** 14 new/modified files
**Analogs found:** 14 / 14 matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` | model | data-persistence | `src/lib/db/schema.ts` (self) | exact |
| `src/lib/utils/classNameGenerator.ts` | utility | transform | `src/lib/stores/theme.svelte.ts` | role-match |
| `src/lib/utils/modeDetection.ts` | utility | transform | `src/lib/stores/theme.svelte.ts` | role-match |
| `src/lib/utils/shooterAutoAssignment.ts` | utility | transform | `src/lib/stores/theme.svelte.ts` | role-match |
| `src/lib/fixtures/waPresets.ts` | config | reference-data | `src/lib/config/app.config.ts` | exact |
| `src/lib/components/DropdownWithCustom.svelte` | component | input | `src/lib/components/GlassCard.svelte` | role-match |
| `src/lib/components/ClassForm.svelte` | component | CRUD | `src/lib/components/UpdateBanner.svelte` | role-match |
| `src/lib/components/ShooterForm.svelte` | component | CRUD | `src/lib/components/UpdateBanner.svelte` | role-match |
| `src/lib/components/PresetSave.svelte` | component | CRUD | `src/lib/components/UpdateBanner.svelte` | role-match |
| `src/lib/views/Setup.svelte` | view | CRUD | `src/lib/views/SetupPlaceholder.svelte` | exact |
| `src/lib/views/Registration.svelte` | view | CRUD | `src/lib/views/RegistrationPlaceholder.svelte` | exact |
| `src/lib/views/SetupRounds.svelte` | view | CRUD | `src/lib/views/SetupPlaceholder.svelte` | role-match |
| `src/lib/views/PresetList.svelte` | view | CRUD | `src/lib/views/SetupPlaceholder.svelte` | role-match |
| `src/lib/i18n/strings.de.ts` | config | reference-data | `src/lib/i18n/strings.de.ts` (self) | exact |

## Pattern Assignments

### `src/lib/db/schema.ts` (model, data-persistence)

**Analog:** `src/lib/db/schema.ts` (self, Phase 1 scaffold)

This file expands the empty Phase 1 scaffold with real Dexie tables.

**Imports pattern** (lines 1-2):
```typescript
import Dexie from 'dexie';
// No additional imports needed — Dexie is the only dependency
```

**Schema definition pattern** (lines 6-11, to be expanded):

Current Phase 1 scaffold:
```typescript
class InstantBogenturnierDB extends Dexie {
  constructor() {
    super('InstantBogenturnierDB');
    this.version(1).stores({});  // Empty — to be populated
  }
}

export const db = new InstantBogenturnierDB();
```

Phase 2 expansion (per RESEARCH.md):
```typescript
class InstantBogenturnierDB extends Dexie {
  constructor() {
    super('InstantBogenturnierDB');
    this.version(2).stores({
      // Configuration tables
      classes: '++id, name',
      shootingLines: '++id',
      rounds: '++id',
      
      // Shooter roster
      shooters: '++id, classId, lineAssignment',
      
      // Preset management
      presets: '++id, name',
    });
  }
}
```

**Data type definitions** (new TypeScript interfaces to add):
```typescript
export interface Class {
  id?: number;
  name: string;
  ageGroup?: string;
  bowType?: string;
  distance?: string;
}

export interface Shooter {
  id?: number;
  classId: number;
  name: string;
  lineAssignment?: number;
  flight?: string;
}

export interface Round {
  id?: number;
  number: number;
  arrowsPerPasse: number;
  passesPerRound: number;
  numberOfRounds: number;
  distance: string;
}

export interface ShootingLineConfig {
  id?: number;
  count: number;
}

export interface Preset {
  id?: number;
  name: string;
  classes: Class[];
  shootingLineCount: number;
  roundsConfig: Round[];
  createdAt?: Date;
}
```

---

### `src/lib/utils/classNameGenerator.ts` (utility, transform)

**Analog:** `src/lib/stores/theme.svelte.ts` (pure logic, single-export functions)

Pattern: Export pure functions that take inputs and return outputs, no side effects or state.

**Imports pattern:**
```typescript
// Minimal imports; no framework dependencies
import type { Class } from '../db/schema';
```

**Core function pattern** (similar to how theme.svelte.ts exports toggleTheme and currentIsDark):
```typescript
// Generate class name from age-group, bow-type, distance tuple
export function generateClassName(ageGroup?: string, bowType?: string, distance?: string): string {
  // Follows the bow-type abbreviation map (RCV, trad, LB, BB, CP)
}

// Check for name collision and generate suffix if needed
export function autoSuffixOnCollision(baseName: string, existingNames: string[]): string {
  // Returns base name if unique, otherwise appends semantic or random suffix
}

// Get bow-type abbreviation for name generation
function getBowTypeAbbr(bowType: string): string {
  // Maps full bow-type to abbreviation (e.g. 'Recurve' → 'RCV')
}
```

---

### `src/lib/utils/modeDetection.ts` (utility, transform)

**Analog:** `src/lib/stores/theme.svelte.ts` (pure logic utility)

Pattern: Export simple, deterministic derived-value functions.

**Imports pattern:**
```typescript
// No imports; pure logic only
```

**Core function pattern:**
```typescript
// Determine tournament mode from shooter count vs. line count
export function detectMode(shooterCount: number, lineCount: number): 'AB' | 'AB/CD' {
  // If shooterCount > 2 × lineCount → AB/CD mode
  // Otherwise → AB mode
  return shooterCount > 2 * lineCount ? 'AB/CD' : 'AB';
}

// Describe the mode in German for display
export function describeModeInGerman(mode: 'AB' | 'AB/CD'): string {
  // Returns human-readable description for UI
}
```

---

### `src/lib/utils/shooterAutoAssignment.ts` (utility, transform)

**Analog:** `src/lib/stores/theme.svelte.ts` (pure logic utility)

Pattern: Export pure functions that implement algorithms without state or side effects.

**Imports pattern:**
```typescript
import type { Shooter } from '../db/schema';
```

**Core function pattern:**
```typescript
// Auto-assign unassigned shooters to lines and flights (round-robin by registration order)
export function assignShootersToLinesAndFlights(
  unassignedShooters: Shooter[],
  lineCount: number,
  mode: 'AB' | 'AB/CD'
): Array<{ shooter: Shooter; lineNum: number; flight: string }> {
  // Deterministic round-robin distribution
  // Returns array of assignments ready to be persisted
}

// Provide preview/summary of how shooters will be assigned
export function previewAssignmentSummary(
  shooterCount: number,
  lineCount: number,
  mode: 'AB' | 'AB/CD'
): string {
  // Returns human-readable summary: "{N} shooters assigned to lines {1,2,1,2...}"
}
```

---

### `src/lib/fixtures/waPresets.ts` (config, reference-data)

**Analog:** `src/lib/config/app.config.ts`

Pattern: Export const objects/arrays as reference data, no functions or state.

**Imports pattern:**
```typescript
// No imports; pure const data
```

**Data structure pattern** (following app.config.ts export style):
```typescript
export const WA_PRESETS = [
  {
    id: 'wa-18m',
    name: 'WA 18m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '18m',
    totalArrows: 30,
  },
  {
    id: 'wa-25m',
    name: 'WA 25m',
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '25m',
    totalArrows: 30,
  },
  {
    id: 'wa-70m',
    name: 'WA 70m',
    arrowsPerPasse: 6,
    passesPerRound: 6,
    numberOfRounds: 1,
    distance: '70m',
    totalArrows: 36,
  },
] as const;

export const AGE_GROUP_OPTIONS = ['U12', 'U14', 'U16', 'U18', 'Erwachsene'] as const;

export const BOW_TYPE_OPTIONS = [
  { value: 'RCV', label: 'Recurve' },
  { value: 'trad', label: 'trad. Recurve' },
  { value: 'LB', label: 'Langbogen' },
  { value: 'BB', label: 'Blankbogen' },
  { value: 'CP', label: 'Compound' },
] as const;

export const DISTANCE_OPTIONS = ['18m', '25m', '70m'] as const;
```

---

### `src/lib/components/GlassCard.svelte` (component, wrapper)

**Analog:** Existing `src/lib/components/GlassCard.svelte` — Use as-is for form/card containers

This component is already established in Phase 1 and does not need modification.

**Current pattern** (lines 1-16):
```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    children,
    class: className = '',
  }: {
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<div class="glass-surface rounded-2xl {className}">
  {@render children?.()}
</div>
```

Usage for Phase 2: Wrap ClassForm, PresetSave, and other setup forms inside `<GlassCard>` tags for consistent glass-effect styling per Phase 1 visual system.

---

### `src/lib/components/DropdownWithCustom.svelte` (component, input)

**Analog:** `src/lib/components/GlassCard.svelte` (reusable wrapper) + `src/lib/components/NavItem.svelte` (interactive state management)

Pattern: Reusable input component using Svelte 5 runes for state, structured props with `$props()`.

**Script structure pattern** (inspired by NavItem.svelte lines 6-26):
```svelte
<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }
  
  let {
    label,
    options,
    value,
    onchange,
  }: {
    label: string;
    options: Option[];
    value?: string;
    onchange: (value: string) => void;
  } = $props();
  
  // Track whether user selected "custom"
  let isCustom = $state(false);
  let customInput = $state('');
</script>
```

**Markup pattern** (standard form input + conditional custom text field):
```svelte
<label class="block">
  {label}
  <select onchange={(e) => {
    // Handle option change
  }} class="w-full p-2 border rounded">
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
      bind:value={customInput}
      class="w-full mt-2 p-2 border rounded"
    />
  {/if}
</label>
```

---

### `src/lib/components/ClassForm.svelte` (component, CRUD)

**Analog:** `src/lib/components/UpdateBanner.svelte`

Pattern: Interactive form component with `$state` runes for form fields, async Dexie operations, structured props.

**Script structure pattern** (inspired by UpdateBanner.svelte lines 2-17):
```svelte
<script lang="ts">
  import { db } from '../db/schema';
  import GlassCard from './GlassCard.svelte';
  import DropdownWithCustom from './DropdownWithCustom.svelte';
  import { generateClassName, autoSuffixOnCollision } from '../utils/classNameGenerator';
  import { strings } from '../i18n/strings.de';
  
  // Form state using $state runes
  let ageGroup = $state('');
  let bowType = $state('');
  let distance = $state('');
  let classNameOverride = $state('');
  
  // Derived suggested name from tuple
  let suggestedName = $derived(generateClassName(ageGroup, bowType, distance));
  let finalName = $derived(classNameOverride || suggestedName);
  
  // Dialog state
  let showConfirm = $state(false);
  let conflictName = $state('');
  
  async function saveClass() {
    const existing = await db.classes.where('name').equals(finalName).first();
    if (existing) {
      conflictName = finalName;
      showConfirm = true;
    } else {
      performSave();
    }
  }
  
  async function performSave() {
    await db.classes.add({
      name: finalName,
      ageGroup,
      bowType,
      distance,
    });
    // Reset form
    ageGroup = '';
    bowType = '';
    distance = '';
    classNameOverride = '';
  }
</script>
```

**Markup pattern** (form with dropdowns + custom inputs + submit button + confirmation dialog):
```svelte
<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">{strings.setup.classDefinition}</h3>
  
  <DropdownWithCustom
    label={strings.setup.ageGroup}
    options={/* from fixture */}
    bind:value={ageGroup}
  />
  
  <!-- Similar for bowType and distance -->
  
  <p class="text-sm text-gray-600">
    {strings.setup.classNameSuggestion}: <strong>{suggestedName}</strong>
  </p>
  
  <input
    type="text"
    placeholder={strings.setup.classNameOverride}
    bind:value={classNameOverride}
    class="w-full p-2 border rounded mb-4"
  />
  
  <button onclick={saveClass} class="px-4 py-2 bg-teal-500 text-white rounded">
    {strings.setup.save}
  </button>
  
  {#if showConfirm}
    <div class="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
      <p>{strings.setup.classExists(conflictName)}</p>
      <button onclick={performSave} class="mt-2 px-3 py-1 bg-yellow-600 text-white rounded">
        {strings.setup.overwrite}
      </button>
      <button onclick={() => showConfirm = false} class="mt-2 ml-2 px-3 py-1 bg-gray-400 text-white rounded">
        {strings.setup.cancel}
      </button>
    </div>
  {/if}
</GlassCard>
```

---

### `src/lib/components/ShooterForm.svelte` (component, CRUD)

**Analog:** `src/lib/components/ClassForm.svelte` (same form pattern, but for shooter registration)

Pattern: Form component with async Dexie save, field validation, class dropdown.

**Script structure pattern** (similar to ClassForm):
```svelte
<script lang="ts">
  import { db } from '../db/schema';
  import GlassCard from './GlassCard.svelte';
  import { strings } from '../i18n/strings.de';
  
  let shooterName = $state('');
  let selectedClassId = $state<number | null>(null);
  let selectedLineNum = $state<number | null>(null);
  
  // Reactive list of classes from Dexie
  const classes = liveQuery(async () => db.classes.toArray());
  let classList = $derived($_classes ?? []);
  
  async function saveShooter() {
    if (!shooterName || !selectedClassId) return; // Validation
    
    await db.shooters.add({
      classId: selectedClassId,
      name: shooterName,
      lineAssignment: selectedLineNum,
    });
    
    // Reset form
    shooterName = '';
    selectedClassId = null;
    selectedLineNum = null;
  }
</script>
```

**Markup pattern** (name input + class dropdown + optional line dropdown + submit):
```svelte
<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">{strings.registration.addShooter}</h3>
  
  <input
    type="text"
    placeholder={strings.registration.shooterName}
    bind:value={shooterName}
    class="w-full p-2 border rounded mb-4"
  />
  
  <select bind:value={selectedClassId} class="w-full p-2 border rounded mb-4">
    <option value={null}>{strings.registration.selectClass}</option>
    {#each classList as cls}
      <option value={cls.id}>{cls.name}</option>
    {/each}
  </select>
  
  <select bind:value={selectedLineNum} class="w-full p-2 border rounded mb-4">
    <option value={null}>{strings.registration.optionalLine}</option>
    {#each Array.from({length: lineCount}) as _, i}
      <option value={i + 1}>Linie {i + 1}</option>
    {/each}
  </select>
  
  <button onclick={saveShooter} class="px-4 py-2 bg-teal-500 text-white rounded">
    {strings.registration.addShooter}
  </button>
</GlassCard>
```

---

### `src/lib/components/PresetSave.svelte` (component, CRUD)

**Analog:** `src/lib/components/UpdateBanner.svelte` (dialog/confirmation pattern)

Pattern: Form component with confirmation dialog for collision handling.

**Script structure pattern** (inspired by UpdateBanner's conditional render + button handlers):
```svelte
<script lang="ts">
  import { db } from '../db/schema';
  import GlassCard from './GlassCard.svelte';
  import { strings } from '../i18n/strings.de';
  
  let presetName = $state('Mein Turnier');
  let showConfirm = $state(false);
  let conflictName = $state('');
  let presetCount = $state(0);
  
  // Reactive preset count check
  let presetCountDisplay = $derived.by(async () => {
    presetCount = await db.presets.count();
    return presetCount;
  });
  
  async function savePreset() {
    if (presetCount >= 8) {
      // Show error: max presets reached
      return;
    }
    
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
      createdAt: new Date(),
    });
    
    showConfirm = false;
  }
</script>
```

**Markup pattern** (input field + submission + confirmation dialog):
```svelte
<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">{strings.presets.savePreset}</h3>
  
  <input
    type="text"
    placeholder={strings.presets.presetName}
    bind:value={presetName}
    class="w-full p-2 border rounded mb-4"
  />
  
  <p class="text-sm text-gray-600 mb-4">
    {presetCount} / 8 {strings.presets.presetsUsed}
  </p>
  
  <button onclick={savePreset} class="px-4 py-2 bg-teal-500 text-white rounded">
    {strings.presets.save}
  </button>
  
  {#if showConfirm}
    <div class="mt-4 p-3 bg-yellow-100 border border-yellow-400 rounded">
      <p>{strings.presets.overwriteConfirm(conflictName)}</p>
      <button onclick={performSave} class="mt-2 px-3 py-1 bg-yellow-600 text-white rounded">
        {strings.presets.overwrite}
      </button>
      <button onclick={() => showConfirm = false} class="mt-2 ml-2 px-3 py-1 bg-gray-400 text-white rounded">
        {strings.presets.cancel}
      </button>
    </div>
  {/if}
</GlassCard>
```

---

### `src/lib/views/Setup.svelte` (view, CRUD)

**Analog:** `src/lib/views/SetupPlaceholder.svelte` (replace, same file path/purpose)

Pattern: Top-level view component that composes multiple sub-components (ClassForm, LineCountInput, SetupRounds, PresetSave).

**Script structure pattern:**
```svelte
<script lang="ts">
  import ClassForm from '../components/ClassForm.svelte';
  import LineCountInput from '../components/LineCountInput.svelte';
  import SetupRounds from './SetupRounds.svelte';
  import PresetSave from '../components/PresetSave.svelte';
  import { strings } from '../i18n/strings.de';
  
  // Reactive line count from DB
  const lineConfig = liveQuery(async () => {
    return db.shootingLines.get(1);
  });
  let lineCount = $derived($_lineConfig?.count ?? 2);
</script>

<div class="p-4 max-w-[480px] mx-auto">
  <h1 class="text-2xl font-bold mb-6">{strings.nav.setup}</h1>
  
  <section class="mb-6">
    <ClassForm />
  </section>
  
  <section class="mb-6">
    <LineCountInput bind:count={lineCount} />
  </section>
  
  <section class="mb-6">
    <SetupRounds />
  </section>
  
  <section class="mb-6">
    <PresetSave />
  </section>
</div>
```

---

### `src/lib/views/Registration.svelte` (view, CRUD)

**Analog:** `src/lib/views/RegistrationPlaceholder.svelte` (replace, same file path/purpose)

Pattern: Top-level view with ShooterForm and reactive shooter roster table showing AB/AB-CD mode.

**Script structure pattern:**
```svelte
<script lang="ts">
  import ShooterForm from '../components/ShooterForm.svelte';
  import { db } from '../db/schema';
  import { detectMode } from '../utils/modeDetection';
  import { strings } from '../i18n/strings.de';
  import { liveQuery } from 'dexie';
  
  // Reactive data sources
  const shooters = liveQuery(() => db.shooters.toArray());
  const lineConfig = liveQuery(() => db.shootingLines.get(1));
  
  let shooterList = $derived($_shooters ?? []);
  let lineCount = $derived($_lineConfig?.count ?? 2);
  let shooterCount = $derived(shooterList.length);
  let mode = $derived(detectMode(shooterCount, lineCount));
</script>

<div class="p-4 max-w-[720px] mx-auto">
  <h1 class="text-2xl font-bold mb-6">{strings.nav.registration}</h1>
  
  <div class="mb-6 p-3 bg-teal-100 dark:bg-teal-900 rounded">
    <p class="text-sm font-semibold">
      {strings.registration.mode}: <strong>{mode}</strong>
    </p>
    <p class="text-xs text-gray-600 dark:text-gray-300 mt-1">
      {mode === 'AB/CD'
        ? strings.registration.modeAbCdDescription
        : strings.registration.modeAbDescription}
    </p>
  </div>
  
  <section class="mb-6">
    <ShooterForm {lineCount} />
  </section>
  
  <section>
    <h2 class="text-lg font-bold mb-4">{strings.registration.registeredShooters}</h2>
    <table class="w-full">
      <!-- Shooter table markup: name, class, line, actions -->
    </table>
  </section>
</div>
```

---

### `src/lib/views/SetupRounds.svelte` (view, CRUD)

**Analog:** `src/lib/views/SetupPlaceholder.svelte` (view structure)

Pattern: View-level form component for rounds/passes configuration with WA preset radio buttons + custom configuration fields.

**Script structure pattern:**
```svelte
<script lang="ts">
  import { db } from '../db/schema';
  import { WA_PRESETS } from '../fixtures/waPresets';
  import GlassCard from '../components/GlassCard.svelte';
  import { strings } from '../i18n/strings.de';
  
  let selectedPreset = $state<string | null>(null);
  let customArrowsPerPasse = $state(3);
  let customPassesPerRound = $state(10);
  let customNumberOfRounds = $state(1);
  let customDistance = $state('18m');
  
  async function saveRoundConfig() {
    const config = selectedPreset
      ? WA_PRESETS.find(p => p.id === selectedPreset)
      : {
          arrowsPerPasse: customArrowsPerPasse,
          passesPerRound: customPassesPerRound,
          numberOfRounds: customNumberOfRounds,
          distance: customDistance,
        };
    
    await db.rounds.put({
      id: 1,
      ...config,
    });
  }
</script>

<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">{strings.setup.roundsConfig}</h3>
  
  <fieldset class="mb-6">
    <legend class="font-semibold">{strings.setup.selectPreset}</legend>
    {#each WA_PRESETS as preset}
      <label class="block mb-2">
        <input
          type="radio"
          name="preset"
          value={preset.id}
          bind:group={selectedPreset}
        />
        {preset.name} ({preset.totalArrows} Pfeile)
      </label>
    {/each}
    <label class="block mb-2">
      <input
        type="radio"
        name="preset"
        value={null}
        bind:group={selectedPreset}
      />
      {strings.setup.customConfig}
    </label>
  </fieldset>
  
  {#if selectedPreset === null}
    <!-- Custom config form fields -->
    <input type="number" placeholder={strings.setup.arrowsPerPasse} bind:value={customArrowsPerPasse} class="w-full p-2 border rounded mb-2" />
    <input type="number" placeholder={strings.setup.passesPerRound} bind:value={customPassesPerRound} class="w-full p-2 border rounded mb-2" />
    <input type="number" placeholder={strings.setup.numberOfRounds} bind:value={customNumberOfRounds} class="w-full p-2 border rounded mb-2" />
    <input type="text" placeholder={strings.setup.distance} bind:value={customDistance} class="w-full p-2 border rounded mb-2" />
  {/if}
  
  <button onclick={saveRoundConfig} class="px-4 py-2 bg-teal-500 text-white rounded">
    {strings.setup.save}
  </button>
</GlassCard>
```

---

### `src/lib/views/PresetList.svelte` (view, CRUD + export/import)

**Analog:** `src/lib/views/SetupPlaceholder.svelte` (view structure)

Pattern: View-level list component with load/delete/export/import actions.

**Script structure pattern:**
```svelte
<script lang="ts">
  import { db } from '../db/schema';
  import { exportDB, importDB } from 'dexie-export-import';
  import GlassCard from '../components/GlassCard.svelte';
  import { strings } from '../i18n/strings.de';
  
  const presets = liveQuery(() => db.presets.toArray());
  let presetList = $derived($_presets ?? []);
  
  async function loadPreset(presetId: number) {
    const preset = await db.presets.get(presetId);
    if (!preset) return;
    
    // Clear current setup and load preset
    await db.classes.clear();
    await db.classes.bulkAdd(preset.classes);
    await db.shootingLines.put({ id: 1, count: preset.shootingLineCount });
    await db.rounds.clear();
    await db.rounds.bulkAdd(preset.roundsConfig);
  }
  
  async function deletePreset(presetId: number) {
    await db.presets.delete(presetId);
  }
  
  async function exportPresets() {
    const blob = await exportDB(db);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presets-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function importPresetsFromFile(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const blob = new Blob([e.target?.result as ArrayBuffer]);
        await importDB(blob, { clearTablesBeforeImport: true });
        alert(strings.presets.importSuccess);
      } catch (err) {
        alert(strings.presets.importError);
      }
    };
    reader.readAsArrayBuffer(file);
  }
</script>

<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">{strings.presets.presetList}</h3>
  
  <div class="mb-4 flex gap-2">
    <button onclick={exportPresets} class="px-3 py-2 bg-blue-500 text-white rounded text-sm">
      {strings.presets.exportAll}
    </button>
    <input
      type="file"
      accept=".json"
      onchange={(e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) importPresetsFromFile(file);
      }}
      class="p-2 border rounded text-sm"
    />
  </div>
  
  {#if presetList.length === 0}
    <p class="text-gray-500">{strings.presets.noPresets}</p>
  {:else}
    <ul class="space-y-2">
      {#each presetList as preset (preset.id)}
        <li class="flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <div>
            <p class="font-semibold">{preset.name}</p>
            <p class="text-xs text-gray-600">{preset.classes.length} {strings.presets.classes}, {preset.roundsConfig.length} {strings.presets.rounds}</p>
          </div>
          <div class="flex gap-2">
            <button onclick={() => loadPreset(preset.id)} class="px-2 py-1 text-sm bg-teal-500 text-white rounded">
              {strings.presets.load}
            </button>
            <button onclick={() => deletePreset(preset.id)} class="px-2 py-1 text-sm bg-red-500 text-white rounded">
              {strings.presets.delete}
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</GlassCard>
```

---

### `src/lib/i18n/strings.de.ts` (config, reference-data)

**Analog:** `src/lib/i18n/strings.de.ts` (self, Phase 1 scaffold)

Pattern: Extend the existing strings export object with new nested sections for setup, registration, and presets.

**Current Phase 1 structure** (lines 3-20):
```typescript
export const strings = {
  appName,
  nav: { setup: 'Einrichtung', registration: 'Schützen', ... },
  updateBanner: { ... },
  placeholder: { ... },
  theme: { ... },
} as const;
```

**Phase 2 additions** (new sections to add):
```typescript
setup: {
  // Class definition
  classDefinition: 'Klasse definieren',
  ageGroup: 'Alter',
  bowType: 'Bogentyp',
  distance: 'Entfernung',
  classNameSuggestion: 'Vorschlag',
  classNameOverride: 'Oder Klasse umbenennen',
  classExists: (name: string) => `Klasse "${name}" existiert bereits.`,
  overwrite: 'Ja, überschreiben',
  
  // Line count
  shootingLineCount: 'Anzahl der Schießlinien',
  
  // Rounds/passes
  roundsConfig: 'Durchgänge und Passen konfigurieren',
  selectPreset: 'Voreinstellung wählen',
  customConfig: 'Benutzerdefinierte Konfiguration',
  arrowsPerPasse: 'Pfeile pro Passe',
  passesPerRound: 'Passen pro Durchgang',
  numberOfRounds: 'Anzahl der Durchgänge',
  distance: 'Entfernung (m)',
  
  save: 'Speichern',
  cancel: 'Abbrechen',
},

registration: {
  addShooter: 'Schützen hinzufügen',
  shooterName: 'Name des Schützen',
  selectClass: 'Klasse wählen',
  optionalLine: 'Linie (optional, wird sonst auto-zugewiesen)',
  registeredShooters: 'Registrierte Schützen',
  mode: 'Turnier-Modus',
  modeAbDescription: 'Bis 2 Schützen pro Linie teilen sich die Linie (A, B)',
  modeAbCdDescription: '4 Schützen pro Linie, zwei Durchgänge (A/B, C/D)',
},

presets: {
  savePreset: 'Preset speichern',
  presetName: 'Preset-Name',
  presetsUsed: 'Presets verwendet',
  overwriteConfirm: (name: string) => `Preset "${name}" existiert bereits. Überschreiben?`,
  presetList: 'Gespeicherte Presets',
  exportAll: 'Alle exportieren',
  importSuccess: 'Presets erfolgreich importiert',
  importError: 'Import fehlgeschlagen',
  noPresets: 'Noch keine Presets gespeichert',
  load: 'Laden',
  delete: 'Löschen',
  classes: 'Klassen',
  rounds: 'Durchgänge',
},
```

---

## Shared Patterns

### Svelte 5 Runes Pattern (All Components & Utilities)

**Source:** `src/lib/stores/theme.svelte.ts` and `src/lib/components/UpdateBanner.svelte`

**Apply to:** All new utility functions, components, and views using form state.

**Pattern:** Use `$state` for mutable form fields, `$derived` for computed properties (class names, mode detection), `$effect` for side effects (persistence, validation).

```svelte
<script lang="ts">
  let fieldValue = $state('');
  let computedValue = $derived(someFunction(fieldValue));
  
  // Or for complex derives
  let complexValue = $derived.by(() => {
    return computedValue.toUpperCase();
  });
</script>
```

### Dexie Database Queries (All Data-Accessing Components)

**Source:** `src/lib/db/schema.ts` + RESEARCH.md patterns

**Apply to:** ClassForm, ShooterForm, PresetSave, PresetList, Setup, Registration views

**Pattern:** Use `liveQuery()` for reactive queries, wrap in `$derived` for Svelte 5 integration.

```typescript
import { liveQuery } from 'dexie';

const classes = liveQuery(async () => db.classes.toArray());
let classList = $derived($_classes ?? []);

// For indexed queries
const result = await db.classes.where('name').equals(targetName).first();

// For bulk operations
await db.classes.bulkAdd(classArray);
```

### Form Validation & Error Handling (All Form Components)

**Source:** `src/lib/components/UpdateBanner.svelte` (conditional dialog pattern)

**Apply to:** ClassForm, ShooterForm, PresetSave

**Pattern:** Check for required fields before submit, show confirmation dialogs for destructive actions.

```typescript
async function saveForm() {
  if (!requiredField) return; // Silent validation
  
  const existing = await db.table.where('field').equals(value).first();
  if (existing) {
    showConfirm = true; // Show confirmation dialog
  } else {
    performSave();
  }
}
```

### GlassCard Wrapper (All Form & Dialog Components)

**Source:** `src/lib/components/GlassCard.svelte`

**Apply to:** ClassForm, ShooterForm, PresetSave, SetupRounds, PresetList

**Pattern:** Wrap all form/configuration components in `<GlassCard>` for consistent glass-effect styling.

```svelte
<GlassCard class="p-4">
  <h3 class="text-lg font-bold mb-4">Form Title</h3>
  <!-- Form content -->
</GlassCard>
```

### Dropdown with Custom Escape Hatch (All Dropdown Fields)

**Source:** `src/lib/components/DropdownWithCustom.svelte` + RESEARCH.md pattern

**Apply to:** Age group, bow type, distance fields in ClassForm

**Pattern:** Offer fixed dropdown options + "Other" option that reveals a text input.

```svelte
<DropdownWithCustom
  label="Field Label"
  options={[
    { value: 'RCV', label: 'Recurve' },
    { value: 'trad', label: 'trad. Recurve' },
  ]}
  bind:value={selectedValue}
  onchange={(v) => selectedValue = v}
/>
```

### Async Dexie Operations (All Data-Modifying Operations)

**Source:** RESEARCH.md code examples

**Apply to:** ClassForm, ShooterForm, PresetSave, PresetList (load/delete/export/import)

**Pattern:** Use try/catch for error handling, show user-friendly alerts.

```typescript
async function saveToDb() {
  try {
    await db.table.add({ /* data */ });
    // Success feedback (reset form, show toast, etc.)
  } catch (err) {
    console.error(err);
    // User-friendly error message
  }
}
```

### Export/Import with dexie-export-import (PresetList)

**Source:** RESEARCH.md code examples

**Apply to:** PresetList component (export/import actions)

**Pattern:** Export as Blob, import from file with optional clearTablesBeforeImport.

```typescript
import { exportDB, importDB } from 'dexie-export-import';

// Export
const blob = await exportDB(db);
const url = URL.createObjectURL(blob);
// trigger download via <a> tag

// Import
async function importFromFile(file: File) {
  await importDB(file, { clearTablesBeforeImport: true });
}
```

---

## No Analog Found

All Phase 2 files have established analogs in the Phase 1 codebase or RESEARCH.md patterns. No files require pattern borrowing from external references.

---

## Metadata

**Analog search scope:** `src/lib/` directory (db, stores, components, views, config, i18n)
**Files scanned:** 19 Phase 1 files
**Pattern extraction date:** 2026-07-04
**Confidence:** HIGH — all patterns are derived from established Phase 1 code or verified RESEARCH.md recommendations
