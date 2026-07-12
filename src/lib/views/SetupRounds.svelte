<script lang="ts">
  import { liveQuery } from 'dexie';
  import { FileDown } from '@lucide/svelte';
  import { db } from '../db/schema';
  import { WA_PRESETS } from '../fixtures/waPresets';
  import { strings } from '../i18n/strings.de';
  import { generateScoresheetPdf, scoresheetPdfFilename } from '../utils/scoresheetExport';

  // RES-06/D-11/D-12 (04-03-PLAN.md Task 3): once finalized, the entire rounds/passes
  // config form is disabled — the parent Setup.svelte derives and passes this down via
  // the shared computeIsFinalized so the boolean is never re-derived here.
  let { isFinalized = false }: { isFinalized?: boolean } = $props();

  const presetLabels: Record<string, string> = {
    'wa-10x3': strings.setup.presetWa10x3,
    'dfbv-6x5': strings.setup.presetDfbv6x5,
    'wa-70': strings.setup.presetWa70,
  };

  let selectedMode = $state<'preset' | 'custom'>('preset');
  let selectedPresetId = $state<string>(WA_PRESETS[0].id);

  let customRounds = $state(1);
  let customPassesPerRound = $state(10);
  let customArrowsPerPasse = $state(3);
  let customRings = $state<10 | 5>(10);

  // CR-01 (04-REVIEW.md): App.svelte destroys/recreates views on nav, so this component
  // remounts to hardcoded defaults every time the trainer revisits Einrichtung. Rehydrate
  // from the persisted db.rounds record once on first load so saving doesn't silently
  // overwrite a real configuration with defaults.
  const existingConfigQuery = liveQuery(() => db.rounds.get(1));
  let existingConfig = $derived($existingConfigQuery);
  let hydrated = false;
  $effect(() => {
    const cfg = existingConfig;
    if (!cfg || hydrated) return;
    hydrated = true;
    if (cfg.presetId) {
      selectedMode = 'preset';
      selectedPresetId = cfg.presetId;
    } else {
      selectedMode = 'custom';
      customRounds = cfg.numberOfRounds;
      customPassesPerRound = cfg.passesPerRound;
      customArrowsPerPasse = cfg.arrowsPerPasse;
      customRings = cfg.rings ?? 10;
    }
  });

  // The WA-preset radio already looks selected by default (selectedMode's initial
  // value), but nothing is actually persisted to db.rounds until an onchange fires --
  // so a fresh install where the trainer navigates straight to Erfassung without
  // touching a radio/input hits Erfassung's "not configured" placeholder with no clue
  // why, even though Einrichtung visibly shows a selected preset. `existingConfig` from
  // the liveQuery above can't distinguish "not loaded yet" from "confirmed absent"
  // (Dexie resolves a missing key as `undefined`, same as liveQuery's pre-resolution
  // state), so check directly via a one-shot read instead of relying on that value.
  let checkedForMissingConfig = false;
  $effect(() => {
    if (checkedForMissingConfig) return;
    checkedForMissingConfig = true;
    (async () => {
      const cfg = await db.rounds.get(1);
      if (cfg === undefined && !isFinalized) {
        await save();
      }
    })();
  });

  // SETUP-04: resolve either the selected WA preset or the custom fields into a single
  // shape ready to persist to db.rounds (and drive the live summary line below).
  let resolvedConfig = $derived.by(() => {
    if (selectedMode === 'preset') {
      const preset = WA_PRESETS.find((p) => p.id === selectedPresetId) ?? WA_PRESETS[0];
      return {
        arrowsPerPasse: preset.arrowsPerPasse,
        passesPerRound: preset.passesPerRound,
        numberOfRounds: preset.numberOfRounds,
        rings: preset.rings as 10 | 5,
        presetId: preset.id as string | undefined,
      };
    }
    return {
      arrowsPerPasse: customArrowsPerPasse,
      passesPerRound: customPassesPerRound,
      numberOfRounds: customRounds,
      rings: customRings,
      presetId: undefined as string | undefined,
    };
  });

  // WR-03: Svelte's number binding on an emptied input yields NaN, and the `min`/`max`
  // attributes on the inputs below are only HTML hints, not enforced values. Validate
  // the resolved config before persisting so a cleared field can't silently write NaN
  // into db.rounds -- mirrors Setup.svelte's handleLineCountChange integer/range guard.
  function isValidResolvedConfig(config: typeof resolvedConfig): boolean {
    return (
      Number.isInteger(config.numberOfRounds) &&
      config.numberOfRounds >= 1 &&
      config.numberOfRounds <= 20 &&
      Number.isInteger(config.passesPerRound) &&
      config.passesPerRound >= 1 &&
      config.passesPerRound <= 30 &&
      Number.isInteger(config.arrowsPerPasse) &&
      config.arrowsPerPasse >= 1 &&
      config.arrowsPerPasse <= 20 &&
      (config.rings === 10 || config.rings === 5)
    );
  }

  async function save() {
    if (!isValidResolvedConfig(resolvedConfig)) return;
    await db.rounds.put({ id: 1, ...resolvedConfig });
  }

  // SHEET-01/T-07-04: blank scoresheet PDF download, mirrors Results.svelte's
  // handleExport settings-fetch + WR-04 append-before-click download pattern exactly.
  let errorFeedback = $state('');

  async function handleScoresheetExport() {
    errorFeedback = '';
    if (!existingConfig) {
      errorFeedback = strings.scoresheetExport.exportError;
      return;
    }
    try {
      const settings = (await db.settings.get(1)) ?? { id: 1 as const };
      const blob = await generateScoresheetPdf(existingConfig, settings);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = scoresheetPdfFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      errorFeedback = strings.scoresheetExport.exportError;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-4">
    <label
      class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
    >
      <input
        type="radio"
        name="rounds-mode"
        value="preset"
        checked={selectedMode === 'preset'}
        onchange={() => {
          selectedMode = 'preset';
          save();
        }}
        disabled={isFinalized}
      />
      {strings.setup.waPresetsLabel}
    </label>
    <label
      class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
    >
      <input
        type="radio"
        name="rounds-mode"
        value="custom"
        checked={selectedMode === 'custom'}
        onchange={() => {
          selectedMode = 'custom';
          save();
        }}
        disabled={isFinalized}
      />
      {strings.setup.customLabel}
    </label>
  </div>

  {#if selectedMode === 'preset'}
    <div class="flex flex-col gap-2">
      {#each WA_PRESETS as preset (preset.id)}
        <label
          class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
        >
          <input
            type="radio"
            name="wa-preset"
            value={preset.id}
            checked={selectedPresetId === preset.id}
            onchange={() => {
              selectedPresetId = preset.id;
              save();
            }}
            disabled={isFinalized}
          />
          {presetLabels[preset.id]}
        </label>
      {/each}
    </div>
  {:else}
    <div class="flex flex-col gap-4">
      <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
        {strings.setup.roundsCountLabel}
        <input
          type="number"
          min="1"
          step="1"
          bind:value={customRounds}
          onchange={save}
          disabled={isFinalized}
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
        {strings.setup.passesPerRoundLabel}
        <input
          type="number"
          min="1"
          max="30"
          step="1"
          bind:value={customPassesPerRound}
          onchange={save}
          disabled={isFinalized}
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
        {strings.setup.arrowsPerPassLabel}
        <input
          type="number"
          min="1"
          max="20"
          step="1"
          bind:value={customArrowsPerPasse}
          onchange={save}
          disabled={isFinalized}
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <div class="flex flex-col gap-2">
        <span class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
          {strings.setup.customRingsLabel}
        </span>
        <label
          class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
        >
          <input
            type="radio"
            name="custom-rings"
            value="10"
            checked={customRings === 10}
            onchange={() => {
              customRings = 10;
              save();
            }}
            disabled={isFinalized}
          />
          {strings.setup.rings10Label}
        </label>
        <label
          class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
        >
          <input
            type="radio"
            name="custom-rings"
            value="5"
            checked={customRings === 5}
            onchange={() => {
              customRings = 5;
              save();
            }}
            disabled={isFinalized}
          />
          {strings.setup.rings5Label}
        </label>
      </div>
    </div>
  {/if}

  <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
    {resolvedConfig.passesPerRound} Passen, {resolvedConfig.arrowsPerPasse} Pfeile, {resolvedConfig.rings} Ringe
  </p>

  <button
    type="button"
    onclick={handleScoresheetExport}
    disabled={!existingConfig}
    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    <FileDown size={20} />
    {strings.scoresheetExport.downloadButton}
  </button>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}
</div>
