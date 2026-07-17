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
    canGoPrevious,
    canGoNext,
    onPrevious,
    onNext,
    nextHighlighted,
  }: {
    numberOfRounds: number;
    passesPerRound: number;
    selectedRound: number;
    selectedPasse: number;
    disabled: boolean;
    onRoundChange: (index: number) => void;
    onPasseChange: (index: number) => void;
    canGoPrevious: boolean;
    canGoNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    // Highlights the Next button teal once the current passe is fully scored — the
    // same "you're done here, move on" signal the old standalone advance button gave,
    // folded into this button instead of a second redundant ">" (post-ship feedback:
    // two ">" buttons on the same row/screen was confusing on both phone and tablet).
    nextHighlighted: boolean;
  } = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row md:items-end">
  <div class="flex items-end gap-2">
    <!-- Unconditional linear prev/next across the whole round/passe sequence (wraps
         round boundaries) — flanks the two dropdowns per post-ship feedback, for
         quickly switching back and forth between ends without reopening either
         dropdown, e.g. when alternating between two halves of the archer roster. -->
    <button
      type="button"
      aria-label={strings.scoring.previousButtonAria}
      disabled={disabled || !canGoPrevious}
      onclick={onPrevious}
      class="min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] font-semibold leading-[1.5] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      &lt;
    </button>

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

    <button
      type="button"
      aria-label={strings.scoring.nextButtonAria}
      disabled={disabled || !canGoNext}
      onclick={onNext}
      class={nextHighlighted
        ? 'min-h-[44px] min-w-[44px] rounded-lg bg-teal-500 px-3 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300'
        : 'min-h-[44px] min-w-[44px] rounded-lg border border-slate-200 bg-white px-3 text-[16px] font-semibold leading-[1.5] text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'}
    >
      &gt;
    </button>
  </div>
</div>
