---
phase: quick-260705-lpv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/utils/scoreAdvance.ts
  - src/lib/utils/scoreAdvance.test.ts
  - src/lib/components/ScorePicker.svelte
  - src/lib/i18n/strings.de.ts
  - src/lib/views/ScoreEntry.svelte
autonomous: true
requirements: [SCORE-01, SCORE-04]

must_haves:
  truths:
    - "The score-picker dialog title shows the archer's name, e.g. 'Punkte von Anna' instead of the generic 'Punktzahl wählen'"
    - "After selecting a score, the picker automatically reopens at the next empty arrow: remaining empty arrows in the same shooter's row first (left-to-right), then the first empty arrow of the next shooter's row in the currently displayed/sorted table order; it never wraps back to an earlier row"
    - "When a forward-only scan finds no next empty arrow, the picker closes instead of reopening"
    - "Clicking the dialog backdrop (outside the picker card) cancels/closes the picker without writing a score, same as Escape or the Abbrechen button"
  artifacts:
    - path: "src/lib/utils/scoreAdvance.ts"
      provides: "findNextEmptyArrow(rows, arrowsPerPasse, currentShooterId, currentArrowIndex, isFilled) pure function"
      exports: ["findNextEmptyArrow"]
    - path: "src/lib/components/ScorePicker.svelte"
      provides: "shooterName prop driving the dialog title; backdrop onclick={oncancel} with stopPropagation on the inner content wrapper"
      contains: "shooterName"
    - path: "src/lib/views/ScoreEntry.svelte"
      provides: "shooter-name resolution for the open picker cell + auto-advance wiring in handleScoreSelect"
      contains: "findNextEmptyArrow"
  key_links:
    - from: "src/lib/views/ScoreEntry.svelte"
      to: "src/lib/utils/scoreAdvance.ts"
      via: "import { findNextEmptyArrow }"
      pattern: "findNextEmptyArrow"
    - from: "src/lib/views/ScoreEntry.svelte"
      to: "src/lib/components/ScorePicker.svelte"
      via: "shooterName prop"
      pattern: "shooterName="
    - from: "src/lib/components/ScorePicker.svelte"
      to: "src/lib/i18n/strings.de.ts"
      via: "strings.scoring.pickerTitle(shooterName)"
      pattern: "pickerTitle("
---

<objective>
Three UX improvements to the score-entry tap-button picker dialog (`ScorePicker.svelte` + its host `ScoreEntry.svelte`):
1. Show the archer's name in the dialog title ("Punkte von {name}" instead of the generic "Punktzahl wählen").
2. Auto-advance the picker after each selection — fill the current shooter's row left-to-right for the current passe, then jump to the first empty arrow of the next shooter's row in the currently displayed/sorted table order; close the dialog once a forward-only scan finds nothing left.
3. Let a backdrop click cancel/close the dialog, same as Escape/Abbrechen — no score written.

Purpose: Speed up live tap-entry at the range (no manual re-tap of every cell) and make each dialog open unambiguous about which archer it belongs to.
Output: A tested pure `findNextEmptyArrow` helper, an updated `ScorePicker.svelte` (title prop + dismissible backdrop), and `ScoreEntry.svelte` wiring that resolves the archer name and drives auto-advance.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- ScoreRow type (src/lib/components/ScoreTable.svelte) — `rows` in ScoreEntry.svelte
is ScoreRow[], already sorted per the active sortBy/sortDir. -->
```typescript
export interface ScoreRow {
  shooterId: number;
  name: string;
  className: string;
  line: number | null;
  arrows: (ScoreValue | null)[];
  sum: number | null;
}
```

