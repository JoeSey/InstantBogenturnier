<script lang="ts">
  import { liveQuery } from 'dexie';
  import { RotateCcw } from '@lucide/svelte';
  import { db } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { computeClassRankings } from '../utils/ranking';
  import GlassCard from '../components/GlassCard.svelte';
  import ClassSelector from '../components/ClassSelector.svelte';
  import ResultsTable from '../components/ResultsTable.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

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

  // RES-05/D-08/D-09/D-10: "Neues Turnier starten" reset flow. Reuses ConfirmDialog's
  // non-dismissible confirm pattern (T-4-01) and wraps both clears in a single Dexie
  // transaction (T-4-03) so a mid-operation failure can never leave scores referencing
  // already-deleted shooters. Only `shooters`/`scores` are ever cleared here — classes,
  // shootingLines, rounds, and presets are intentionally untouched (D-10).
  let resetDialogOpen = $state(false);
  let resetSuccessMessage = $state('');

  function openResetDialog() {
    resetSuccessMessage = '';
    resetDialogOpen = true;
  }

  async function handleResetConfirm() {
    resetDialogOpen = false;
    errorFeedback = '';
    try {
      await db.transaction('rw', db.shooters, db.scores, async () => {
        await db.shooters.clear();
        await db.scores.clear();
      });
      resetSuccessMessage = strings.results.resetSuccess;
    } catch (err) {
      errorFeedback = strings.results.resetError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function handleResetCancel() {
    resetDialogOpen = false;
  }
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

  {#if resetSuccessMessage}
    <p class="text-[14px] leading-[1.4] text-teal-600 dark:text-teal-400">{resetSuccessMessage}</p>
  {/if}

  <button
    type="button"
    onclick={openResetDialog}
    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-red-700 md:w-auto dark:bg-red-400 dark:text-slate-900"
  >
    <RotateCcw size={20} />
    {strings.results.resetButton}
  </button>
</div>

<ConfirmDialog
  open={resetDialogOpen}
  title={strings.results.resetConfirmTitle}
  body={strings.results.resetConfirmBody}
  confirmLabel={strings.results.resetConfirmYes}
  cancelLabel={strings.results.resetConfirmCancel}
  destructive={true}
  onconfirm={handleResetConfirm}
  oncancel={handleResetCancel}
/>
