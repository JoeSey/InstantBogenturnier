<script module lang="ts">
  import type { ScoreValue } from '../db/schema';

  // Canonical row-shape contract (03-01-PLAN.md Interfaces block) — exported from the
  // module context so ScoreEntry.svelte (and Plan 03-02's sorting logic) can import
  // this type without re-deriving it, matching AutoAssignModal.svelte's RosterEntry
  // export pattern.
  export interface ScoreRow {
    shooterId: number;
    name: string;
    className: string;
    line: number | null;
    arrows: (ScoreValue | null)[];
    sum: number | null;
  }
</script>

<script lang="ts">
  import { strings } from '../i18n/strings.de';

  // Fully opaque score table (Phase 1 D-11) — NO glass-surface class anywhere in this
  // file. Wrapped in overflow-x-auto so phone-width viewports scroll horizontally
  // instead of switching to a card layout (deliberately different from
  // Registration.svelte's phone card-list pattern per 03-UI-SPEC.md).
  let {
    rows,
    arrowsPerPasse,
    finalized,
    oncelltap,
  }: {
    rows: ScoreRow[];
    arrowsPerPasse: number;
    finalized: boolean;
    oncelltap: (shooterId: number, arrowIndex: number) => void;
  } = $props();
</script>

<div class="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
  <table class="w-full bg-white text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
    <thead>
      <tr class="border-b border-slate-200 text-left dark:border-slate-600">
        <th class="p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnLine}</th
        >
        <th class="p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnName}</th
        >
        <th class="p-4 text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnClass}</th
        >
        {#each Array.from({ length: arrowsPerPasse }) as _, i (i)}
          <th
            class="p-4 text-center text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
            >{i + 1}</th
          >
        {/each}
        <th
          class="p-4 text-right text-[14px] font-normal leading-[1.4] text-slate-500 dark:text-slate-400"
          >{strings.scoring.columnSum}</th
        >
      </tr>
    </thead>
    <tbody>
      {#each rows as row (row.shooterId)}
        <tr class="border-b border-slate-100 dark:border-slate-700">
          <td class="px-3 py-2">{row.line ?? '—'}</td>
          <td class="px-3 py-2">{row.name}</td>
          <td class="px-3 py-2">{row.className}</td>
          {#each row.arrows as arrow, i (i)}
            <td class="px-3 py-2 text-center">
              <button
                type="button"
                disabled={finalized}
                onclick={() => oncelltap(row.shooterId, i)}
                aria-disabled={finalized}
                class={arrow === null
                  ? 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700'
                  : 'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-teal-50 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-600 dark:text-slate-100'}
              >
                {arrow ?? ''}
              </button>
            </td>
          {/each}
          <td class="px-3 py-2 text-right font-semibold"
            >{row.sum ?? strings.scoring.sumIncomplete}</td
          >
        </tr>
      {/each}
    </tbody>
  </table>
</div>