<!-- Current ScorePicker.svelte props + title + outer overlay (Task 2 modifies both) -->
```typescript
let {
  open,
  onselect,
  oncancel,
}: {
  open: boolean;
  onselect: (value: ScoreValue) => void;
  oncancel: () => void;
} = $props();
```
```svelte
<!-- current outer overlay has no click handler; comment above props block calls the
dialog "Non-dismissible by backdrop click" — that comment must be updated/removed -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
  <GlassCard class="w-full max-w-[360px] p-6">
    <div role="dialog" aria-modal="true" aria-labelledby="score-picker-title">
      <h2 id="score-picker-title" class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.scoring.pickerTitle}
      </h2>
      ...
```

<!-- strings.de.ts scoring section — pickerAriaNumeric already shows the exact
template-function pattern pickerTitle must follow -->
```typescript
scoring: {
  ...
  pickerTitle: 'Punktzahl wählen',
  pickerCancel: 'Abbrechen',
  pickerAriaMiss: 'Fehlschuss (0 Punkte)',
  pickerAriaX: 'X-Ring (10 Punkte)',
  pickerAriaNumeric: (value: string) => `${value} Punkte`,
  ...
}
```

<!-- ScoreEntry.svelte current pickerCell state + handleScoreSelect (Task 3 modifies
handleScoreSelect and adds a shooterName-resolution derived value; `shooters` is the
raw unsorted ShooterRecord[] array already loaded via liveQuery) -->
```typescript
let pickerCell = $state<{ shooterId: number; arrowIndex: number } | null>(null);

let currentPasseScoreByKey = $derived(
  new Map(
    allScores
      .filter((s) => s.roundIndex === selectedRound && s.passeIndex === selectedPasse)
      .map((s) => [`${s.shooterId}-${s.arrowIndex}`, s.value])
  )
);

function handleScoreSelect(value: ScoreValue) {
  if (!pickerCell) return;
  const { shooterId, arrowIndex } = pickerCell;
  pickerCell = null;
  // D-06: deliberately no `await` — autosave must be non-blocking.
  db.scores
    .put({ shooterId, roundIndex: selectedRound, passeIndex: selectedPasse, arrowIndex, value, finalized: false })
    .catch((err) => { errorFeedback = strings.common.saveError.replace('{error}', err instanceof Error ? err.message : String(err)); });
}

function cancelPicker() {
  pickerCell = null;
}
```
```svelte
<ScorePicker open={pickerCell !== null} onselect={handleScoreSelect} oncancel={cancelPicker} />
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Forward-only "next empty arrow" scan helper</name>
  <files>src/lib/utils/scoreAdvance.ts, src/lib/utils/scoreAdvance.test.ts</files>
  <behavior>
    - Same-row remaining arrow: rows=[{shooterId:1},{shooterId:2}], arrowsPerPasse=3, isFilled only true for '1-0', currentShooterId=1, currentArrowIndex=0 -> returns {shooterId:1, arrowIndex:1}
    - Current row now complete, next row has an empty arrow at index 0: isFilled true for '1-0','1-1','1-2', currentShooterId=1, currentArrowIndex=2 -> returns {shooterId:2, arrowIndex:0}
    - Skips a fully-filled next row and continues to the following row: rows=[{shooterId:1},{shooterId:2},{shooterId:3}], isFilled true for all of shooter 1 and shooter 2, currentShooterId=1, currentArrowIndex=2 -> returns {shooterId:3, arrowIndex:0}
    - Next row's first empty arrow is not at index 0: isFilled true for '1-0','1-1','1-2','2-0' only, currentShooterId=1, currentArrowIndex=2 -> returns {shooterId:2, arrowIndex:1}
    - No empty arrow anywhere forward -> returns null: rows=[{shooterId:1},{shooterId:2}], isFilled true for every '2-*' cell, currentShooterId=2, currentArrowIndex=2 -> returns null
    - Never wraps back to an earlier row: rows=[{shooterId:1},{shooterId:2}], shooter 1 has an empty arrow at index 0 (isFilled false for '1-0'), shooter 2 fully filled, currentShooterId=2, currentArrowIndex=2 -> returns null (must NOT return shooter 1's empty arrow)
  </behavior>
  <action>
    Create src/lib/utils/scoreAdvance.ts, following scoreCompletion.ts's file style (plain function, no framework imports, comment banner citing this quick task and the forward-only-scan requirement). Export `findNextEmptyArrow(rows: Pick&lt;ScoreRow, 'shooterId'&gt;[], arrowsPerPasse: number, currentShooterId: number, currentArrowIndex: number, isFilled: (shooterId: number, arrowIndex: number) => boolean): { shooterId: number; arrowIndex: number } | null`, importing `ScoreRow`'s type-only from `../components/ScoreTable.svelte` (matching sortComparators.ts's existing import pattern from that same module).

    Implementation: find the index of `currentShooterId` within `rows` (`rows.findIndex`); if not found, return null. First scan arrow indices from `currentArrowIndex + 1` up to `arrowsPerPasse - 1` on the current row — return the first index where `isFilled(currentShooterId, index)` is false. If none found, scan `rows` strictly AFTER the current row's index, in order; for each such row scan arrow indices `0` to `arrowsPerPasse - 1` and return the first `{shooterId: row.shooterId, arrowIndex}` where `isFilled` is false for that row. If no later row has any empty arrow, return null. Do not iterate rows before the current row's index under any circumstance — this is the forward-only guarantee.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/utils/scoreAdvance.test.ts</automated>
  </verify>
  <done>scoreAdvance.test.ts passes covering same-row-remaining, next-row-first-empty, skip-a-full-row, next-row-gap-not-at-index-0, no-match-anywhere, and no-wrap-back-to-earlier-row cases.</done>
</task>

<task type="auto">
  <name>Task 2: Archer-name dialog title + backdrop-dismiss on ScorePicker</name>
  <files>src/lib/components/ScorePicker.svelte, src/lib/i18n/strings.de.ts</files>
  <action>
    In strings.de.ts, change `pickerTitle` from the plain string `'Punktzahl wählen'` to a template function following the exact pattern already used by `pickerAriaNumeric` immediately below it: `pickerTitle: (name: string) => \`Punkte von ${name}\``. Keep it in the same position in the `scoring` object; do not rename any other key.

    In ScorePicker.svelte, add a required prop `shooterName: string` alongside the existing `open`/`onselect`/`oncancel` props, and change the `<h2>` to render `{strings.scoring.pickerTitle(shooterName)}` instead of the current plain `{strings.scoring.pickerTitle}`.

    Add backdrop-dismiss: on the outer `fixed inset-0 ... bg-black/50` div, add `onclick={oncancel}`. Wrap the existing `<GlassCard class="w-full max-w-[360px] p-6">...</GlassCard>` in a new inner wrapper div with `onclick={(event) => event.stopPropagation()}` so clicks on the dialog content (buttons, card background) do not bubble up to the backdrop and trigger cancel. GlassCard itself does not forward arbitrary event listeners (no prop spreading in GlassCard.svelte), so the stopPropagation handler must live on this new wrapper div, not on GlassCard directly.

    Update the file's top comment banner: it currently states the dialog is "Non-dismissible by backdrop click — matches ConfirmDialog.svelte's overlay pattern". Replace that clause to state ScorePicker is now backdrop-dismissible (unlike ConfirmDialog, which stays non-dismissible because it guards destructive/overwriting actions) — keep the rest of the banner's Escape-key rationale intact. Do not touch ConfirmDialog.svelte.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npm run check</automated>
  </verify>
  <done>ScorePicker.svelte requires and renders a shooterName prop in its title via strings.scoring.pickerTitle(shooterName); clicking the backdrop calls oncancel; clicking anywhere inside the card (buttons, empty card padding) does not call oncancel; svelte-check passes with no type errors from the new required prop.</done>
