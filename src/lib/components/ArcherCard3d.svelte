<script module lang="ts">
  // v2 (3D milestone) slice 4 — one row per station of a single archer's 3D card.
  // Columns: Ziel | Wertung (the outcome token as a readable label) | Punkte. The
  // Wertung cell is the tap target that opens ScoreOutcomeGrid. Built by
  // ScoreEntry.svelte from the flat scores table + the round's resolved ruleset;
  // pure presentation here.
  export interface ArcherCard3dRow {
    roundIndex: number;
    passeIndex: number;
    label: string;
    outcomeLabel: string; // '' when nothing recorded yet
    zone: string | null; // 'K'|'V'|'W' for a hit, null for a miss or nothing recorded
    points: number | null; // null when nothing recorded yet
  }
</script>

<script lang="ts">
  import { strings } from '../i18n/strings.de';
  import { outcomeCellColorClass } from '../utils/scoreColor';

  let {
    rows,
    finalized,
    total,
    oncelltap,
  }: {
    rows: ArcherCard3dRow[];
    finalized: boolean;
    total: number;
    oncelltap: (roundIndex: number, passeIndex: number) => void;
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
        <th class="p-2 md:p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnOutcome}</th
        >
        <th
          class="p-2 md:p-4 text-right text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnPoints}</th
        >
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.label)}
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <td class="px-1.5 py-1.5 md:px-3 md:py-2 font-semibold">{row.label}</td>
          <td class="px-1.5 py-1.5 md:px-3 md:py-2">
            <button
              type="button"
              disabled={finalized}
              onclick={() => oncelltap(row.roundIndex, row.passeIndex)}
              aria-disabled={finalized}
              class={row.outcomeLabel === ''
                ? 'flex min-h-[44px] w-full items-center justify-start rounded-md bg-slate-100 px-3 text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-400'
                : `flex min-h-[44px] w-full items-center justify-start rounded-md px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${outcomeCellColorClass(row.zone)}`}
            >
              {row.outcomeLabel === '' ? strings.scoring.outcomeNotScored : row.outcomeLabel}
            </button>
          </td>
          <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-right font-semibold"
            >{row.points ?? strings.scoring.sumIncomplete}</td
          >
        </tr>
      {/each}
    </tbody>
    <tfoot>
      <tr class="border-t border-slate-200 dark:border-slate-600">
        <td class="px-1.5 py-1.5 md:px-3 md:py-2 font-semibold" colspan="2"
          >{strings.scoring.cardTotalLabel}</td
        >
        <td class="px-1.5 py-1.5 md:px-3 md:py-2 text-right font-semibold">{total}</td>
      </tr>
    </tfoot>
  </table>
</div>
