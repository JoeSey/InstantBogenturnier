<script module lang="ts">
  import type { RankedRow } from '../utils/ranking';
</script>

<script lang="ts">
  import { FileDown } from '@lucide/svelte';
  import { strings } from '../i18n/strings.de';

  // Per-class ranked results table (RES-01/RES-02, D-01–D-07). Fixed rank order — no
  // click-to-sort header handlers at all, unlike ScoreTable.svelte's interactively
  // sortable columns (SCORE-04 does not apply here). Fully opaque (Phase 1 D-11,
  // D-06) — the only color accent is the rank-based (not row-based, D-07) podium
  // badge in the Rang cell.
  //
  // Phase 6 Plan 04: added a per-row certificate action column (D-02/D-04) — the
  // `oncertexport` callback lets the parent (Results.svelte) supply the class-name-
  // aware handler, since RankedRow itself has no className field.
  let { rows, oncertexport }: { rows: RankedRow[]; oncertexport: (row: RankedRow) => void } = $props();

  let hasIncomplete = $derived(rows.some((r) => !r.isComplete));

  const PODIUM_BADGE_CLASSES: Record<number, string> = {
    1: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    2: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
    3: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
  };
</script>

<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
  <table class="w-full bg-white text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
    <thead>
      <tr class="border-b border-slate-200 text-left dark:border-slate-600">
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400">
          {strings.results.columnRank}
        </th>
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400">
          {strings.results.columnName}
        </th>
        <th
          class="hidden md:table-cell p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
        >
          {strings.results.columnLine}
        </th>
        <th
          class="p-2 md:p-4 text-right text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
        >
          {strings.results.columnTotal}
        </th>
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400">
          {strings.results.columnCertificate}
        </th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.shooterId)}
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <td class="px-2 py-2 md:px-3 md:py-2">
            {#if row.rank <= 3}
              <span
                class="flex h-6 w-6 items-center justify-center rounded-full text-[14px] font-semibold leading-[1.4] {PODIUM_BADGE_CLASSES[
                  row.rank
                ]}"
                aria-label={`Rang ${row.rank}`}
              >
                {row.rank}
              </span>
            {:else}
              <span aria-label={`Rang ${row.rank}`}>{row.rank}</span>
            {/if}
          </td>
          <td class="px-2 py-2 md:px-3 md:py-2">{row.name}</td>
          <td class="hidden md:table-cell px-2 py-2 md:px-3 md:py-2">{row.line ?? '—'}</td>
          <td class="px-2 py-2 md:px-3 md:py-2 text-right font-semibold">
            {row.sum}{#if !row.isComplete}<span class="text-slate-400 dark:text-slate-500">*</span
              ><span class="sr-only">{strings.results.inProgressAria}</span>{/if}
          </td>
          <td class="px-2 py-2 md:px-3 md:py-2 text-center">
            <button
              type="button"
              onclick={() => oncertexport(row)}
              class="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-teal-500 p-2 text-teal-500 hover:bg-teal-50 dark:border-teal-400 dark:text-teal-400 dark:hover:bg-teal-900/30"
              aria-label={strings.certificateExport.singleButton}
            >
              <FileDown size={20} />
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if hasIncomplete}
    <p class="p-2 md:p-4 text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.results.inProgressLegend}
    </p>
  {/if}
</div>
