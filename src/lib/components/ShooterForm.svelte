<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../db/schema';
  import type { ShooterRecord } from '../db/schema';
  import { strings } from '../i18n/strings.de';
  import { detectMode } from '../utils/modeDetection';
  import AutoAssignModal, { applyRosterAssignments, type RosterEntry } from './AutoAssignModal.svelte';

  // `editingShooter` is set by Registration.svelte when the trainer clicks the Pencil
  // (edit) action on an existing shooter — pre-fills the form; submit then updates the
  // record directly (no auto-assign preview: a single-shooter correction, not a new
  // registration, per Task 2 action text).
  let {
    editingShooter = null,
    onEditComplete,
  }: {
    editingShooter?: ShooterRecord | null;
    onEditComplete?: () => void;
  } = $props();

  const classesQuery = liveQuery(() => db.classes.toArray());
  let classes = $derived($classesQuery ?? []);

  const lineConfigQuery = liveQuery(() => db.shootingLines.get(1));
  let lineCount = $derived($lineConfigQuery?.count ?? 2);

  const shootersQuery = liveQuery(() => db.shooters.toArray());
  let allShooters = $derived($shootersQuery ?? []);
  let mode = $derived(detectMode(allShooters.length, lineCount));

  let name = $state('');
  let classId = $state<number | ''>('');
  let lineNum = $state<number | ''>('');

  let showModal = $state(false);
  let stagedRoster = $state<RosterEntry[]>([]);
  // How many shooters already occupy a line slot (from prior auto/manual assignments) —
  // passed to AutoAssignModal so the round-robin cursor continues across separate
  // registration submissions instead of restarting at line 1 every time. Snapshotted
  // from a fresh `db.shooters` query at submit time (NOT derived from the `allShooters`
  // liveQuery above) — liveQuery's change notification is async and can lag behind a
  // just-completed write from the previous registration's AutoAssignModal save, which
  // would otherwise make this count stale by exactly one registration.
  let stagedAlreadyAssignedCount = $state(0);

  // Once-per-session flag: the AutoAssignModal confirmation is shown only the first
  // time a registration needs auto-assignment; every subsequent auto-assign-needing
  // registration in this same ShooterForm/Registration mount writes silently via
  // applyRosterAssignments. Resets on a fresh component render (e.g. full page reload).
  let hasShownAutoAssignOnce = $state(false);

  let editingId = $state<number | undefined>(undefined);
  let errorFeedback = $state('');

  // Pre-fill the form whenever a new shooter is selected for editing.
  $effect(() => {
    if (editingShooter) {
      name = editingShooter.name;
      classId = editingShooter.classId;
      lineNum = editingShooter.lineAssignment ?? '';
      editingId = editingShooter.id;
    }
  });

  function resetForm() {
    name = '';
    classId = '';
    lineNum = '';
    editingId = undefined;
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName || classId === '') return; // REG-01 required fields — silent no-op

    errorFeedback = '';

    if (editingId !== undefined) {
      try {
        await db.shooters.update(editingId, {
          name: trimmedName,
          classId: Number(classId),
          lineAssignment: lineNum === '' ? null : Number(lineNum),
        });
      } catch (err) {
        // WR-04: surface write failures instead of failing silently.
        errorFeedback = strings.common.saveError.replace(
          '{error}',
          err instanceof Error ? err.message : String(err)
        );
        return;
      }
      resetForm();
      onEditComplete?.();
      return;
    }

    // Query fresh instead of using the `allShooters` liveQuery-derived value: liveQuery's
    // change notification is asynchronous and may not yet reflect a write that was just
    // committed (e.g. the previous registration's AutoAssignModal save), which would
    // otherwise make the unassigned-carry-over list and the round-robin offset stale.
    const freshShooters = await db.shooters.toArray();

    const unassigned: RosterEntry[] = freshShooters
      .filter((s) => s.lineAssignment == null)
      .map((s) => ({ id: s.id, name: s.name, classId: s.classId, lineNum: null }));

    const alreadyAssignedCount = freshShooters.filter((s) => s.lineAssignment != null).length;
    stagedAlreadyAssignedCount = alreadyAssignedCount;

    const roster: RosterEntry[] = [
      ...unassigned,
      {
        name: trimmedName,
        classId: Number(classId),
        lineNum: lineNum === '' ? null : Number(lineNum),
      },
    ];

    const needsAutoAssign = roster.some((r) => r.lineNum === null);

    if (!needsAutoAssign || hasShownAutoAssignOnce) {
      try {
        await applyRosterAssignments(roster, lineCount, mode, alreadyAssignedCount);
      } catch (err) {
        // WR-04: surface write failures instead of failing silently.
        errorFeedback = strings.common.saveError.replace(
          '{error}',
          err instanceof Error ? err.message : String(err)
        );
        return;
      }
      resetForm();
      return;
    }

    stagedRoster = roster;
    showModal = true;
  }

  function handleModalSave() {
    hasShownAutoAssignOnce = true;
    showModal = false;
    stagedRoster = [];
    resetForm();
  }

  function handleModalBack() {
    // Zurück: discard the staged entry, keep the form values so the trainer can adjust
    // the line assignment manually before re-submitting (per UI-SPEC interaction spec).
    showModal = false;
    stagedRoster = [];
  }
</script>

<h3 class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100">
  {strings.registration.addShooterHeading}
</h3>

<div class="flex flex-col gap-4">
  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.registration.nameLabel}
    <input
      type="text"
      bind:value={name}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
  </label>

  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.registration.classLabel}
    {strings.registration.classRequired}
    <select
      bind:value={classId}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      <option value="">— Keine Angabe —</option>
      {#each classes as cls (cls.id)}
        <option value={cls.id}>{cls.name}</option>
      {/each}
    </select>
  </label>

  <label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
    {strings.registration.lineLabel}
    <input
      type="number"
      min="1"
      bind:value={lineNum}
      class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    />
    <span class="mt-1 block text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.registration.lineHelper}
    </span>
  </label>

  <button
    type="button"
    onclick={handleSubmit}
    class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    {strings.registration.addShooterButton}
  </button>

  {#if errorFeedback}
    <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
  {/if}
</div>

{#if showModal}
  <AutoAssignModal
    roster={stagedRoster}
    {lineCount}
    {mode}
    alreadyAssignedCount={stagedAlreadyAssignedCount}
    onSave={handleModalSave}
    onBack={handleModalBack}
  />
{/if}
