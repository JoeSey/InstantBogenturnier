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
    computeIsFinalized,
  } from '../utils/scoreCompletion';
  import { findNextEmptyArrowInRow } from '../utils/scoreAdvance';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import RoundPasseSelector from '../components/RoundPasseSelector.svelte';
  import ScoreTable from '../components/ScoreTable.svelte';
  import type { ScoreRow } from '../components/ScoreTable.svelte';
  import ScorePicker from '../components/ScorePicker.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import { sortRows } from '../utils/sortComparators';
  import type { SortColumn, SortDirection } from '../utils/sortComparators';

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

  let selectedRound = $state(0);
  let selectedPasse = $state(0);
  let pickerCell = $state<{ shooterId: number; arrowIndex: number; wasFilled: boolean } | null>(
    null
  );
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
      const key = `${cell.shooterId}-${i}`;
      preview.push(
        justPickedValues.get(key) ?? (currentPasseScoreByKey.get(key) as ScoreValue | undefined) ?? null
      );
    }
    return preview;
  });
  let errorFeedback = $state('');

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

  let currentPasseScoreByKey = $derived(
    new Map(
      allScores
        .filter((s) => s.roundIndex === selectedRound && s.passeIndex === selectedPasse)
        .map((s) => [`${s.shooterId}-${s.arrowIndex}`, s.value])
    )
  );

  let rows: ScoreRow[] = $derived.by(() => {
    if (!roundsConfig) return [];

    const built = shooters.map((shooter): ScoreRow => {
      const arrows: (ScoreValue | null)[] = [];
      for (let i = 0; i < roundsConfig.arrowsPerPasse; i++) {
        arrows.push((currentPasseScoreByKey.get(`${shooter.id}-${i}`) as ScoreValue) ?? null);
      }
      const sum = arrows.every((a) => a !== null) ? calculatePasseSum(arrows as ScoreValue[]) : null;

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

  function handleSort(column: SortColumn) {
    if (sortBy === column) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = column;
      sortDir = 'asc';
    }
  }

  function openPicker(shooterId: number, arrowIndex: number) {
    if (isFinalized) return;
    const wasFilled = currentPasseScoreByKey.has(`${shooterId}-${arrowIndex}`);
    // A fresh tap always starts a new session — never carry over picks from a
    // previous cell/shooter.
    justPickedValues = new Map();
    pickerCell = { shooterId, arrowIndex, wasFilled };
  }

  function handleScoreSelect(value: ScoreValue) {
    if (!pickerCell || !roundsConfig) return;
    const { shooterId, arrowIndex, wasFilled } = pickerCell;
    // D-06: deliberately no `await` — autosave must be non-blocking. Errors are
    // surfaced via errorFeedback (WR-04) without blocking further cell edits.
    db.scores
      .put({
        shooterId,
        roundIndex: selectedRound,
        passeIndex: selectedPasse,
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

    justPickedValues.set(`${shooterId}-${arrowIndex}`, value);

    // Quick task 260705-ok7: editing an already-filled cell always closes the
    // dialog — the trainer was correcting a single value, not filling a row.
    if (wasFilled) {
      pickerCell = null;
      return;
    }

    // Auto-advance to the next empty arrow within the SAME shooter's row only —
    // cross-row auto-advance is retired.
    const isFilled = (aIdx: number) => {
      const key = `${shooterId}-${aIdx}`;
      return justPickedValues.has(key) || currentPasseScoreByKey.has(key);
    };
    const nextArrowIndex = findNextEmptyArrowInRow(roundsConfig.arrowsPerPasse, arrowIndex, isFilled);
    pickerCell = nextArrowIndex !== null ? { shooterId, arrowIndex: nextArrowIndex, wasFilled: false } : null;
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

    <RoundPasseSelector
      numberOfRounds={roundsConfig.numberOfRounds}
      passesPerRound={roundsConfig.passesPerRound}
      {selectedRound}
      {selectedPasse}
      disabled={isFinalized}
      onRoundChange={(index) => (selectedRound = index)}
      onPasseChange={(index) => (selectedPasse = index)}
      showAdvance={showAdvanceButton}
      onAdvance={handleAdvance}
    />

    <ScoreTable
      {rows}
      arrowsPerPasse={roundsConfig.arrowsPerPasse}
      finalized={isFinalized}
      {sortBy}
      {sortDir}
      oncelltap={openPicker}
      onsort={handleSort}
    />

    <ScorePicker
      open={pickerCell !== null}
      shooterName={pickerShooterName}
      rowPreview={pickerRowPreview}
      onselect={handleScoreSelect}
      oncancel={cancelPicker}
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
