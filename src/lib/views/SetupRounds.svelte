<script lang="ts">
  import { liveQuery } from 'dexie';
  import { FileDown } from '@lucide/svelte';
  import { db } from '../db/schema';
  import type {
    RoundConfig,
    RoundRuleset,
    ScoreEntryMode,
    ScoringMode,
    ThreeDTemplateId,
  } from '../db/schema';
  import { WA_PRESETS } from '../fixtures/waPresets';
  import { THREE_D_TEMPLATES, getThreeDTemplate } from '../fixtures/threeDTemplates';
  import { defaultRoundRuleset } from '../utils/threeDScoring';
  import ThreeDPointGrid from '../components/ThreeDPointGrid.svelte';
  import { strings } from '../i18n/strings.de';
  import { generateScoresheetPdf, scoresheetPdfFilename } from '../utils/scoresheetExport';
  import { downloadBlob } from '../utils/downloadBlob';
  import { describeError } from '../utils/errorDetail';

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

  // Score-entry layout preference — persisted on the same db.rounds singleton, but
  // view-only (never affects stored scores/ranking) and, unlike the rounds config
  // itself, intentionally left OUT of saved presets. Rehydrated below alongside the
  // rest of the config.
  let entryMode = $state<ScoreEntryMode>('byRound');
  const entryModeOptions = [
    { value: 'byRound', label: strings.setup.entryModeByRound },
    { value: 'byArcherLine', label: strings.setup.entryModeByLine },
    { value: 'byArcherName', label: strings.setup.entryModeByName },
  ] as const;

  // v2 — 3D-Wertung. `scoringMode` toggles the whole card between the ring-target
  // setup above and the 3D parcours setup below. In 3d mode a course has
  // `threeDLegs` legs, `threeDStations` stations per leg (shared), and one ruleset
  // per leg (`threeDRulesets`, kept length-synced with `threeDLegs`). Persisted
  // shape: RoundConfig { scoringMode:'3d', numberOfRounds=legs, passesPerRound=
  // stations, arrowsPerPasse=entriesPerTarget, roundRulesets }.
  let scoringMode = $state<ScoringMode>('rings');
  const scoringModeOptions = [
    { value: 'rings', label: strings.setup.scoringModeRings },
    { value: '3d', label: strings.setup.scoringMode3d },
  ] as const;
  const threeDTemplateOptions = THREE_D_TEMPLATES.map((t) => ({ value: t.id, label: t.label }));
  let threeDLegs = $state(1);
  let threeDStations = $state(20);
  let threeDRulesets = $state<RoundRuleset[]>([defaultRoundRuleset('dfbv-3arrow')]);
  // Club-wide hit-zone display names. Only the first leg's point table exposes the
  // inputs; every leg (and both PDF exports) reads this same map. Empty string ⇒ use
  // the template default for that zone.
  let threeDZoneLabels = $state<Record<'K' | 'V' | 'W', string>>({ K: '', V: '', W: '' });
  const THREE_D_ZONES = ['K', 'V', 'W'] as const;

  function syncRulesetLength() {
    const n = threeDLegs;
    if (!Number.isInteger(n) || n < 1) return;
    if (threeDRulesets.length < n) {
      threeDRulesets = [
        ...threeDRulesets,
        ...Array.from({ length: n - threeDRulesets.length }, () =>
          defaultRoundRuleset('dfbv-3arrow')
        ),
      ];
    } else if (threeDRulesets.length > n) {
      threeDRulesets = threeDRulesets.slice(0, n);
    }
  }

  let threeDResolvedConfig = $derived<Omit<RoundConfig, 'id'>>({
    arrowsPerPasse: Math.max(
      1,
      ...threeDRulesets.map((rr) => getThreeDTemplate(rr.templateId).entriesPerTarget)
    ),
    passesPerRound: threeDStations,
    numberOfRounds: threeDLegs,
    rings: 10,
    presetId: undefined,
    scoringMode: '3d',
    // Plain (non-proxy) copies — a raw Svelte $state array/object can't be
    // structured-cloned into IndexedDB (DataCloneError).
    roundRulesets: threeDRulesets.map((rr) => ({
      templateId: rr.templateId,
      points: { ...rr.points },
    })),
    threeDZoneLabels: normalizedZoneLabels(),
  });

  // Trim the free-text zone names and drop the blanks, so an untouched config stores
  // no `threeDZoneLabels` at all (⇒ template defaults) rather than three empty strings.
  function normalizedZoneLabels(): Partial<Record<'K' | 'V' | 'W', string>> | undefined {
    const out: Partial<Record<'K' | 'V' | 'W', string>> = {};
    for (const zone of THREE_D_ZONES) {
      const trimmed = threeDZoneLabels[zone].trim();
      if (trimmed) out[zone] = trimmed;
    }
    return Object.keys(out).length ? out : undefined;
  }

  function isValidThreeDConfig(): boolean {
    return (
      Number.isInteger(threeDLegs) &&
      threeDLegs >= 1 &&
      threeDLegs <= 10 &&
      Number.isInteger(threeDStations) &&
      threeDStations >= 1 &&
      threeDStations <= 60 &&
      threeDRulesets.length === threeDLegs &&
      threeDRulesets.every((rr) => THREE_D_TEMPLATES.some((t) => t.id === rr.templateId))
    );
  }

  function legIsCustomised(index: number): boolean {
    const rr = threeDRulesets[index];
    if (!rr) return false;
    const template = getThreeDTemplate(rr.templateId);
    return template.tokens.some(
      (token) => (rr.points[token] ?? template.defaultPoints[token]) !== template.defaultPoints[token]
    );
  }

  function setScoringMode(mode: ScoringMode) {
    scoringMode = mode;
    if (mode === '3d') {
      syncRulesetLength();
      // 'byRound' entry has no meaning on a 3D parcours — everyone hands in a whole card.
      if (entryMode === 'byRound') entryMode = 'byArcherLine';
    }
    save();
  }

  function setLegTemplate(index: number, templateId: ThreeDTemplateId) {
    // Switching the ruleset resets that leg's points to the new template's defaults.
    threeDRulesets = threeDRulesets.map((rr, i) => (i === index ? defaultRoundRuleset(templateId) : rr));
    save();
  }

  function setLegPoints(index: number, points: RoundRuleset['points']) {
    threeDRulesets = threeDRulesets.map((rr, i) => (i === index ? { ...rr, points } : rr));
    save();
  }

  function resetLegPoints(index: number) {
    setLegPoints(index, { ...getThreeDTemplate(threeDRulesets[index].templateId).defaultPoints });
  }

  function setZoneLabel(zone: string, label: string) {
    if (zone !== 'K' && zone !== 'V' && zone !== 'W') return;
    threeDZoneLabels = { ...threeDZoneLabels, [zone]: label };
    save();
  }

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
    entryMode = cfg.entryMode ?? 'byRound';
    scoringMode = cfg.scoringMode ?? 'rings';
    if (cfg.scoringMode === '3d') {
      threeDLegs = cfg.numberOfRounds;
      threeDStations = cfg.passesPerRound;
      threeDRulesets = (cfg.roundRulesets ?? []).map((rr) => ({
        templateId: rr.templateId,
        points: { ...rr.points },
      }));
      threeDZoneLabels = {
        K: cfg.threeDZoneLabels?.K ?? '',
        V: cfg.threeDZoneLabels?.V ?? '',
        W: cfg.threeDZoneLabels?.W ?? '',
      };
      syncRulesetLength();
    } else if (cfg.presetId) {
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
    if (scoringMode === '3d') {
      if (!isValidThreeDConfig()) return;
      await db.rounds.put({ id: 1, ...threeDResolvedConfig, entryMode });
      return;
    }
    if (!isValidResolvedConfig(resolvedConfig)) return;
    await db.rounds.put({ id: 1, ...resolvedConfig, entryMode });
  }

  // The entry-mode toggle stays available even once the tournament is finalized: it
  // changes no tournament data, only how the Erfassung tab is laid out, so a trainer
  // reviewing finished 3D cards can still switch to the per-archer view.
  function setEntryMode(mode: ScoreEntryMode) {
    entryMode = mode;
    save();
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
      await downloadBlob(blob, scoresheetPdfFilename());
    } catch (err) {
      errorFeedback = `${strings.scoresheetExport.exportError} [${describeError(err)}]`;
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-2">
    <span class="block text-[14px] font-semibold leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.setup.scoringModeLabel}
    </span>
    <div class="flex flex-wrap gap-4">
      {#each scoringModeOptions as opt (opt.value)}
        <label
          class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
        >
          <input
            type="radio"
            name="scoring-mode"
            value={opt.value}
            checked={scoringMode === opt.value}
            onchange={() => setScoringMode(opt.value)}
            disabled={isFinalized}
          />
          {opt.label}
        </label>
      {/each}
    </div>
  </div>

  {#if scoringMode === 'rings'}
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
  {:else}
  <div class="flex flex-col gap-4">
    <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.setup.threeDStationsLabel}
      <input
        type="number"
        min="1"
        max="60"
        step="1"
        bind:value={threeDStations}
        onchange={save}
        disabled={isFinalized}
        class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
    <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.setup.threeDLegsLabel}
      <input
        type="number"
        min="1"
        max="10"
        step="1"
        bind:value={threeDLegs}
        onchange={() => {
          syncRulesetLength();
          save();
        }}
        disabled={isFinalized}
        class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
      />
    </label>
    <p class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.setup.threeDLegsHelper}
    </p>

    {#each threeDRulesets as ruleset, i (i)}
      <div class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
        <span class="text-[14px] font-semibold leading-[1.4] text-slate-700 dark:text-slate-200">
          {strings.setup.threeDLegHeading(i + 1)}
        </span>
        <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
          {strings.setup.threeDTemplateLabel}
          <select
            value={ruleset.templateId}
            onchange={(e) =>
              setLegTemplate(i, (e.currentTarget as HTMLSelectElement).value as ThreeDTemplateId)}
            disabled={isFinalized}
            class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            {#each threeDTemplateOptions as opt (opt.value)}
              <option value={opt.value}>{opt.label}</option>
            {/each}
          </select>
        </label>
        {#if i === 0}
          <fieldset class="flex flex-col gap-2 border-t border-slate-200 pt-2 dark:border-slate-600">
            <legend class="text-[14px] font-semibold leading-[1.4] text-slate-700 dark:text-slate-200">
              {strings.setup.threeDZoneNamesLegend}
            </legend>
            <div class="flex flex-wrap gap-3">
              {#each THREE_D_ZONES as zone (zone)}
                <label class="flex flex-col gap-1 text-[13px] leading-[1.4] text-slate-600 dark:text-slate-300">
                  {strings.setup.threeDZoneDefault(zone)}
                  <input
                    type="text"
                    value={threeDZoneLabels[zone]}
                    placeholder={strings.setup.threeDZoneDefault(zone)}
                    aria-label={strings.setup.threeDZoneNameLabel(strings.setup.threeDZoneDefault(zone))}
                    disabled={isFinalized}
                    onchange={(e) => setZoneLabel(zone, (e.currentTarget as HTMLInputElement).value)}
                    class="min-h-[44px] w-40 rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  />
                </label>
              {/each}
            </div>
            <p class="text-[13px] leading-[1.4] text-slate-500 dark:text-slate-400">
              {strings.setup.threeDZoneNamesHelper}
            </p>
          </fieldset>
        {/if}
        <details>
          <summary class="cursor-pointer text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
            {strings.setup.threeDPointsSummary}
            <span class="text-slate-400 dark:text-slate-500">
              {legIsCustomised(i)
                ? strings.setup.threeDPointsCustom
                : strings.setup.threeDPointsStandard}
            </span>
          </summary>
          <div class="mt-2 flex flex-col gap-2">
            <ThreeDPointGrid
              templateId={ruleset.templateId}
              points={ruleset.points}
              zoneLabels={threeDZoneLabels}
              disabled={isFinalized}
              onchange={(points) => setLegPoints(i, points)}
            />
            {#if legIsCustomised(i) && !isFinalized}
              <button
                type="button"
                onclick={() => resetLegPoints(i)}
                class="self-start text-[14px] leading-[1.4] text-teal-600 underline hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
              >
                {strings.setup.threeDPointsReset}
              </button>
            {/if}
          </div>
        </details>
      </div>
    {/each}
  </div>
  {/if}

  <div class="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-600">
    <span class="block text-[14px] font-semibold leading-[1.4] text-slate-700 dark:text-slate-200">
      {strings.setup.entryModeLabel}
    </span>
    <p class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.setup.entryModeHelper}
    </p>
    {#each entryModeOptions as opt (opt.value)}
      <label
        class="flex items-center gap-2 text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200"
      >
        <input
          type="radio"
          name="entry-mode"
          value={opt.value}
          checked={entryMode === opt.value}
          onchange={() => setEntryMode(opt.value)}
          disabled={opt.value === 'byRound' && scoringMode === '3d'}
        />
        {opt.label}
      </label>
    {/each}
  </div>

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
