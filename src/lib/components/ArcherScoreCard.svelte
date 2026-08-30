<script module lang="ts">
  import type { ScoreValue } from '../db/schema';

  // One row per Runde/Passe (target) of a single archer's whole scorecard — the
  // layout used by the "Nach Schießplatz/Name" Erfassungsart for 3D-/Feldturniere.
  // Built by ScoreEntry.svelte from the flat scores table; this component is pure
  // presentation (no sorting, no Dexie access).
  export interface ArcherScoreCardRow {
    roundIndex: number;
    passeIndex: number;
    label: string;
    arrows: (ScoreValue | null)[];
    sum: number | null;
  }
</script>

<script lang="ts">
  import { strings } from '../i18n/strings.de';
  import { scoreCellColorClass } from '../utils/scoreColor';

  let {
    rows,
    arrowsPerPasse,
    finalized,
    total,
    oncelltap,
    rings = 10,
  }: {
    rows: ArcherScoreCardRow[];
    arrowsPerPasse: number;
    finalized: boolean;
    total: number;
    oncelltap: (roundIndex: number, passeIndex: number, arrowIndex: number) => void;
    rings?: 10 | 5;
  } = $props();
</script>

<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
  <table
    class="w-full bg-white text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100"
  >
    <thead>
      <tr class="border-b border-slate-200 text-left dark:border-slate-600">
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnTarget}</th
        >
        {#each Array.from({ length: arrowsPerPasse }) as _, i (i)}
          <th
            class="p-2 md:p-4 text-center text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
            >{i + 1}</th
          >
        {/each}
        <th
          class="p-2 md:p-4 text-right text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnSum}</th
        >
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.label)}
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <td class="px-1.5 py-1.5 md:px-3 md:py-2 font-semibold">{row.label}</td>
          {#each row.arrows as arrow, i (i)}
            <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-center">
              <button
                type="button"
                disabled={finalized}
                onclick={() => oncelltap(row.roundIndex, row.passeIndex, i)}
                aria-disabled={finalized}
                class={arrow === null
                  ? 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700'
                  : `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${scoreCellColorClass(arrow, rings)}`}
              >
                {arrow ?? ''}
              </button>
            </td>
          {/each}
          <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-right font-semibold"
            >{row.sum ?? strings.scoring.sumIncomplete}</td
          >
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr class="border-t border-slate-200 dark:border-slate-600">
        <td class="px-1.5 py-1.5 md:px-3 md:py-2 font-semibold" colspan={arrowsPerPasse + 1}
          >{strings.scoring.cardTotalLabel}</td
        >
        <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-right font-semibold">{total}</td>
      </tr>
    </tfoot>
  </table>
</div>
