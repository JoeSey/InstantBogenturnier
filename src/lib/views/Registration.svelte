<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Pencil, Trash2 } from '@lucide/svelte';
  import { db } from '../db/schema';
  import type { ShooterRecord } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { detectMode } from '../utils/modeDetection';
  import GlassCard from '../components/GlassCard.svelte';
  import ShooterForm from '../components/ShooterForm.svelte';

  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let shooters = $derived($shootersQuery ?? []);

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);
  let classNameById = $derived(new Map(classes.map((c) => [c.id, c.name])));

  const lineConfigQuery = liveQuery(() => db.shootingLines.get(1));
  let lineCount = $derived($lineConfigQuery?.count ?? 2);

  let shooterCount = $derived(shooters.length);
  let mode = $derived(detectMode(shooterCount, lineCount));

  let editingShooter = $state<ShooterRecord | null>(null);

  function startEdit(shooter: ShooterRecord) {
    editingShooter = { ...shooter };
  }

  function clearEdit() {
    editingShooter = null;
  }

  async function deleteShooter(id: number | undefined) {
    if (id === undefined) return;
    await db.shooters.delete(id);
  }

  function className(classId: number): string {
    return classNameById.get(classId) ?? '';
  }
</script>

<div class="mx-auto flex max-w-[720px] flex-col gap-6 p-4">
  <h1 class="text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.registration.heading}
  </h1>

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

  <GlassCard class="p-4 md:p-6">
    <ShooterForm editingShooter={editingShooter} onEditComplete={clearEdit} />
  </GlassCard>

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
                    class="flex min-h-[44px] min-w-[44px] items-center justify-center"
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
                  class="flex min-h-[44px] min-w-[44px] items-center justify-center"
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
