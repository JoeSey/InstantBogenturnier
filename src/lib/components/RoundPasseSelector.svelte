<script lang="ts">
  import { strings } from '../i18n/strings.de';

  // Runde/Passe dropdown navigation (D-04, 03-01-PLAN.md Task 2). Both indexes are
  // 0-based internally (matching ScoreRecord.roundIndex/passeIndex); the displayed
  // option label is 1-based (`{i + 1}`).
  let {
    numberOfRounds,
    passesPerRound,
    selectedRound,
    selectedPasse,
    disabled,
    onRoundChange,
    onPasseChange,
  }: {
    numberOfRounds: number;
    passesPerRound: number;
    selectedRound: number;
    selectedPasse: number;
    disabled: boolean;
    onRoundChange: (index: number) => void;
    onPasseChange: (index: number) => void;
  } = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row">
  <label class="flex flex-col gap-1">
    <span class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400"
      >{strings.scoring.roundLabel}</span
    >
    <select
      {disabled}
      value={selectedRound}
      onchange={(e) => onRoundChange(Number((e.target as HTMLSelectElement).value))}
      class="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] leading-[1.5] text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {#each Array.from({ length: numberOfRounds }) as _, i (i)}
        <option value={i}>{i + 1}</option>
      {/each}
    </select>
  </label>

  <label class="flex flex-col gap-1">
    <span class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400"
      >{strings.scoring.passeLabel}</span
    >
    <select
      {disabled}
      value={selectedPasse}
      onchange={(e) => onPasseChange(Number((e.target as HTMLSelectElement).value))}
      class="min-h-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] leading-[1.5] text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      {#each Array.from({ length: passesPerRound }) as _, i (i)}
        <option value={i}>{i + 1}</option>
      {/each}
    </select>
  </label>
</div>
