<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Target } from '@lucide/svelte';
  import { db } from '../db/schema';
  import type { ScoreValue } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import {
    calculatePasseSum,
    areAllScoresEntered,
    isPasseComplete,
    findFirstIncompletePasse,
    computeIsFinalized,
  } from '../utils/scoreCompletion';
  import { findNextEmptyArrowInRow } from '../utils/scoreAdvance';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import RoundPasseSelector from '../components/RoundPasseSelector.svelte';
  import ScoreTable from '../components/ScoreTable.svelte';
  import type { ScoreRow } from '../components/ScoreTable.svelte';
  import ArcherScoreCard from '../components/ArcherScoreCard.svelte';
  import type { ArcherScoreCardRow } from '../components/ArcherScoreCard.svelte';
  import ScorePicker from '../components/ScorePicker.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import { sortRows } from '../utils/sortComparators';
  import type { SortColumn, SortDirection } from '../utils/sortComparators';
  import { playConfirmTone } from '../utils/scoreFeedback';

  // Score entry vertical slice (03-01-PLAN.md Task 2, SCORE-01/02/03/05). Loads the
  // full scores table (not scoped to the current round/passe) and filters in-memory —
  // matches 03-RESEARCH.md's recommendation over scoped Dexie `.where()` queries.
  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let shooters = $derived($shootersQuery ?? []);

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);
  let classNameById = $derived(new Map(classes.map((c) => [c.id, c.name])));

  const roundsQuery = liveQuery(() => db.rounds.get(1));
  let roundsConfig = $derived($roundsQuery);

  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);

  // 3D-/Feldturnier support: 'byRound' keeps the classic all-shooters-per-Passe table;
  // 'byArcherLine'/'byArcherName' switch to a single-archer whole-scorecard layout
  // (see ArcherScoreCard.svelte). The mode is chosen on the Einrichtung tab and stored
  // on the rounds singleton; undefined means the classic layout.
  let entryMode = $derived(roundsConfig?.entryMode ?? 'byRound');

  // Single flat lookup of every score by its full cell coordinate, used by both
  // layouts. Cheap even for a large tournament (a few thousand entries).
  const cellKey = (shooterId: number, r: number, p: number, a: number) =>
    `${shooterId}-${r}-${p}-${a}`;
  let allScoreByKey = $derived(
    new Map(
      allScores.map((s) => [cellKey(s.shooterId, s.roundIndex, s.passeIndex, s.arrowIndex), s.value])
    )
  );

  let selectedRound = $state(0);
  let selectedPasse = $state(0);
  // Single-archer layout: which archer's card is currently shown. Initialised by the
  // effect below to the first archer with an incomplete card once data has loaded.
  let selectedShooterId = $state<number | null>(null);
  // Quick task 260710-erfassung-jump-to-blank: tracks whether the one-shot initial
  // jump to the first incomplete round/passe has already run, so it never fires
  // again after mount (manual navigation and subsequent liveQuery updates to
  // allScores must not retrigger it).
  let hasAppliedInitialJump = $state(false);
  let pickerCell = $state<{
    shooterId: number;
    roundIndex: number;
    passeIndex: number;
    arrowIndex: number;
    wasFilled: boolean;
  } | null>(null);
  // Quick task 260705-ok7: accumulates every pick made during the current
  // row-filling session so the title preview can show them before
  // currentPasseScoreByKey (async liveQuery) catches up. Reset on every session
  // boundary (openPicker/cancelPicker) — never reset when reopening for the next
  // arrow of the same row.
  let justPickedValues = $state(new Map<string, ScoreValue>());
  // Quick task 260705-lpv: resolves the archer name for the currently-open picker
  // cell, driving ScorePicker's dialog title.
  let pickerShooterName = $derived.by(() => {
    const cell = pickerCell;
    if (!cell) return '';
    return shooters.find((s) => s.id === cell.shooterId)?.name ?? '';
  });
  // Quick task 260705-ok7: live per-arrow preview of the current picker row, feeding
  // ScorePicker's rowPreview prop and its title preview text.
  let pickerRowPreview: (ScoreValue | null)[] = $derived.by(() => {
    const cell = pickerCell;
    if (!cell || !roundsConfig) return [];
    const preview: (ScoreValue | null)[] = [];
    for (let i = 0; i < roundsConfig.arrowsPerPasse; i++) {
      const key = cellKey(cell.shooterId, cell.roundIndex, cell.passeIndex, i);
      preview.push(
        justPickedValues.get(key) ?? (allScoreByKey.get(key) as ScoreValue | undefined) ?? null
      );
    }
    return preview;
  });
  let errorFeedback = $state('');

  // Bumped on every registered score tap to retrigger the confirmation flash overlay
  // below (see the {#key flashToken} block) — a plain boolean toggle wouldn't replay
  // the CSS animation for two consecutive taps of the same parity.
  let flashToken = $state(0);

  // SCORE-04: ephemeral (non-persisted) column-header sort state — reloading the app
  // resets to the default (by Linie, ascending); never written to Dexie.
  let sortBy = $state<SortColumn>('line');
  let sortDir = $state<SortDirection>('asc');

  // D-09: the trainer only sees the tournament as "finalized" once every score record
  // has finalized: true. Vacuously false when there are no records yet. 04-03-PLAN.md
  // Task 1: delegates to the shared computeIsFinalized (single source of truth) rather
  // than re-deriving the expression inline.
  let isFinalized = $derived(computeIsFinalized(allScores));

  // D-09: distinct from isFinalized above — isComplete gates whether Abschließen is
  // enabled (every shooter x round x passe x arrow has a value); isFinalized reflects
  // whether the trainer has already confirmed the permanent lock.
  let isComplete = $derived(
    roundsConfig && shooters.length > 0
      ? areAllScoresEntered(
          shooters.map((s) => s.id!),
          roundsConfig.numberOfRounds,
          roundsConfig.passesPerRound,
          roundsConfig.arrowsPerPasse,
          allScores
        )
      : false
  );

  let finalizeDialogOpen = $state(false);

  // Quick task 260705-jda: gates the ">" advance button next to Runde/Passe — shown
  // once the current passe is fully filled, hidden once finalized or at the very
  // last passe of the last round (nowhere left to advance to).
  let currentPasseComplete = $derived(
    roundsConfig
      ? isPasseComplete(
          shooters.map((s) => s.id!),
          selectedRound,
          selectedPasse,
          roundsConfig.arrowsPerPasse,
          allScores
        )
      : false
  );

  let isLastPasseOfTournament = $derived(
    roundsConfig
      ? selectedRound === roundsConfig.numberOfRounds - 1 &&
          selectedPasse === roundsConfig.passesPerRound - 1
      : false
  );

  let showAdvanceButton = $derived(
    !isFinalized && currentPasseComplete && !isLastPasseOfTournament
  );

  let rows: ScoreRow[] = $derived.by(() => {
    if (!roundsConfig) return [];

    const built = shooters.map((shooter): ScoreRow => {
      const arrows: (ScoreValue | null)[] = [];
      for (let i = 0; i < roundsConfig.arrowsPerPasse; i++) {
        arrows.push(
          (allScoreByKey.get(
            cellKey(shooter.id as number, selectedRound, selectedPasse, i)
          ) as ScoreValue) ?? null
        );
      }
      const sum = arrows.every((a) => a !== null)
        ? calculatePasseSum(arrows as ScoreValue[], roundsConfig.rings ?? 10)
        : null;

      return {
        shooterId: shooter.id as number,
        name: shooter.name,
        className: classNameById.get(shooter.classId) ?? '',
        line: shooter.lineAssignment ?? null,
        arrows,
        sum,
      };
    });

    return sortRows(built, sortBy, sortDir);
  });

  // ---- Single-archer scorecard layout (entryMode 'byArcherLine' / 'byArcherName') ----

  // Archer picker order: by Schießplatz (unassigned last, name as tie-breaker) or
  // alphabetically by name.
  let orderedShooters = $derived.by(() => {
    const list = [...shooters];
    if (entryMode === 'byArcherName') {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list.sort((a, b) => {
      const la = a.lineAssignment ?? Number.MAX_SAFE_INTEGER;
      const lb = b.lineAssignment ?? Number.MAX_SAFE_INTEGER;
      return la !== lb ? la - lb : a.name.localeCompare(b.name);
    });
  });

  function isCardComplete(shooterId: number): boolean {
    if (!roundsConfig) return false;
    for (let r = 0; r < roundsConfig.numberOfRounds; r++) {
      for (let p = 0; p < roundsConfig.passesPerRound; p++) {
        for (let a = 0; a < roundsConfig.arrowsPerPasse; a++) {
          if (!allScoreByKey.has(cellKey(shooterId, r, p, a))) return false;
        }
      }
    }
    return true;
  }

  // Keep selectedShooterId valid: on first entry to a byArcher mode (or if the chosen
  // archer is deleted) jump to the first archer whose card still has a blank, else the
  // first archer. Guarded so it never overrides a still-valid manual selection or
  // re-fires on later liveQuery updates.
  $effect(() => {
    if (entryMode === 'byRound' || orderedShooters.length === 0) return;
    if (selectedShooterId !== null && orderedShooters.some((s) => s.id === selectedShooterId)) return;
    const firstIncomplete = orderedShooters.find((s) => !isCardComplete(s.id as number));
    selectedShooterId = (firstIncomplete ?? orderedShooters[0]).id as number;
  });

  let selectedShooterIndex = $derived(
    orderedShooters.findIndex((s) => s.id === selectedShooterId)
  );
  let canPrevArcher = $derived(selectedShooterIndex > 0);
  let canNextArcher = $derived(
    selectedShooterIndex >= 0 && selectedShooterIndex < orderedShooters.length - 1
  );

  function prevArcher() {
    if (canPrevArcher) selectedShooterId = orderedShooters[selectedShooterIndex - 1].id as number;
  }
  function nextArcher() {
    if (canNextArcher) selectedShooterId = orderedShooters[selectedShooterIndex + 1].id as number;
  }

  function archerOptionLabel(s: { name: string; lineAssignment?: number | null }): string {
    if (entryMode === 'byArcherLine') {
      return `${s.lineAssignment ?? strings.scoring.sumIncomplete} — ${s.name}`;
    }
    return s.name;
  }

  let cardRows: ArcherScoreCardRow[] = $derived.by(() => {
    if (!roundsConfig || selectedShooterId === null) return [];
    const built: ArcherScoreCardRow[] = [];
    for (let r = 0; r < roundsConfig.numberOfRounds; r++) {
      for (let p = 0; p < roundsConfig.passesPerRound; p++) {
        const arrows: (ScoreValue | null)[] = [];
        for (let a = 0; a < roundsConfig.arrowsPerPasse; a++) {
          arrows.push(
            (allScoreByKey.get(cellKey(selectedShooterId, r, p, a)) as ScoreValue) ?? null
          );
        }
        const sum = arrows.every((x) => x !== null)
          ? calculatePasseSum(arrows as ScoreValue[], roundsConfig.rings ?? 10)
          : null;
        built.push({
          roundIndex: r,
          passeIndex: p,
          label: roundsConfig.numberOfRounds > 1 ? `${r + 1}.${p + 1}` : `${p + 1}`,
          arrows,
          sum,
        });
      }
    }
    return built;
  });

  let cardTotal = $derived(cardRows.reduce((acc, row) => acc + (row.sum ?? 0), 0));

  // Quick task 260710-erfassung-jump-to-blank: one-shot initial jump to the first
  // round/passe that still has a blank arrow, so reopening Erfassung mid-tournament
  // doesn't always land back on round 1/passe 1. Fires at most once per mount: the
  // hasAppliedInitialJump guard flips to true on the very first run once data has
  // loaded (roundsConfig + shooters present), regardless of whether a jump was
  // actually applied — so it's a no-op on every subsequent run, including later
  // liveQuery updates to allScores, and never overrides manual navigation.
  $effect(() => {
    if (hasAppliedInitialJump || !roundsConfig || shooters.length === 0) return;

    if (allScores.length > 0) {
      const target = findFirstIncompletePasse(
        shooters.map((s) => s.id!),
        roundsConfig.numberOfRounds,
        roundsConfig.passesPerRound,
        roundsConfig.arrowsPerPasse,
        allScores
      );
      if (target) {
        selectedRound = target.roundIndex;
        selectedPasse = target.passeIndex;
      }
    }

    hasAppliedInitialJump = true;
  });

  function handleSort(column: SortColumn) {
    if (sortBy === column) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortDir = 'asc';
    }
  }

  // Both layouts route through here: the classic table always taps into the currently
  // selected Runde/Passe, the single-archer card passes each row's own round/passe.
  function openPicker(shooterId: number, roundIndex: number, passeIndex: number, arrowIndex: number) {
    if (isFinalized) return;
    const wasFilled = allScoreByKey.has(cellKey(shooterId, roundIndex, passeIndex, arrowIndex));
    // A fresh tap always starts a new session — never carry over picks from a
    // previous cell/shooter.
    justPickedValues = new Map();
    pickerCell = { shooterId, roundIndex, passeIndex, arrowIndex, wasFilled };
  }

  function handleScoreSelect(value: ScoreValue) {
    if (!pickerCell || !roundsConfig) return;
    const { shooterId, roundIndex, passeIndex, arrowIndex, wasFilled } = pickerCell;

    // Confirms the tap was registered by the app, independent of whether the picker
    // dialog auto-advances/closes right after and independent of the (fire-and-forget)
    // db.scores.put below — trainers on iPad/iPhone reported mistyped scores from not
    // noticing a tap hadn't registered. No haptics: iOS Safari (incl. installed PWAs)
    // doesn't expose the Vibration API to web content at all.
    playConfirmTone();
    flashToken += 1;
    // D-06: deliberately no `await` — autosave must be non-blocking. Errors are
    // surfaced via errorFeedback (WR-04) without blocking further cell edits.
    db.scores
      .put({
        shooterId,
        roundIndex,
        passeIndex,
        arrowIndex,
        value,
        finalized: false,
      })
      .catch((err) => {
        errorFeedback = strings.common.saveError.replace(
          '{error}',
          err instanceof Error ? err.message : String(err)
        );
      });

    justPickedValues.set(cellKey(shooterId, roundIndex, passeIndex, arrowIndex), value);

    // Quick task 260705-ok7: editing an already-filled cell always closes the
    // dialog — the trainer was correcting a single value, not filling a row.
    if (wasFilled) {
      pickerCell = null;
      return;
    }

    // Auto-advance to the next empty arrow within the SAME shooter's row only —
    // cross-row auto-advance is retired.
    const isFilled = (aIdx: number) => {
      const key = cellKey(shooterId, roundIndex, passeIndex, aIdx);
      return justPickedValues.has(key) || allScoreByKey.has(key);
    };
    const nextArrowIndex = findNextEmptyArrowInRow(roundsConfig.arrowsPerPasse, arrowIndex, isFilled);
    pickerCell =
      nextArrowIndex !== null
        ? { shooterId, roundIndex, passeIndex, arrowIndex: nextArrowIndex, wasFilled: false }
        : null;
  }

  function cancelPicker() {
    pickerCell = null;
    justPickedValues = new Map();
  }

  function handleAdvance() {
    if (!roundsConfig) return;
    if (selectedPasse < roundsConfig.passesPerRound - 1) {
      selectedPasse += 1;
    } else {
      selectedPasse = 0;
      selectedRound += 1;
    }
  }

  // Unconditional linear prev/next navigation across the whole round/passe sequence —
  // added after post-ship feedback that switching between two halves of the archer
  // roster (e.g. lines A/B vs C/D shooting different ends at the same time) via the
  // Runde/Passe dropdowns was clumsy. Always available regardless of completion — free
  // back-and-forth navigation. The Next button additionally highlights teal
  // (nextHighlighted, passed to RoundPasseSelector below) once the current passe is
  // fully scored — folding in the "you're done here, move on" signal that used to be a
  // second standalone advance button, removed after feedback that two ">" buttons on
  // the same row/screen was confusing on both phone and tablet.
  let canGoPrevious = $derived(selectedRound > 0 || selectedPasse > 0);
  let canGoNext = $derived(roundsConfig ? !isLastPasseOfTournament : false);

  function handlePrevious() {
    if (!roundsConfig) return;
    if (selectedPasse > 0) {
      selectedPasse -= 1;
    } else if (selectedRound > 0) {
      selectedRound -= 1;
      selectedPasse = roundsConfig.passesPerRound - 1;
    }
  }

  function handleNext() {
    handleAdvance();
  }

  async function handleFinalizeClick() {
    finalizeDialogOpen = true;
  }

  // T-03-06: the only code path that ever sets finalized: true — gated behind
  // isComplete (button disabled otherwise) and this explicit non-dismissible confirm.
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
</script>

