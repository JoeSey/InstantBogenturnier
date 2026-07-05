<script lang="ts">
  import { liveQuery } from 'dexie';
  import { Trash2 } from '@lucide/svelte';
  import { exportDB, importInto } from 'dexie-export-import';
  import { db } from '../db/schema';
  import type { PresetRecord } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  // SETUP-05/06 (D-11 through D-15): load/delete a saved preset, plus export-all /
  // import-all-replace for cross-device preset transfer.
  //
  // Tables intentionally excluded from the preset export/import boundary. The shooter
  // roster and live setup state are out of scope for "export all presets" (D-15) — by
  // skipping these tables on export AND passing the same skip list to `importInto`'s
  // `clearTablesBeforeImport` sweep, an import can only ever touch `db.presets`, never
  // wipe or overwrite classes/lines/rounds/shooters (mirrors D-12's "load never touches
  // the shooter roster" guarantee for the export/import path too).
  const NON_PRESET_TABLES = ['classes', 'shootingLines', 'rounds', 'shooters'];

  const presetsQuery = liveQuery(() => db.presets.toArray());
  let presets = $derived($presetsQuery ?? []);

  let loadTarget = $state<PresetRecord | null>(null);
  let deleteTarget = $state<PresetRecord | null>(null);
  let feedback = $state('');
  let errorFeedback = $state('');

  let importFile = $state<File | null>(null);
  let importCount = $state(0);
  let currentCountAtImport = $state(0);
  let showImportDialog = $state(false);
  let fileInputEl = $state<HTMLInputElement | undefined>(undefined);

  function requestLoad(preset: PresetRecord) {
    feedback = '';
    errorFeedback = '';
    loadTarget = preset;
  }

  function cancelLoad() {
    loadTarget = null;
  }

  async function confirmLoad() {
    if (!loadTarget) return;
    // $state.snapshot strips the Svelte 5 reactive proxy wrapper — `preset` here
    // originates from a $derived-wrapped liveQuery array, and IndexedDB's structured
    // clone algorithm cannot serialize a live Proxy (DataCloneError otherwise).
    const preset = $state.snapshot(loadTarget);

    errorFeedback = '';
    try {
      // CR-03: `preset.classes` still carries the original numeric `id`s captured at save
      // time (possibly from a different device/session, or a re-imported file). Those ids
      // must never be trusted — reusing them verbatim risks an accidental id collision
      // that silently repoints existing shooters (via `shooters.classId`) at an unrelated
      // class. Record the pre-load id->name mapping so shooters can be reconciled by name
      // after fresh ids are assigned below, then strip `id` from every class so Dexie
      // always allocates new auto-increment ids.
      const previousClasses = await db.classes.toArray();
      const previousNameById = new Map(previousClasses.map((c) => [c.id, c.name]));
      const classesWithoutIds = preset.classes.map(({ id: _id, ...rest }) => rest);

      // Never touches db.shooters (D-12) — only classes/shootingLines/rounds are replaced.
      await db.classes.clear();
      const newIds = await db.classes.bulkAdd(classesWithoutIds, { allKeys: true });
      const newIdByName = new Map(classesWithoutIds.map((c, i) => [c.name, newIds[i]]));

      // Reconcile shooters.classId: a shooter whose class still exists (by name) in the
      // freshly loaded preset gets remapped to its new id. A shooter whose class no
      // longer exists is left alone rather than silently repointed at a same-numbered but
      // unrelated class (the exact bug this fix addresses).
      const allShooters = await db.shooters.toArray();
      for (const shooter of allShooters) {
        const oldName = previousNameById.get(shooter.classId);
        const newId = oldName !== undefined ? newIdByName.get(oldName) : undefined;
        if (newId !== undefined && newId !== shooter.classId && shooter.id !== undefined) {
          await db.shooters.update(shooter.id, { classId: newId });
        }
      }

      await db.shootingLines.put({ id: 1, count: preset.shootingLineCount });
      await db.rounds.put({ id: 1, ...preset.roundsConfig });
      feedback = strings.presets.loadFeedback.replace('{name}', preset.name);
    } catch (err) {
      // WR-04: surface write failures instead of failing silently.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      loadTarget = null;
    }
  }

  function requestDelete(preset: PresetRecord) {
    feedback = '';
    errorFeedback = '';
    deleteTarget = preset;
  }

  function cancelDelete() {
    deleteTarget = null;
  }

  async function confirmDelete() {
    if (deleteTarget?.id === undefined) return;
    errorFeedback = '';
    try {
      await db.presets.delete(deleteTarget.id);
    } catch (err) {
      // WR-04: surface write failures instead of failing silently.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
      return;
    }
    deleteTarget = null;
  }

  async function handleExport() {
    errorFeedback = '';
    feedback = '';
    const blob = await exportDB(db, { skipTables: NON_PRESET_TABLES });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString();
    a.href = url;
    a.download = `presets-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    feedback = strings.presets.exportFeedback.replace('{date}', dateStamp);
  }

  async function handleFileSelected(e: Event) {
    errorFeedback = '';
    feedback = '';
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    let importCountFromFile = 0;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        data?: { tables?: Array<{ name: string; rowCount: number }> };
      };
      const presetsTableMeta = parsed.data?.tables?.find((t) => t.name === 'presets');
      importCountFromFile = presetsTableMeta?.rowCount ?? 0;
    } catch (err) {
      errorFeedback = strings.presets.importError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
      input.value = '';
      return;
    }

    importCount = importCountFromFile;
    currentCountAtImport = await db.presets.count();
    importFile = file;
    showImportDialog = true;
  }

  function cancelImport() {
    showImportDialog = false;
    importFile = null;
    if (fileInputEl) fileInputEl.value = '';
  }

  // WR-05: the outer container-type checks (name/classes/shootingLineCount/roundsConfig)
  // let a structurally-valid-but-corrupted import through, e.g. `classes: [{"name":
  // 123}]` or `roundsConfig: {arrowsPerPasse: "3"}` -- these pass the outer checks but
  // break later code that assumes `ClassRecord.name` is always a string / rounds fields
  // are always numbers. Validate the nested shape too, not just the container types.
  function isValidPresetRecord(p: PresetRecord): boolean {
    if (typeof p.name !== 'string') return false;
    if (!Array.isArray(p.classes)) return false;
    if (!p.classes.every((c) => c !== null && typeof c === 'object' && typeof c.name === 'string')) {
      return false;
    }
    if (typeof p.shootingLineCount !== 'number') return false;
    if (typeof p.roundsConfig !== 'object' || p.roundsConfig === null) return false;
    const rc = p.roundsConfig;
    if (
      typeof rc.arrowsPerPasse !== 'number' ||
      !Number.isFinite(rc.arrowsPerPasse) ||
      typeof rc.passesPerRound !== 'number' ||
      !Number.isFinite(rc.passesPerRound) ||
      typeof rc.numberOfRounds !== 'number' ||
      !Number.isFinite(rc.numberOfRounds)
    ) {
      return false;
    }
    return true;
  }

  async function confirmImport() {
    if (!importFile) return;
    try {
      await importInto(db, importFile, {
        clearTablesBeforeImport: true,
        skipTables: NON_PRESET_TABLES,
      });

      // Defensive re-validation (T-02-08): drop any record missing required fields.
      const afterImport = await db.presets.toArray();
      const invalidIds = afterImport
        .filter((p) => !isValidPresetRecord(p))
        .map((p) => p.id)
        .filter((id): id is number => id !== undefined);
      if (invalidIds.length > 0) {
        await db.presets.bulkDelete(invalidIds);
      }

      // (T-02-09): cap at 8 valid presets, keeping the 8 most recently created.
      const validPresets = await db.presets.toArray();
      if (validPresets.length > 8) {
        const sorted = [...validPresets].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() // newest first
        );
        const excessIds = sorted
          .slice(8) // everything past the 8 newest
          .map((p) => p.id)
          .filter((id): id is number => id !== undefined);
        await db.presets.bulkDelete(excessIds);
      }

      const finalCount = await db.presets.count();
      feedback = strings.presets.importSuccess.replace('{count}', String(finalCount));
    } catch (err) {
      errorFeedback = strings.presets.importError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      showImportDialog = false;
      importFile = null;
      if (fileInputEl) fileInputEl.value = '';
    }
  }
</script>

<div class="mt-6 flex flex-col gap-4">
  {#if presets.length === 0}
    <div>
      <h4 class="mb-1 text-[16px] font-semibold leading-[1.5] text-slate-900 dark:text-slate-100">
        {strings.presets.emptyHeading}
      </h4>
      <p class="text-[14px] leading-[1.4] text-slate-600 dark:text-slate-300">
        {strings.presets.emptyBody}
      </p>
    </div>
  {:else}
    <ul class="flex flex-col gap-2">
      {#each presets as preset (preset.id)}
        <li
          class="flex min-h-[44px] items-center justify-between rounded-lg bg-white p-3 text-[16px] leading-[1.5] text-slate-900 dark:bg-slate-800 dark:text-slate-100"
        >
          <span>
            {preset.name}
            <span class="ml-2 text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
              {preset.classes.length} Klassen
            </span>
          </span>
          <div class="flex items-center gap-3">
            <button
              type="button"
              onclick={() => requestLoad(preset)}
              class="min-h-[44px] rounded-lg px-3 py-2 text-[14px] font-semibold leading-[1.4] text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              {strings.presets.loadAction}
            </button>
            <button
              type="button"
              onclick={() => requestDelete(preset)}
              aria-label={strings.presets.deleteAction}
              class="flex min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if feedback}
    <p class="text-[14px] leading-[1.4] text-teal-700 dark:text-teal-300">{feedback}</p>
  {/if}
  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}

  <div class="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-700 sm:flex-row">
    <button
      type="button"
      onclick={handleExport}
      class="min-h-[44px] rounded-lg border border-slate-300 px-4 py-2 text-[16px] leading-[1.5] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {strings.presets.exportButton}
    </button>

    <label
      class="flex min-h-[44px] cursor-pointer items-center justify-end rounded-lg border border-slate-300 px-4 py-2 text-[16px] leading-[1.5] text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {strings.presets.importButton}
      <input
        bind:this={fileInputEl}
        type="file"
        accept=".json"
        aria-label={strings.presets.importFileLabel}
        class="sr-only"
        onchange={handleFileSelected}
      />
    </label>
  </div>
</div>

<ConfirmDialog
  open={loadTarget !== null}
  title={strings.presets.heading}
  body={loadTarget ? strings.presets.loadConfirm.replace('{name}', loadTarget.name) : ''}
  confirmLabel={strings.presets.loadConfirmYes}
  cancelLabel={strings.presets.collisionConfirmCancel}
  onconfirm={confirmLoad}
  oncancel={cancelLoad}
/>

<ConfirmDialog
  open={deleteTarget !== null}
  title={strings.presets.heading}
  body={deleteTarget ? strings.presets.deleteConfirm.replace('{name}', deleteTarget.name) : ''}
  confirmLabel={strings.presets.deleteConfirmYes}
  cancelLabel={strings.presets.collisionConfirmCancel}
  destructive={true}
  onconfirm={confirmDelete}
  oncancel={cancelDelete}
/>

<ConfirmDialog
  open={showImportDialog}
  title={strings.presets.heading}
  body={strings.presets.importConfirm
    .replace('{currentCount}', String(currentCountAtImport))
    .replace('{importCount}', String(importCount))}
  confirmLabel={strings.presets.importConfirmYes}
  cancelLabel={strings.presets.collisionConfirmCancel}
  onconfirm={confirmImport}
  oncancel={cancelImport}
/>