</task>

<task type="auto">
  <name>Task 3: Wire archer name + auto-advance into ScoreEntry</name>
  <files>src/lib/views/ScoreEntry.svelte</files>
  <action>
    Import `findNextEmptyArrow` from `../utils/scoreAdvance`.

    Add a derived value resolving the currently-open cell's archer name: `let pickerShooterName = $derived(pickerCell ? (shooters.find((s) => s.id === pickerCell.shooterId)?.name ?? '') : '')`, placed near the existing `pickerCell` declaration. Pass it to the picker: `<ScorePicker open={pickerCell !== null} shooterName={pickerShooterName} onselect={handleScoreSelect} oncancel={cancelPicker} />`.

    Rewrite `handleScoreSelect` to auto-advance instead of always closing: capture `const { shooterId, arrowIndex } = pickerCell` (guard on `!pickerCell || !roundsConfig` returning early, same as today), keep the existing fire-and-forget `db.scores.put(...).catch(...)` call unchanged (still no `await`). Before nulling/reassigning `pickerCell`, build a local `justPickedKey = \`${shooterId}-${arrowIndex}\`` and an `isFilled` closure: `(sId, aIdx) => { const key = \`${sId}-${aIdx}\`; return key === justPickedKey || currentPasseScoreByKey.has(key); }` — this compensates for `currentPasseScoreByKey` (derived from the async liveQuery) not yet reflecting the value just written. Call `findNextEmptyArrow(rows, roundsConfig.arrowsPerPasse, shooterId, arrowIndex, isFilled)` and assign its result directly to `pickerCell` (a match reopens the picker at that cell; `null` closes it) — replacing the old unconditional `pickerCell = null` line.

    Do not change `cancelPicker`, the `db.scores.put` payload shape, `currentPasseScoreByKey`'s own derivation, or anything about sorting/`rows` construction.
  </action>
  <verify>
    <automated>cd /home/code/MeinBogenturnier && npx vitest run src/lib/views/ScoreEntry.test.ts && npm run check</automated>
  </verify>
  <done>Picker dialog title reads "Punkte von {name}" for the tapped shooter; selecting a score for a non-last arrow in a row reopens the picker at the next arrow in that same row; completing a row's last arrow reopens the picker at the first empty arrow of the next row in current sort order; completing the very last empty arrow closes the dialog; existing ScoreEntry.test.ts suite and svelte-check both still pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None crossed — this is a pure client-side UI/interaction change (dialog title, auto-advance navigation, backdrop click) with no new external input, network call, or dependency install.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260705lpv-01 | Tampering | ScorePicker backdrop-dismiss discards a pending (unselected) score without confirmation | accept | No data is written on cancel either way (cancel/backdrop only ever discards a NOT-YET-selected value); the trainer can simply re-tap the cell. Matches the existing Escape/Abbrechen behavior this change is made consistent with. |
