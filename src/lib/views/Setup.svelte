<script lang="ts">
  import { liveQuery } from 'dexie';
  import GlassCard from '../components/GlassCard.svelte';
  import ClassForm from '../components/ClassForm.svelte';
  import SetupRounds from './SetupRounds.svelte';
  import PresetSave from '../components/PresetSave.svelte';
  import PresetList from './PresetList.svelte';
  import { db } from '../db/schema';
  import { strings } from '../i18n/strings.de';

  // SETUP-03: shooting-line count, singleton row (id: 1), clamped 1-10.
  const lineConfigQuery = liveQuery(() => db.shootingLines.get(1));
  let lineCount = $derived($lineConfigQuery?.count ?? 2);

  async function handleLineCountChange(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (!Number.isInteger(value) || value < 1 || value > 10) return;
    await db.shootingLines.put({ id: 1, count: value });
  }
</script>

<div class="mx-auto max-w-[480px] p-4">
  <h1 class="mb-6 text-[28px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
    {strings.setup.heading}
  </h1>

  <section class="mb-6">
    <GlassCard class="p-4 md:p-6">
      <ClassForm />
    </GlassCard>
  </section>

  <section class="mb-6">
    <GlassCard class="p-4 md:p-6">
      <h3 class="mb-2 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.setup.linesLabel}
      </h3>
      <p class="mb-4 text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
        {strings.setup.linesHelper}
      </p>
      <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
        {strings.setup.linesLabel}
        <input
          type="number"
          min="1"
          max="10"
          step="1"
          value={lineCount}
          onchange={handleLineCountChange}
          class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
    </GlassCard>
  </section>

  <section class="mb-6">
    <GlassCard class="p-4 md:p-6">
      <h3 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.setup.roundsLabel}
      </h3>
      <SetupRounds />
    </GlassCard>
  </section>

  <section class="mb-6">
    <GlassCard class="p-4 md:p-6">
      <h3 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
        {strings.presets.heading}
      </h3>
      <PresetSave />
      <PresetList />
    </GlassCard>
  </section>
</div>
