<script lang="ts">
  import type { ScoreValue } from '../db/schema';
  import type { ResolvedRuleset } from '../utils/threeDScoring';
  import { strings } from '../i18n/strings.de';
  import GlassCard from './GlassCard.svelte';

  // v2 (3D milestone) slice 4 — the outcome picker for a single 3D target. Modal
  // dialog, same backdrop/Escape-dismiss behaviour as ScorePicker. Rows are the
  // ruleset's zones (Kill/Vital/Wound), columns the arrow ordinal (1./2./3. Pfeil);
  // each cell is one outcome token showing its point value. A full-width
  // "Fehlschuss" button covers M. One tap emits the token and closes.
  let {
    open,
    shooterName,
    stationLabel,
    ruleset,
    onselect,
    oncancel,
  }: {
    open: boolean;
    shooterName: string;
    stationLabel: string;
    ruleset: ResolvedRuleset | undefined;
    onselect: (token: ScoreValue) => void;
    oncancel: () => void;
  } = $props();

  let ordinals = $derived(
    ruleset ? Array.from({ length: ruleset.maxArrows }, (_, i) => i + 1) : []
  );

  function token(zone: string, ordinal: number): ScoreValue {
    return `${zone}${ordinal}` as ScoreValue;
  }
  function points(tok: ScoreValue): number {
    return ruleset?.points[tok] ?? 0;
  }

  const zoneButtonClass =
    'flex min-h-[56px] flex-col items-center justify-center rounded-lg border text-[15px] font-semibold leading-tight';
  function zoneColor(zone: string): string {
    if (zone === 'K')
      return 'border-teal-500 bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300';
    if (zone === 'V')
      return 'border-amber-400 bg-amber-400 text-slate-900 hover:bg-amber-500 dark:bg-amber-500';
    return 'border-orange-400 bg-orange-400 text-slate-900 hover:bg-orange-500 dark:bg-orange-500';
  }

  function handleKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') oncancel();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open && ruleset}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    onclick={oncancel}
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div onclick={(event) => event.stopPropagation()}>
      <GlassCard class="w-full max-w-[400px] p-6">
        <div role="dialog" aria-modal="true" aria-labelledby="outcome-grid-title">
          <h2
            id="outcome-grid-title"
            class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100"
          >
            {strings.scoring.outcomePickerTitle(shooterName, stationLabel)}
          </h2>

          {#if ruleset.maxArrows > 1}
            <div
              class="mb-1 grid gap-2 text-center text-[13px] leading-[1.4] text-slate-500 dark:text-slate-400"
              style="grid-template-columns: repeat({ruleset.maxArrows}, minmax(0, 1fr));"
            >
              {#each ordinals as ordinal (ordinal)}
                <span>{strings.scoring.outcomeArrowHeader(ordinal)}</span>
              {/each}
            </div>
          {/if}

          <div class="flex flex-col gap-2">
            {#each ruleset.zones as zone (zone.zone)}
              <div
                class="grid gap-2"
                style="grid-template-columns: repeat({ruleset.maxArrows}, minmax(0, 1fr));"
              >
                {#each ordinals as ordinal (ordinal)}
                  {@const tok = token(zone.zone, ordinal)}
                  <button
                    type="button"
                    class={`${zoneButtonClass} ${zoneColor(zone.zone)}`}
                    aria-label={strings.scoring.outcomeAria(
                      ruleset.maxArrows > 1
                        ? strings.scoring.outcomeZoneOrdinal(zone.label, ordinal)
                        : zone.label,
                      points(tok)
                    )}
                    onclick={() => onselect(tok)}
                  >
                    <span>{zone.label}</span>
                    <span class="text-[13px] font-normal opacity-90">{points(tok)}</span>
                  </button>
                {/each}
              </div>
            {/each}

            <button
              type="button"
              class="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-200 text-[15px] font-semibold leading-[1.5] text-slate-900 hover:bg-slate-300 dark:border-slate-500 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
              aria-label={strings.scoring.outcomeAria(strings.scoring.outcomeMiss, points('M'))}
              onclick={() => onselect('M')}
            >
              {strings.scoring.outcomeMiss}
              <span class="text-[13px] font-normal opacity-90">{points('M')}</span>
            </button>
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
