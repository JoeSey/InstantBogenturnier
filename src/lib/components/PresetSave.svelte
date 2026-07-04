<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../db/schema';
  import type { RoundConfig } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import ConfirmDialog from './ConfirmDialog.svelte';

  // SETUP-05 (D-11/D-12/D-13): save the current classes/lines/rounds configuration as
  // a named preset, capped at 8, with an overwrite-confirmation prompt on name collision.
  let presetName = $state('Mein Turnier');
  let capacityWarningVisible = $state(false);
  let showCollisionDialog = $state(false);
  let pendingName = $state('');
  let errorFeedback = $state('');

  const presetsCountQuery = liveQuery(() => db.presets.count());
  let presetCount = $derived($presetsCountQuery ?? 0);

  async function performSave(nameToSave: string) {
    errorFeedback = '';
    try {
      const existing = await db.presets.where('name').equals(nameToSave).first();
      const classes = await db.classes.toArray();
      const shootingLineCount = (await db.shootingLines.get(1))?.count ?? 2;
      const roundsRecord = await db.rounds.get(1);
      const roundsConfig: Omit<RoundConfig, 'id'> = roundsRecord
        ? {
            arrowsPerPasse: roundsRecord.arrowsPerPasse,
            passesPerRound: roundsRecord.passesPerRound,
            numberOfRounds: roundsRecord.numberOfRounds,
            distance: roundsRecord.distance,
            presetId: roundsRecord.presetId,
          }
        : { arrowsPerPasse: 3, passesPerRound: 10, numberOfRounds: 1, distance: '18m' };

      // `put` with the existing record's id updates it in place (overwrite), rather than
      // creating a duplicate row for the same name.
      await db.presets.put({
        ...(existing ? { id: existing.id } : {}),
        name: nameToSave,
        classes,
        shootingLineCount,
        roundsConfig,
        createdAt: new Date(),
      });

      showCollisionDialog = false;
      capacityWarningVisible = false;
    } catch (err) {
      // WR-04: surface write failures instead of failing silently.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  async function handleSubmit() {
    capacityWarningVisible = false;
    const trimmedName = presetName.trim();
    if (!trimmedName) return;

    const existing = await db.presets.where('name').equals(trimmedName).first();
    // Read the count directly from the DB rather than the liveQuery-derived display
    // value — the liveQuery may not have resolved its first result yet (falls back to
    // 0 until then), which would otherwise let the capacity cap be bypassed on a save
    // that happens before the reactive query settles.
    const count = await db.presets.count();

    if (count >= 8 && !existing) {
      capacityWarningVisible = true;
      return;
    }

    if (existing) {
      pendingName = trimmedName;
      showCollisionDialog = true;
      return;
    }

    await performSave(trimmedName);
  }

  function confirmOverwrite() {
    void performSave(pendingName);
  }

  function cancelOverwrite() {
    showCollisionDialog = false;
  }
</script>

<h3 class="mb-2 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
  {strings.presets.saveHeading}
</h3>

<div class="flex flex-col gap-4">
  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.presets.nameLabel}
    <input
      type="text"
      maxlength="50"
      bind:value={presetName}
      placeholder={strings.presets.nameHelper}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  </label>

  <p class="text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
    {strings.presets.capacityIndicator.replace('{count}', String(presetCount))}
  </p>

  {#if capacityWarningVisible}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">
      {strings.presets.capacityWarning}
    </p>
  {/if}

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}

  <button
    type="button"
    onclick={handleSubmit}
    class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    {strings.presets.saveButton}
  </button>
</div>

<ConfirmDialog
  open={showCollisionDialog}
  title={strings.presets.heading}
  body={strings.presets.collisionConfirm.replace('{name}', pendingName)}
  confirmLabel={strings.presets.collisionConfirmYes}
  cancelLabel={strings.presets.collisionConfirmCancel}
  onconfirm={confirmOverwrite}
  oncancel={cancelOverwrite}
/>
