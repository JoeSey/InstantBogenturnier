<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Trash2 } from '@lucide/svelte';
  import { db } from '../db/schema';
  import { AGE_GROUP_OPTIONS, BOW_TYPE_OPTIONS, DISTANCE_OPTIONS } from '../fixtures/classOptions';
  import { generateClassName, autoSuffixOnCollision } from '../utils/classNameGenerator';
  import { strings } from '../i18n/strings.de';
  import DropdownWithCustom from './DropdownWithCustom.svelte';

  const ageGroupOptions = AGE_GROUP_OPTIONS.map((v) => ({ value: v, label: v }));
  const distanceOptions = DISTANCE_OPTIONS.map((v) => ({ value: v, label: v }));

  let ageGroup = $state('');
  let bowType = $state('');
  let distance = $state('');
  let classNameOverride = $state('');
  let confirmDeleteId = $state<number | null>(null);
  let deleteBlocked = $state<{ id: number; count: number } | null>(null);
  let errorFeedback = $state('');

  const existingClassesQuery = liveQuery(() => db.classes.toArray());
  let existingClasses = $derived($existingClassesQuery ?? []);

  let tupleName = $derived(generateClassName(ageGroup, bowType, distance));
  let finalSuggestedName = $derived(
    autoSuffixOnCollision(tupleName, { ageGroup, bowType, distance }, existingClasses)
  );

  async function addClass() {
    // SETUP-01: at least one tuple field required — silently no-op otherwise.
    if (!ageGroup && !bowType && !distance) return;

    errorFeedback = '';
    const nameToSave = autoSuffixOnCollision(
      classNameOverride.trim() || finalSuggestedName,
      { ageGroup, bowType, distance },
      existingClasses
    );

    try {
      await db.classes.add({
        name: nameToSave,
        ageGroup: ageGroup || undefined,
        bowType: bowType || undefined,
        distance: distance || undefined,
      });
    } catch (err) {
      // WR-04: surface write failures (e.g. storage quota exceeded) instead of failing
      // silently while the trainer believes the class was saved.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
      return;
    }

    ageGroup = '';
    bowType = '';
    distance = '';
    classNameOverride = '';
  }

  async function requestDelete(id: number | undefined) {
    if (id === undefined) return;
    deleteBlocked = null;
    // CR-02: block deletion while shooters still reference this class via `classId` —
    // otherwise the roster is left with a dangling foreign key and Registration.svelte
    // silently renders a blank class column, with no warning to the trainer.
    const dependentCount = await db.shooters.where('classId').equals(id).count();
    if (dependentCount > 0) {
      deleteBlocked = { id, count: dependentCount };
      return;
    }
    confirmDeleteId = id;
  }

  function cancelDelete() {
    confirmDeleteId = null;
  }

  function dismissDeleteBlocked() {
    deleteBlocked = null;
  }

  async function confirmDelete(id: number | undefined) {
    if (id === undefined) return;
    errorFeedback = '';
    try {
      await db.classes.delete(id);
    } catch (err) {
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
      return;
    }
    confirmDeleteId = null;
  }
</script>

<h3 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
  {strings.setup.addClassHeading}
</h3>

<div class="flex flex-col gap-4">
  <DropdownWithCustom
    label={strings.setup.ageLabel}
    options={ageGroupOptions}
    value={ageGroup}
    onchange={(v) => (ageGroup = v)}
  />
  <DropdownWithCustom
    label={strings.setup.bowTypeLabel}
    options={BOW_TYPE_OPTIONS}
    value={bowType}
    onchange={(v) => (bowType = v)}
  />
  <DropdownWithCustom
    label={strings.setup.distanceLabel}
    options={distanceOptions}
    value={distance}
    onchange={(v) => (distance = v)}
  />

  <p class="text-[16px] leading-[1.5] text-slate-600 dark:text-slate-300">
    {strings.setup.classNameSuggestion.replace('{name}', finalSuggestedName)}
  </p>

  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.setup.classNameLabel}
    <input
      type="text"
      maxlength="50"
      bind:value={classNameOverride}
      placeholder={finalSuggestedName}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  </label>

  <button
    type="button"
    onclick={addClass}
    class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    {strings.setup.addClassButton}
  </button>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}
</div>

<ul class="mt-6 flex flex-col gap-2">
  {#each existingClasses as cls (cls.id)}
    <li class="flex min-h-[44px] items-center justify-between rounded-lg bg-white p-3 text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100">
      {#if confirmDeleteId === cls.id}
        <div class="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span class="text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
            {strings.setup.classDeleteConfirm(cls.name)}
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              onclick={() => confirmDelete(cls.id)}
              class="min-h-[44px] rounded-lg bg-red-600 px-3 py-2 text-[14px] font-semibold leading-[1.4] text-white hover:bg-red-700 dark:bg-red-400 dark:text-slate-900"
            >
              {strings.setup.classDeleteConfirmYes}
            </button>
            <button
              type="button"
              onclick={cancelDelete}
              class="min-h-[44px] rounded-lg px-3 py-2 text-[14px] leading-[1.4] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {strings.setup.classDeleteCancel}
            </button>
          </div>
        </div>
      {:else}
        <div class="flex w-full flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-col">
            <span>{cls.name}</span>
            {#if deleteBlocked && deleteBlocked.id === cls.id}
              <span class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">
                {strings.setup.classDeleteBlocked(deleteBlocked.count)}
              </span>
            {/if}
          </div>
          {#if deleteBlocked?.id === cls.id}
            <button
              type="button"
              onclick={dismissDeleteBlocked}
              class="min-h-[44px] rounded-lg px-3 py-2 text-[14px] leading-[1.4] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              {strings.setup.classDeleteCancel}
            </button>
          {:else}
            <button
              type="button"
              onclick={() => requestDelete(cls.id)}
              aria-label={strings.setup.classDeleteAction}
              class="flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
            </button>
          {/if}
        </div>
      {/if}
    </li>
  {/each}
</ul>
