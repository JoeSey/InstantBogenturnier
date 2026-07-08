<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { db } from '../db/schema';
  import type { ShooterRecord } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { detectMode } from '../utils/modeDetection';
  import { computeIsFinalized } from '../utils/scoreCompletion';
  import GlassCard from '../components/GlassCard.svelte';
  import ShooterForm from '../components/ShooterForm.svelte';

  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let shooters = $derived($shootersQuery ?? []);

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);
  let classNameById = $derived(new Map(classes.map((c) => [c.id, c.name])));

  const lineConfigQuery = liveQuery(() => db.shootingLines.get(1));
  let lineCount = $derived($lineConfigQuery?.count ?? 2);

  // RES-06/D-11/D-12 (04-03-PLAN.md Task 2): disable delete-shooter once the
  // tournament is finalized, guarded via the shared computeIsFinalized so the
  // permanent-lock boolean is never re-derived inline per view.
  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);
  let isFinalized = $derived(computeIsFinalized(allScores));

  let shooterCount = $derived(shooters.length);
  let mode = $derived(detectMode(shooterCount, lineCount));

  let editingShooter = $state<ShooterRecord | null>(null);
  let errorFeedback = $state('');
  let formCard: HTMLElement | undefined;

  function startEdit(shooter: ShooterRecord) {
    editingShooter = { ...shooter };
    // Long rosters can scroll the edit form out of view — pull it back into sight so
    // clicking the pencil icon always has visible feedback. (jsdom in tests has no
    // scrollIntoView implementation, hence the feature check.)
    formCard?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }

  function clearEdit() {
    editingShooter = null;
  }

  async function deleteShooter(id: number | undefined) {
    if (id === undefined) return;
    errorFeedback = '';
    try {
      // WR-02 (04-REVIEW.md): delete the shooter's own score rows atomically so a
      // mid-tournament removal doesn't leave orphaned ScoreRecords in db.scores.
      await db.transaction('rw', db.shooters, db.scores, async () => {
        await db.shooters.delete(id);
        await db.scores.where('shooterId').equals(id).delete();
      });
    } catch (err) {
      // WR-04: surface write failures instead of failing silently.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  function className(classId: number): string {
    return classNameById.get(classId) ?? '';
  }
</script>

<div class="mx-auto flex max-w-[720px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.registration.heading}
  </h1>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}

  {#if isFinalized}
    <p role="status" class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.results.guardMessage}
    </p>
  {/if}

  <GlassCard class="p-4 md:p-6">
    {#if mode === 'AB/CD'}
      <p class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.registration.modeABCD}
      </p>
      <p class="mt-1 text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.registration.modeABCDExplain}
      </p>
    {:else}
      <p class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.registration.modeAB}
      </p>
      <p class="mt-1 text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.registration.modeABExplain}
      </p>
    {/if}
  </GlassCard>

  <div bind:this={formCard}>
    <GlassCard class="p-4 md:p-6">
      <ShooterForm editingShooter={editingShooter} onEditComplete={clearEdit} isFinalized={isFinalized} />
    </GlassCard>
  </div>

  <section>
    {#if shooters.length === 0}
      <GlassCard class="p-4 md:p-6">
        <h2 class="text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
          {strings.registration.emptyHeading}
        </h2>
        <p class="mt-1 text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
          {strings.registration.emptyBody}
        </p>
      </GlassCard>
    {:else}
      <!-- Tablet/desktop: opaque HTML table (Phase 1 contract: no glass on data tables). -->
      <table class="hidden w-full rounded-lg bg-white text-[16px] leading-[1.5] text-slate-900 md:table dark:bg-slate-800 dark:text-slate-100">
        <thead>
          <tr class="border-b border-slate-200 text-left dark:border-slate-700">
            <th class="p-3 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
              >{strings.registration.tableNameColumn}</th
            >
            <th class="p-3 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
              >{strings.registration.tableClassColumn}</th
            >
            <th class="p-3 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
              >{strings.registration.tableLineColumn}</th
            >
            <th class="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {#each shooters as shooter (shooter.id)}
            <tr class="border-b border-slate-100 dark:border-slate-700">
              <td class="p-3">{shooter.name}</td>
              <td class="p-3">{className(shooter.classId)}</td>
              <td class="p-3">{shooter.lineAssignment ?? '—'}</td>
              <td class="p-3">
                <div class="flex justify-end gap-2">
                  <button
                    type="button"
                    onclick={() => startEdit(shooter)}
                    aria-label={strings.registration.editAction}
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center"
                  >
                    <Pencil size={20} strokeWidth={1.75} class="text-slate-600 dark:text-slate-300" />
                  </button>
                  <button
                    type="button"
                    onclick={() => deleteShooter(shooter.id)}
                    aria-label={strings.registration.deleteAction}
                    disabled={isFinalized} aria-disabled={isFinalized}
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>

      <!-- Phone: glass-card list, one shooter per card. -->
      <ul class="flex flex-col gap-2 md:hidden">
        {#each shooters as shooter (shooter.id)}
          <li>
            <GlassCard class="flex items-center justify-between p-3">
              <div>
                <p class="text-[16px] leading-[1.5] text-slate-900 dark:text-slate-100">{shooter.name}</p>
                <p class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
                  {className(shooter.classId)} · {strings.registration.tableLineColumn}: {shooter.lineAssignment ?? '—'}
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={() => startEdit(shooter)}
                  aria-label={strings.registration.editAction}
                  class="flex min-h-[44px] min-w-[44px] items-center justify-center"
                >
                  <Pencil size={20} strokeWidth={1.75} class="text-slate-600 dark:text-slate-300" />
                </button>
                <button
                  type="button"
                  onclick={() => deleteShooter(shooter.id)}
                  aria-label={strings.registration.deleteAction}
                  disabled={isFinalized} aria-disabled={isFinalized}
                  class="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
                </button>
              </div>
            </GlassCard>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>
