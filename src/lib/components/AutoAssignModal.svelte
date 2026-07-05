<script module lang="ts">
  import { db } from '../db/schema';
  import { assignShootersToLines } from '../utils/shooterAutoAssignment';
  import type { TournamentMode } from '../utils/modeDetection';

  // A roster entry is either an already-registered-but-unassigned shooter (has `id`,
  // updated in place on save) or a freshly staged shooter (no `id` yet, bulkAdd'ed on
  // save). `lineNum` is the trainer's manual entry, or null to auto-assign (D-10).
  // Exported from the module context so other files (e.g. ShooterForm.svelte) can
  // import both the type and the shared write logic below without duplicating them.
  export interface RosterEntry {
    id?: number;
    name: string;
    classId: number;
    lineNum: number | null;
  }

  // Shared write logic used by both this modal's own Speichern action and
  // ShooterForm's silent (once-per-session) auto-assign path. Splits `roster` into
  // manual (lineNum !== null) and blank (lineNum === null) entries, computes the
  // round-robin assignment for the blank ones, and writes everything to db.shooters.
  // Errors propagate — callers handle their own errorFeedback per WR-04.
  export async function applyRosterAssignments(
    roster: RosterEntry[],
    lineCount: number,
    mode: TournamentMode,
    alreadyAssignedCount: number
  ): Promise<void> {
    const manualEntries = roster.filter((r) => r.lineNum !== null);
    const blankEntries = roster.filter((r) => r.lineNum === null);
    const computedAssignments = assignShootersToLines(
      blankEntries.length,
      lineCount,
      mode,
      alreadyAssignedCount
    );

    const toAdd: Array<{
      name: string;
      classId: number;
      lineAssignment: number | null;
      flight: 'A/B' | 'C/D' | null;
    }> = [];

    for (const entry of manualEntries) {
      if (entry.id !== undefined) {
        await db.shooters.update(entry.id, { lineAssignment: entry.lineNum, flight: null });
      } else {
        toAdd.push({
          name: entry.name,
          classId: entry.classId,
          lineAssignment: entry.lineNum,
          flight: null,
        });
      }
    }

    for (let i = 0; i < blankEntries.length; i++) {
      const entry = blankEntries[i];
      const assignment = computedAssignments[i];
      if (entry.id !== undefined) {
        await db.shooters.update(entry.id, {
          lineAssignment: assignment.lineNum,
          flight: assignment.flight,
        });
      } else {
        toAdd.push({
          name: entry.name,
          classId: entry.classId,
          lineAssignment: assignment.lineNum,
          flight: assignment.flight,
        });
      }
    }

    if (toAdd.length > 0) {
      await db.shooters.bulkAdd(toAdd);
    }
  }
</script>

<script lang="ts">
  import { previewAssignmentSummary } from '../utils/shooterAutoAssignment';
  import { strings } from '../i18n/strings.de';

  let {
    roster,
    lineCount,
    mode,
    alreadyAssignedCount = 0,
    onSave,
    onBack,
  }: {
    roster: RosterEntry[];
    lineCount: number;
    mode: TournamentMode;
    // Count of shooters that already occupy a line slot from prior registrations (auto
    // or manual) — continues the round-robin cursor across separate submissions instead
    // of restarting at line 1 every time (see shooterAutoAssignment.ts `startIndex`).
    alreadyAssignedCount?: number;
    onSave: () => void;
    onBack: () => void;
  } = $props();

  // Manually-entered lines are kept as-is (flight: null per plan Task 2 action text);
  // blank ones are distributed via the transparent round-robin preview (Pitfall 4).
  let manualEntries = $derived(roster.filter((r) => r.lineNum !== null));
  let blankEntries = $derived(roster.filter((r) => r.lineNum === null));
  let computedAssignments = $derived(
    assignShootersToLines(blankEntries.length, lineCount, mode, alreadyAssignedCount)
  );
  let summary = $derived(previewAssignmentSummary(computedAssignments));
  let count = $derived(blankEntries.length);
  let errorFeedback = $state('');

  async function handleSave() {
    errorFeedback = '';

    try {
      await applyRosterAssignments(roster, lineCount, mode, alreadyAssignedCount);
    } catch (err) {
      // WR-04: surface write failures instead of failing silently -- a failed roster
      // save here would otherwise leave the trainer believing shooters were assigned.
      errorFeedback = strings.common.saveError.replace(
        '{error}',
        err instanceof Error ? err.message : String(err)
      );
      return;
    }

    onSave();
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="auto-assign-modal-title"
    class="glass-surface w-full max-w-[520px] rounded-2xl p-6"
  >
    <h2
      id="auto-assign-modal-title"
      class="mb-4 text-[20px] font-semibold leading-[1.2] text-slate-900 dark:text-slate-100"
    >
      {strings.registration.autoAssignModalTitle}
    </h2>

    <p class="mb-2 text-[16px] leading-[1.5] text-slate-700 dark:text-slate-200">
      {strings.registration.autoAssignModalBody.replace('{count}', String(count))}
    </p>

    {#if count > 0}
      <p class="mb-2 text-[16px] leading-[1.5] text-slate-700 dark:text-slate-200">
        {strings.registration.autoAssignModalLines.replace('{lines}', summary)}
      </p>
    {/if}

    <p class="mb-6 text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.registration.autoAssignModalRationale}
    </p>

    <p class="mb-6 text-[14px] leading-[1.4] text-slate-500 dark:text-slate-400">
      {strings.registration.autoAssignHint}
    </p>

    {#if errorFeedback}
      <p class="mb-4 text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
    {/if}

    <div class="flex justify-end gap-2">
      <button
        type="button"
        onclick={onBack}
        class="min-h-[44px] rounded-lg px-4 py-2 text-[16px] leading-[1.5] text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
      >
        {strings.registration.autoAssignBackButton}
      </button>
      <button
        type="button"
        onclick={handleSave}
        class="min-h-[44px] rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
      >
        {strings.registration.autoAssignSaveButton}
      </button>
    </div>
  </div>
</div>