<!-- Score-tap confirmation flash — remounted via {#key flashToken} so the CSS animation
     replays on every tap, including two consecutive taps of the same picked value. -->
{#key flashToken}
  {#if flashToken > 0}
    <div class="score-confirm-flash pointer-events-none fixed inset-0 z-40 bg-teal-400"></div>
  {/if}
{/key}

{#if !roundsConfig}
  <PlaceholderScreen
    icon={Target}
    heading={strings.scoring.notConfiguredHeading}
    body={strings.scoring.notConfiguredBody}
  />
{:else}
  <div class="mx-auto flex max-w-[960px] flex-col gap-6 p-4">
    <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
      {strings.scoring.heading}
    </h1>

    {#if errorFeedback}
      <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
    {/if}

    {#if entryMode === 'byRound'}
      <RoundPasseSelector
        numberOfRounds={roundsConfig.numberOfRounds}
        passesPerRound={roundsConfig.passesPerRound}
        {selectedRound}
        {selectedPasse}
        disabled={isFinalized}
        onRoundChange={(index) => (selectedRound = index)}
        onPasseChange={(index) => (selectedPasse = index)}
        nextHighlighted={showAdvanceButton}
        {canGoPrevious}
        {canGoNext}
        onPrevious={handlePrevious}
        onNext={handleNext}
      />

      <ScoreTable
        {rows}
        arrowsPerPasse={roundsConfig.arrowsPerPasse}
        finalized={isFinalized}
        {sortBy}
        {sortDir}
        oncelltap={(shooterId, arrowIndex) =>
          openPicker(shooterId, selectedRound, selectedPasse, arrowIndex)}
        onsort={handleSort}
      />
    {:else if orderedShooters.length === 0}
      <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.scoring.noShootersForCard}
      </p>
    {:else}
      <div class="flex items-end gap-2">
        <button
          type="button"
          aria-label={strings.scoring.previousArcherAria}
          disabled={!canPrevArcher}
          onclick={prevArcher}
          class="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] font-semibold leading-[1.5] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          &lt;
        </button>

        <label class="flex flex-1 flex-col gap-1">
          <span class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400"
            >{strings.scoring.archerLabel}</span
          >
          <select
            value={selectedShooterId}
            onchange={(e) =>
              (selectedShooterId = Number((e.target as HTMLSelectElement).value))}
            class="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] leading-[1.5] text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {#each orderedShooters as s (s.id)}
              <option value={s.id}>{archerOptionLabel(s)}</option>
            {/each}
          </select>
        </label>

        <button
          type="button"
          aria-label={strings.scoring.nextArcherAria}
          disabled={!canNextArcher}
          onclick={nextArcher}
          class="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] font-semibold leading-[1.5] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          &gt;
        </button>
      </div>

      <ArcherScoreCard
        rows={cardRows}
        arrowsPerPasse={roundsConfig.arrowsPerPasse}
        finalized={isFinalized}
        total={cardTotal}
        oncelltap={(roundIndex, passeIndex, arrowIndex) =>
          selectedShooterId !== null &&
          openPicker(selectedShooterId, roundIndex, passeIndex, arrowIndex)}
      />
    {/if}

    <ScorePicker
      open={pickerCell !== null}
      shooterName={pickerShooterName}
      rowPreview={pickerRowPreview}
      onselect={handleScoreSelect}
      oncancel={cancelPicker}
      rings={roundsConfig.rings ?? 10}
    />

    {#if isFinalized}
      <p class="text-[16px] leading-[1.5] text-slate-700 dark:text-slate-200">
        {strings.scoring.finalizedMessage}
      </p>
    {:else}
      <button
        type="button"
        disabled={!isComplete}
        onclick={handleFinalizeClick}
        class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
      >
        {strings.scoring.finalizeButton}
      </button>

      {#if !isComplete}
        <p role="status" aria-live="polite" class="text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
          {shooters.length === 0 ? strings.scoring.noShootersHelper : strings.scoring.completionHelper}
        </p>
      {/if}
    {/if}
  </div>

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
{/if}

<style>
  @keyframes score-confirm-flash {
    0% {
      opacity: 0;
    }
    15% {
      opacity: 0.35;
    }
    100% {
      opacity: 0;
    }
  }
  .score-confirm-flash {
    /* fill-mode forwards: without it, once the animation ends the element reverts to
       its un-animated default (opacity 1 — solid teal), instead of staying at the
       final keyframe's opacity 0. That's what left the screen "stuck" blue. */
    animation: score-confirm-flash 220ms ease-out forwards;
  }
</style>
