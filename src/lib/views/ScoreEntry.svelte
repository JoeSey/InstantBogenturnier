<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Target } from '@lucide/svelte';
  import { db } from '../db/schema';
  import type { ScoreValue } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { calculatePasseSum } from '../utils/scoreCompletion';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import RoundPasseSelector from '../components/RoundPasseSelector.svelte';
  import ScoreTable from '../components/ScoreTable.svelte';
  import type { ScoreRow } from '../components/ScoreTable.svelte';
  import ScorePicker from '../components/ScorePicker.svelte';
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
  let pickerCell = $state<{ shooterId: number; arrowIndex: number } | null>(null);
  let errorFeedback = $state('');

  // SCORE-04: ephemeral (non-persisted) column-header sort state — reloading the app
  // resets to the default (by Linie, ascending); never written to Dexie.
  let sortBy = $state<SortColumn>('line');
  let sortDir = $state<SortDirection>('asc');

  // D-09: the trainer only sees the tournament as "finalized" once every score record
  // has finalized: true. Vacuously false when there are no records yet.
  let isFinalized = $derived(allScores.length > 0 && allScores.every((s) => s.finalized));

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
    pickerCell = { shooterId, arrowIndex };
  }

  function handleScoreSelect(value: ScoreValue) {
    if (!pickerCell) return;
    const { shooterId, arrowIndex } = pickerCell;
    pickerCell = null;
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
  }

  function cancelPicker() {
    pickerCell = null;
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

    <ScorePicker open={pickerCell !== null} onselect={handleScoreSelect} oncancel={cancelPicker} />
  </div>
{/if}
