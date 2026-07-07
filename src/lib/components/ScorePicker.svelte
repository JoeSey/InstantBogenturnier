<script lang="ts">
  import type { ScoreValue } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { scoreColorCategory } from '../utils/scoreColor';
  import GlassCard from './GlassCard.svelte';

  // Tap-button score picker (D-01, D-02, 03-01-PLAN.md Task 2). Backdrop-dismissible
  // (quick task 260705-lpv) — unlike ConfirmDialog.svelte, which stays non-dismissible
  // because it guards destructive/overwriting actions — plus an Escape-key path in
  // addition to the explicit "Abbrechen" button, since this modal has no destructive
  // default action to guard against. Quick task 260705-ok7: the dialog title now shows
  // a live rowPreview-driven per-arrow preview of the current row (dashes for unfilled
  // arrows), recomputed on every pick while the dialog stays open.
  let {
    open,
    shooterName,
    rowPreview,
    onselect,
    oncancel,
  }: {
    open: boolean;
    shooterName: string;
    rowPreview: (ScoreValue | null)[];
    onselect: (value: ScoreValue) => void;
    oncancel: () => void;
  } = $props();

  let previewText = $derived(rowPreview.map((v) => v ?? '-').join(' '));

  const SCORE_VALUES: ScoreValue[] = [
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    '10',
    'X',
    'M',
  ];

  function ariaLabelFor(value: ScoreValue): string {
    if (value === 'M') return strings.scoring.pickerAriaMiss;
    if (value === 'X') return strings.scoring.pickerAriaX;
    return strings.scoring.pickerAriaNumeric(value);
  }

  function buttonClass(value: ScoreValue): string {
    const base =
      'flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[16px] font-semibold leading-[1.5]';
    const category = scoreColorCategory(value);
    if (category === 'yellow') {
      return `${base} border border-amber-200 bg-amber-400 text-slate-900 hover:bg-amber-500 dark:border-amber-300/40 dark:bg-amber-500 dark:text-slate-900`;
    }
    if (category === 'miss') {
      return `${base} border border-gray-200 bg-gray-300 text-slate-900 hover:bg-gray-400 dark:border-gray-400/40 dark:bg-gray-500 dark:text-slate-900`;
    }
    if (category === 'red') {
      return `${base} border border-red-400 bg-red-500 text-white hover:bg-red-600 dark:border-red-400/40 dark:bg-red-600 dark:text-white`;
    }
    if (category === 'blue') {
      return `${base} border border-blue-400 bg-blue-500 text-white hover:bg-blue-600 dark:border-blue-400/40 dark:bg-blue-600 dark:text-white`;
    }
    if (category === 'black') {
      return `${base} border border-slate-700 bg-slate-900 text-white hover:bg-slate-950 dark:border-slate-600/40 dark:bg-slate-950 dark:text-white`;
    }
    return `${base} border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-400/40 dark:bg-slate-100 dark:text-slate-900`;
  }

  // Keyboard shortcuts for desktop score entry (post-ship UAT feedback): trainers on a
  // desktop/laptop want to type scores rather than click, while tablet users still tap
  // — this only listens for physical keydown events, it never opens/relies on the
  // on-screen keyboard. Digits 1-9 map directly; "0" maps to '10' (no ScoreValue '0'
  // exists); "x"/"X" and "m"/"M" map to the X-ring and miss values. Ignore keystrokes
  // with a modifier held (Ctrl/Meta/Alt) so this doesn't fight browser shortcuts.
  const KEY_TO_SCORE: Record<string, ScoreValue> = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    '5': '5',
    '6': '6',
    '7': '7',
    '8': '8',
    '9': '9',
    '0': '10',
    x: 'X',
    m: 'M',
  };

  function handleKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      oncancel();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const value = KEY_TO_SCORE[event.key.toLowerCase()];
    if (value) {
      event.preventDefault();
      onselect(value);
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onclick={oncancel}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick={(event) => event.stopPropagation()}>
      <GlassCard class="w-full max-w-[360px] p-6">
        <div role="dialog" aria-modal="true" aria-labelledby="score-picker-title">
          <h2
            id="score-picker-title"
            class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100"
          >
            {strings.scoring.pickerTitle(shooterName, previewText)}
          </h2>

          <div class="grid grid-cols-5 gap-2">
            {#each SCORE_VALUES as value (value)}
              <button
                type="button"
                class={buttonClass(value)}
                aria-label={ariaLabelFor(value)}
                onclick={() => onselect(value)}
              >
                {value}
              </button>
            {/each}
          </div>

          <div class="mt-6 flex justify-end">
            <button
              type="button"
              onclick={oncancel}
              class="min-h-[44px] rounded-lg px-4 py-2 text-[16px] leading-[1.5] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {strings.scoring.pickerCancel}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
{/if}
