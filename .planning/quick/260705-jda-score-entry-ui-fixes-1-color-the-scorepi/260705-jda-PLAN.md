---
phase: quick-260705-jda
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/utils/scoreColor.ts
  - src/lib/utils/scoreColor.test.ts
  - src/lib/components/ScorePicker.svelte
  - src/lib/utils/scoreCompletion.ts
  - src/lib/utils/scoreCompletion.test.ts
  - src/lib/components/RoundPasseSelector.svelte
  - src/lib/views/ScoreEntry.svelte
  - src/lib/i18n/strings.de.ts
autonomous: true
requirements: [SCORE-01, SCORE-02, SCORE-04]

must_haves:
  truths:
    - "Tap-button picker colors X/10/9 yellow, 8/7 red, 6/5 blue, 4/3 black, 2/1 white, and keeps M visually distinct (gray, unchanged)"
    - "There is no separate '0' tap button in the picker — a miss is only ever entered via 'M'"
    - "A '>' advance button appears next to the Runde/Passe dropdowns only once every cell in the currently selected passe is filled, and clicking it moves to the next passe (or passe 1 of the next round, wrapping)"
    - "The advance button is absent/inert at the very last passe of the last round, and never appears once the tournament is finalized"
  artifacts:
    - path: "src/lib/utils/scoreColor.ts"
      provides: "scoreColorCategory(value) pure function mapping ScoreValue to WA target-face color category"
      exports: ["scoreColorCategory", "ScoreColorCategory"]
    - path: "src/lib/utils/scoreCompletion.ts"
      provides: "isPasseComplete(shooterIds, roundIndex, passeIndex, arrowsPerPasse, scores) pure function"
      contains: "export function isPasseComplete"
  key_links:
    - from: "src/lib/components/ScorePicker.svelte"
      to: "src/lib/utils/scoreColor.ts"
      via: "import { scoreColorCategory }"
      pattern: "scoreColorCategory"
    - from: "src/lib/views/ScoreEntry.svelte"
      to: "src/lib/utils/scoreCompletion.ts"
      via: "import { isPasseComplete }"
      pattern: "isPasseComplete"
    - from: "src/lib/views/ScoreEntry.svelte"
      to: "src/lib/components/RoundPasseSelector.svelte"
      via: "showAdvance/onAdvance props"
      pattern: "showAdvance"
---

<objective>
Fix three score-entry UI issues surfaced after Phase 3 shipped:
1. Recolor the `ScorePicker` tap buttons to follow the WA target-face convention (X/10/9 yellow, 8/7 red, 6/5 blue, 4/3 black, 2/1 white), keeping "M" (miss) as its own distinct color.
2. Remove the separate "0" tap button — a miss is only ever entered as "M".
3. Add a ">" advance button next to the Runde/Passe dropdowns that appears once every cell in the current passe is filled, advances to the next passe (wrapping into the next round), and hides at the very last passe of the last round.

Purpose: Make the tap-button picker visually match the physical WA target face the trainer is scoring against, eliminate a redundant/confusing input (0 vs M), and speed up passe-to-passe navigation during live entry.
Output: Recolored `ScorePicker.svelte`, a `scoreColorCategory` pure function (tested), a new `isPasseComplete` pure function (tested), and a wired advance button in `RoundPasseSelector`/`ScoreEntry`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Current ScoreValue type (src/lib/db/schema.ts) — '0' stays in the type for
minimal diff (no real tournament data uses '0' yet); only the picker UI drops the
button. -->
```typescript
export type ScoreValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'X' | 'M';
```

<!-- Existing pure functions in src/lib/utils/scoreCompletion.ts that Task 2 sits
alongside — follow this file's exact style (plain functions, no classes, comment
banner referencing decision/requirement IDs above each function). -->
```typescript
export function arrowScoreValue(value: ScoreValue): number { ... }
export function calculatePasseSum(values: ScoreValue[]): number { ... }
export function areAllScoresEntered(
  shooterIds: number[],
  numberOfRounds: number,
  passesPerRound: number,
  arrowsPerPasse: number,
  scores: ScoreRecord[]
): boolean { ... }
```

<!-- Current ScorePicker.svelte SCORE_VALUES array and buttonClass (Task 1 replaces
both) -->
```typescript
const SCORE_VALUES: ScoreValue[] = ['0','1','2','3','4','5','6','7','8','9','10','X','M'];

function buttonClass(value: ScoreValue): string {
  const base = 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[16px] font-semibold leading-[1.5]';
  if (value === 'X') return `${base} border border-amber-200 bg-amber-400 text-slate-900 hover:bg-amber-500 dark:border-amber-300/40 dark:bg-amber-500 dark:text-slate-900`;
  if (value === 'M') return `${base} border border-gray-200 bg-gray-300 text-slate-900 hover:bg-gray-400 dark:border-gray-400/40 dark:bg-gray-500 dark:text-slate-900`;
  return `${base} bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300`;
}
```