</threat_model>

<verification>
Run the full unit suite and type-check after all three tasks:
```
cd /home/code/MeinBogenturnier && npm run test && npm run check
```
Manually verify in the running app (`npm run dev`): open Erfassung, tap a cell — confirm the dialog title reads "Punkte von {archer name}". Select a score for an arrow that is not the last in its row — confirm the picker immediately reopens on the next arrow of the same row. Fill the last arrow of a row — confirm it reopens on the first empty arrow of the next row in the current sort order (try after re-sorting by a different column). Fill the very last empty arrow anywhere — confirm the dialog closes instead of reopening. Click outside the dialog card (on the dark backdrop) — confirm it closes with no score written, same as pressing Escape or Abbrechen.
</verification>

<success_criteria>
- `npm run test` passes, including the new scoreAdvance.test.ts.
- `npm run check` passes (no type errors from the new required `shooterName` prop or the `findNextEmptyArrow` import).
- ScorePicker's title shows the archer's name; clicking its backdrop cancels/closes without writing a score.
- Selecting a score auto-advances the picker to the next empty arrow using the forward-only same-row-then-next-rows scan, and closes when none remains.
</success_criteria>

<output>
Create `.planning/quick/260705-lpv-score-entry-dialog-ux-improvements-1-sho/260705-lpv-SUMMARY.md` when done
</output>
