<script lang="ts">
  import { db } from '../db/schema';
  import { WA_PRESETS } from '../fixtures/waPresets';
  import { strings } from '../i18n/strings.de';

  const presetLabels: Record<string, string> = {
    'wa-18m': strings.setup.wa18m,
    'wa-25m': strings.setup.wa25m,
    'wa-70m': strings.setup.wa70m,
  };

  let selectedMode = $state<'preset' | 'custom'>('preset');
  let selectedPresetId = $state<string>(WA_PRESETS[0].id);

  let customRounds = $state(1);
  let customPassesPerRound = $state(10);
  let customArrowsPerPasse = $state(3);
  let customDistance = $state('18m');

  // SETUP-04: resolve either the selected WA preset or the custom fields into a single
  // shape ready to persist to db.rounds (and drive the live summary line below).
  let resolvedConfig = $derived.by(() => {
    if (selectedMode === 'preset') {
      const preset = WA_PRESETS.find((p) => p.id === selectedPresetId) ?? WA_PRESETS[0];
      return {
        arrowsPerPasse: preset.arrowsPerPasse,
        passesPerRound: preset.passesPerRound,
        numberOfRounds: preset.numberOfRounds,
        distance: preset.distance,
        presetId: preset.id as string | undefined,
      };
    }
    return {
      arrowsPerPasse: customArrowsPerPasse,
      passesPerRound: customPassesPerRound,
      numberOfRounds: customRounds,
      distance: customDistance,
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
      config.arrowsPerPasse <= 20
    );
  }

  async function save() {
    if (!isValidResolvedConfig(resolvedConfig)) return;
    await db.rounds.put({ id: 1, ...resolvedConfig });
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
        onchange={() => (selectedMode = 'preset')}
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
        onchange={() => (selectedMode = 'custom')}
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
            onchange={() => (selectedPresetId = preset.id)}
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
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
        {strings.setup.customDistanceLabel}
        <input
          type="text"
          bind:value={customDistance}
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
    </div>
  {/if}

  <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
    {resolvedConfig.passesPerRound} Passen, {resolvedConfig.arrowsPerPasse} Pfeile, {resolvedConfig.distance}
  </p>

  <button
    type="button"
    onclick={save}
    class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    {strings.setup.saveButton}
  </button>
</div>