<!-- Current RoundPasseSelector.svelte props (Task 3 adds showAdvance/onAdvance) -->
```typescript
let {
  numberOfRounds, passesPerRound, selectedRound, selectedPasse, disabled,
  onRoundChange, onPasseChange,
}: {
  numberOfRounds: number; passesPerRound: number; selectedRound: number;
  selectedPasse: number; disabled: boolean;
  onRoundChange: (index: number) => void; onPasseChange: (index: number) => void;
} = $props();
```

<!-- ScoreEntry.svelte relevant state (Task 3 adds derived values + handler around
this) -->
```typescript
let selectedRound = $state(0);
let selectedPasse = $state(0);
let isFinalized = $derived(allScores.length > 0 && allScores.every((s) => s.finalized));
// roundsConfig: RoundConfig | undefined — has numberOfRounds, passesPerRound, arrowsPerPasse
// shooters: ShooterRecord[] — has .id
// allScores: ScoreRecord[] — has shooterId, roundIndex, passeIndex, arrowIndex
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: WA target-face colors + remove the "0" tap button</name>
  <files>src/lib/utils/scoreColor.ts, src/lib/utils/scoreColor.test.ts, src/lib/components/ScorePicker.svelte</files>
  <behavior>
    - scoreColorCategory('X') -> 'yellow'; scoreColorCategory('10') -> 'yellow'; scoreColorCategory('9') -> 'yellow'
    - scoreColorCategory('8') -> 'red'; scoreColorCategory('7') -> 'red'
    - scoreColorCategory('6') -> 'blue'; scoreColorCategory('5') -> 'blue'
    - scoreColorCategory('4') -> 'black'; scoreColorCategory('3') -> 'black'
    - scoreColorCategory('2') -> 'white'; scoreColorCategory('1') -> 'white'
    - scoreColorCategory('M') -> 'miss'
  </behavior>
  <action>
    Create src/lib/utils/scoreColor.ts exporting `ScoreColorCategory` (union type: 'yellow' | 'red' | 'blue' | 'black' | 'white' | 'miss') and `scoreColorCategory(value: ScoreValue): ScoreColorCategory`, following scoreCompletion.ts's file style (plain function, no framework imports, comment banner citing this quick task and the WA convention). '0' has no dedicated branch — let it fall through to the 'white' default alongside '1'/'2', since it's unreachable from the UI after this task but must stay assignable per the ScoreValue type.

    In ScorePicker.svelte: remove `'0'` from the `SCORE_VALUES` array (leaves 1-10, X, M = 12 buttons). Replace `buttonClass` to switch on `scoreColorCategory(value)` instead of the current `if (value === 'X') / if (value === 'M') / else` numeric-teal branches: 'yellow' keeps the current X styling (amber-400/amber-500 with slate-900 text), 'miss' keeps the current M styling unchanged (gray-300/gray-500 with slate-900 text — do not alter M's appearance), 'red' uses red-500/red-600 with white text, 'blue' uses blue-500/blue-600 with white text, 'black' uses slate-900/slate-950 with white text (dark-mode-safe on a dark background — do not use pure `black`), 'white' uses a white/slate-100 background with slate-900 text and a visible slate-300 border (so the button doesn't disappear against the picker's own light-mode background). Keep the same base classes (min-h-[44px], min-w-[44px], rounded-lg, font-semibold) and the existing `border` treatment per color, matching the current file's Tailwind class-string conventions (light class + `dark:` variant pair on every color branch).

    Import `scoreColorCategory` from `../utils/scoreColor` in ScorePicker.svelte. Do not change `ariaLabelFor`, the ScoreValue type in schema.ts, or the picker's grid/layout markup.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/utils/scoreColor.test.ts</automated>
  </verify>
  <done>scoreColor.test.ts passes covering all 12 non-M values plus M; ScorePicker.svelte renders 12 buttons (1-10, X, M) with no "0" button, colored per the WA mapping, and M is visually unchanged from before.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Per-passe completion check</name>
  <files>src/lib/utils/scoreCompletion.ts, src/lib/utils/scoreCompletion.test.ts</files>
  <behavior>
    - isPasseComplete([], 0, 0, 3, []) -> true (vacuously true, no shooters)
    - isPasseComplete([1], 0, 0, 2, [record for round0/passe0/arrow0, record for round0/passe0/arrow1]) -> true
    - isPasseComplete([1], 0, 0, 2, [record for round0/passe0/arrow0 only]) -> false
    - isPasseComplete([1], 0, 1, 2, [two records for round0/passe0]) -> false (records belong to a different passe, passe 1 has none)
    - isPasseComplete([1, 2], 0, 0, 1, [record for shooter 1 only]) -> false (shooter 2 missing)
  </behavior>
  <action>
    Add `isPasseComplete(shooterIds: number[], roundIndex: number, passeIndex: number, arrowsPerPasse: number, scores: ScoreRecord[]): boolean` to scoreCompletion.ts, placed after `areAllScoresEntered` with a comment banner explaining it is the single-passe counterpart used to gate the new advance button (distinct from `areAllScoresEntered`'s whole-tournament check used for "Abschließen"). Implementation: build a `Set` of `${shooterId}-${arrowIndex}` keys from `scores` filtered to the given `roundIndex`/`passeIndex`, then loop `shooterIds` x `arrowIndex` in `[0, arrowsPerPasse)` checking every key exists in the set — same structural pattern as `areAllScoresEntered` but scoped to one round/passe instead of iterating all rounds/passes.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/utils/scoreCompletion.test.ts</automated>
  </verify>
  <done>isPasseComplete is exported from scoreCompletion.ts and scoreCompletion.test.ts covers the vacuous-true, complete, incomplete-arrow, wrong-passe, and missing-shooter cases.</done>
</task>

<task type="auto">
  <name>Task 3: Wire the ">" advance button into Runde/Passe navigation</name>
  <files>src/lib/components/RoundPasseSelector.svelte, src/lib/views/ScoreEntry.svelte, src/lib/i18n/strings.de.ts</files>
  <action>
    In strings.de.ts, add `advanceButtonAria: 'Nächste Passe'` inside the existing `scoring` section (near `passeLabel`), as the accessible name for the new button — the visible button label stays the literal ">" character.

    In RoundPasseSelector.svelte, add two required props: `showAdvance: boolean` and `onAdvance: () => void`. Change the outer container class from `flex flex-col gap-4 md:flex-row` to `flex flex-col gap-4 md:flex-row md:items-end` so the button aligns with the bottom of the dropdowns on wider screens. After the Passe `<label>` block, conditionally render (guarded by `{#if showAdvance}`) a `<button type="button">` with `aria-label={strings.scoring.advanceButtonAria}`, `onclick={onAdvance}`, visible text `>`, and classes matching the app's primary-action button style (min-h-[44px] min-w-[44px], rounded-lg, teal-500/teal-600 background with white text, teal-400/teal-300 in dark mode — same palette already used for the "Turnier abschließen" button in ScoreEntry.svelte).

    In ScoreEntry.svelte, import `isPasseComplete` from `../utils/scoreCompletion` alongside the existing `calculatePasseSum, areAllScoresEntered` import. Add three derived values after `isComplete`: `currentPasseComplete` (calls `isPasseComplete(shooters.map((s) => s.id!), selectedRound, selectedPasse, roundsConfig.arrowsPerPasse, allScores)`, `false` when `!roundsConfig`), `isLastPasseOfTournament` (`selectedRound === roundsConfig.numberOfRounds - 1 && selectedPasse === roundsConfig.passesPerRound - 1`, `false` when `!roundsConfig`), and `showAdvanceButton` (`!isFinalized && currentPasseComplete && !isLastPasseOfTournament`). Add a `handleAdvance()` function: guard on `roundsConfig` existing, then if `selectedPasse < roundsConfig.passesPerRound - 1` increment `selectedPasse`, else reset `selectedPasse = 0` and increment `selectedRound`. Pass `showAdvance={showAdvanceButton}` and `onAdvance={handleAdvance}` to the existing `<RoundPasseSelector>` element.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/views/ScoreEntry.test.ts && npm run check</automated>
  </verify>
  <done>Advance button is absent when the current passe has any empty cell or when finalized; appears once every cell in the current passe is filled; clicking it moves to the next passe (or wraps to passe 1 of the next round); it is absent at the very last passe of the very last round. Existing ScoreEntry.test.ts suite and svelte-check both still pass. Manual UAT by the user covers the interactive advance flow itself, per this task's scope note.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None crossed — this is a pure client-side UI/styling and local-state-navigation change with no new external input, network call, or dependency install.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260705jda-01 | Tampering | ScoreValue type retains unreachable '0' | accept | '0' is no longer reachable via the UI (no tap button); no user input path can produce it, and it was never persisted in real tournament data — no risk introduced. |
</threat_model>

<verification>
Run the full unit suite and type-check after all three tasks:
```
cd /home/code/MeinBogenturnier && npm run test && npm run check
```
Manually verify in the running app (`npm run dev`): open Erfassung, tap a cell, confirm the picker shows 12 buttons (1-10, X, M) colored per the WA face, no "0" button, M still gray. Fill every cell in the current passe and confirm a ">" button appears next to Runde/Passe; click it and confirm it advances to the next passe/round; confirm it disappears at the last passe of the last round and after Abschließen.
</verification>

<success_criteria>
- `npm run test` passes, including new scoreColor.test.ts and scoreCompletion.test.ts additions.
- `npm run check` passes (no type errors from the RoundPasseSelector prop additions or ScorePicker changes).
- ScorePicker.svelte has no "0" button and colors buttons per the WA target-face convention; M is unchanged.
- ScoreEntry.svelte shows a ">" advance button next to the Runde/Passe dropdowns exactly when the current passe is fully filled, not finalized, and not at the very last passe of the last round.
</success_criteria>

<output>
Create `.planning/quick/260705-jda-score-entry-ui-fixes-1-color-the-scorepi/260705-jda-SUMMARY.md` when done
</output>
