<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { computeClassRankings } from '../utils/ranking';
  import GlassCard from '../components/GlassCard.svelte';
  import ClassSelector from '../components/ClassSelector.svelte';
  import ResultsTable from '../components/ResultsTable.svelte';

  // Main Results view (RES-01–RES-04, D-01/D-04/D-05): live-updating ranked per-class
  // standings, viewable anytime (D-01, not gated on finalization). Mirrors
  // ScoreEntry.svelte's multi-liveQuery + `?? []` defaulting pattern.
  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let shooters = $derived($shootersQuery ?? []);

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);

  const roundsQuery = liveQuery(() => db.rounds.get(1));
  let roundsConfig = $derived($roundsQuery);

  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);

  let rankings = $derived(computeClassRankings(shooters, classes, allScores, roundsConfig));

  // D-04: alphabetical class order, edge-case-safe — only classes with at least one
  // ranked shooter (rankings.has) feed BOTH the phone dropdown and the grid.
  let classesWithResults = $derived(
    classes.filter((c) => c.id !== undefined && rankings.has(c.id)).sort((a, b) => a.name.localeCompare(b.name))
  );

  let selectedClassId = $state<number | null>(null);

  // Defaults to the first alphabetical class on first load, and re-picks whenever the
  // current selection is null or no longer present (handles the post-reset re-pick
  // case introduced by the next plan in this phase).
  $effect(() => {
    if (selectedClassId === null || !classesWithResults.some((c) => c.id === selectedClassId)) {
      selectedClassId = classesWithResults[0]?.id ?? null;
    }
  });

  // Declared now (unused by this plan) since Plan 02 (reset) extends this same file
  // and needs the same error-row shape as ScoreEntry.svelte.
  let errorFeedback = $state('');
</script>

<div class="mx-auto flex max-w-[1280px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.results.heading}
  </h1>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}

  {#if classesWithResults.length === 0}
    <div class="flex flex-col items-center gap-2 py-12 text-center">
      <h2 class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.results.emptyHeading}
      </h2>
      <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.results.emptyBody}
      </p>
    </div>
  {:else}
    <div class="md:hidden">
      <ClassSelector
        classes={classesWithResults}
        {selectedClassId}
        onchange={(id) => (selectedClassId = id)}
      />
      <div class="mt-4">
        <ResultsTable rows={selectedClassId !== null ? (rankings.get(selectedClassId) ?? []) : []} />
      </div>
    </div>

    <div class="hidden gap-4 md:grid md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6">
      {#each classesWithResults as cls (cls.id)}
        <GlassCard class="p-4 md:p-6 xl:p-6">
          <h2 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
            {cls.name}
          </h2>
          <ResultsTable rows={rankings.get(cls.id!) ?? []} />
        </GlassCard>
      {/each}
    </div>
  {/if}
</div>
