---
phase: quick-260708-pov
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/components/ClassForm.svelte
  - src/lib/components/ClassForm.test.ts
  - src/lib/components/ShooterForm.svelte
  - src/lib/i18n/strings.de.ts
autonomous: true
requirements: [SETUP-01]

must_haves:
  truths:
    - "Clicking the Pencil icon next to an existing class pre-fills the class form (age group, bow type, distance, name override) with that class's current values."
    - "Submitting the pre-filled form updates the existing class record in place (same id) instead of creating a duplicate class."
    - "The submit button reads 'Klasse ändern' while editing an existing class, and 'Klasse hinzufügen' the rest of the time — same pattern applies to the shooter form's 'Schütze ändern' / 'Schütze hinzufügen'."
    - "Editing a class is blocked with the existing finalized-tournament guard message once the tournament is finalized, mirroring the shooter edit guard."
    - "All existing ClassForm tests (add-flow, name-collision, finalized-delete-guard) keep passing unchanged."
  artifacts:
    - path: "src/lib/components/ClassForm.svelte"
      provides: "editingId-based add/update branch in the submit handler, a Pencil edit trigger per class row, and a startEdit/resetForm pair mirroring Registration.svelte's edit flow"
      contains: "db.classes.update(editingId"
    - path: "src/lib/i18n/strings.de.ts"
      provides: "editClassButton and editShooterButton string keys alongside the existing addClassButton/addShooterButton"
      contains: "editClassButton"
  key_links:
    - from: "src/lib/components/ClassForm.svelte"
      to: "db.classes (Dexie)"
      via: "handleSubmit branches on editingId to call db.classes.update instead of db.classes.add"
      pattern: "editingId !== undefined"
    - from: "src/lib/components/ClassForm.svelte"
      to: "strings.setup.editClassButton"
      via: "submit button label conditional on editingId"
      pattern: "editingId !== undefined \\? strings\\.setup\\.editClassButton"
---

<objective>
Add an edit function for classes on the Setup screen, analogous to the existing shooter (archer) edit flow in Registration.svelte/ShooterForm.svelte.

Unlike Registration.svelte (a parent view) + ShooterForm.svelte (a child form component), `ClassForm.svelte` already contains BOTH the class form AND the class list (with the existing Trash2 delete flow) in a single component — confirmed by reading the file. So the edit state (`editingId`, the pre-filled fields) is kept local to `ClassForm.svelte` itself, with a `startEdit(cls)` function called directly from the Pencil button's `onclick` — no prop threading or `$effect` needed, since there is no separate parent component supplying `editingClass` as a prop. The `editingId`-based add-vs-update branching inside the submit handler still mirrors ShooterForm.svelte's `handleSubmit` pattern exactly.

Purpose: Let the trainer correct a class's age group / bow type / distance / name after creation without deleting and re-adding it (which today would also require re-pointing any shooters that reference the old class via `classId`).
Output: `ClassForm.svelte` gains an edit flow; both `ClassForm.svelte` and `ShooterForm.svelte` swap their submit button label between add/edit wording; new i18n keys; updated/added Vitest coverage.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

<interfaces>
<!-- Current ClassForm.svelte submit handler (verbatim, lines 37-69) — the "add" path
that must stay working unchanged, and the shape handleSubmit's "add" branch keeps: -->
```svelte
async function addClass() {
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
    errorFeedback = strings.common.saveError.replace('{error}', err instanceof Error ? err.message : String(err));
    return;
  }
  ageGroup = '';
  bowType = '';
  distance = '';
  classNameOverride = '';
}
```

<!-- ShooterForm.svelte's editingId-based branch inside handleSubmit (verbatim, lines
84-112) — the pattern ClassForm.svelte's new edit branch must mirror, including the
isFinalized guard and error handling: -->
```svelte
if (editingId !== undefined) {
  if (isFinalized) {
    errorFeedback = strings.results.guardMessage;
    return;
  }
  try {
    await db.shooters.update(editingId, {
      name: trimmedName,
      classId: Number(classId),
      lineAssignment: lineNum === '' ? null : Number(lineNum),
    });
  } catch (err) {
    errorFeedback = strings.common.saveError.replace('{error}', err instanceof Error ? err.message : String(err));
    return;
  }
  resetForm();
  onEditComplete?.();
  return;
}
```

<!-- ClassForm.svelte already has `isFinalized` derived (line 30, via computeIsFinalized)
and the delete row's Trash2 button (verbatim, lines 205-213) — the Pencil button goes
right next to it, inside the same `{#if deleteBlocked?.id === cls.id} ... {:else} ...`
wrapping `<div class="flex w-full items-center justify-between gap-2">` at line 183: -->
```svelte
<button
  type="button"
  onclick={() => requestDelete(cls.id)}
  aria-label={strings.setup.classDeleteAction}
  disabled={isFinalized}
  class="flex min-h-[44px] min-w-[44px] items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
>
  <Trash2 size={20} strokeWidth={1.75} class="text-red-600 dark:text-red-400" />
</button>
```

<!-- Registration.svelte's Pencil trigger (verbatim, lines 139-146) — NOT disabled by
isFinalized (only the delete button is); the finalized guard is enforced inside the
form's submit handler instead, per ShooterForm.svelte's editLocked/isFinalized check
above. ClassForm.svelte's new Pencil button must follow this same "not disabled, guarded
at submit time" pattern, not the delete button's `disabled={isFinalized}` pattern: -->
```svelte
<button
  type="button"
  onclick={() => startEdit(shooter)}
  aria-label={strings.registration.editAction}
  class="flex min-h-[44px] min-w-[44px] items-center justify-center"
>
  <Pencil size={20} strokeWidth={1.75} class="text-slate-600 dark:text-slate-300" />
</button>
```

<!-- ClassRecord type (src/lib/db/schema.ts, verbatim, lines 7-13) — startEdit's
parameter type: -->
```typescript
export interface ClassRecord {
  id?: number;
  name: string;
  ageGroup?: string;
  bowType?: string;
  distance?: string;
}
```

<!-- ShooterForm.svelte's submit button (verbatim, lines 216-223) — the label-swap
pattern both forms must use: -->
```svelte
<button type="button" onclick={handleSubmit} disabled={editLocked} class="...">
  {strings.registration.addShooterButton}
</button>
```

<!-- strings.de.ts insertion points — existing addClassButton (line 62, inside `setup:`)
and addShooterButton (line 99, inside `registration:`): -->
```typescript
addClassButton: 'Klasse hinzufügen',
...
addShooterButton: 'Schütze hinzufügen',
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add class-edit flow to ClassForm.svelte</name>
  <files>src/lib/components/ClassForm.svelte, src/lib/components/ClassForm.test.ts, src/lib/i18n/strings.de.ts</files>
  <behavior>
    - Clicking the new Pencil button on a class row pre-fills `ageGroup`/`bowType`/`distance`/`classNameOverride` with that class's stored values and sets `editingId` to the class's id.
    - While editing, the submit button reads `strings.setup.editClassButton` ('Klasse ändern'); otherwise it reads `strings.setup.addClassButton` ('Klasse hinzufügen').
    - Submitting while `editingId` is set calls `db.classes.update(editingId, {...})` with the (possibly changed) name/ageGroup/bowType/distance, does NOT call `db.classes.add`, and resets the form (including `editingId = undefined`) on success.
    - Submitting while `editingId` is set and the tournament is finalized (`isFinalized` true) shows `strings.results.guardMessage` and does not call `db.classes.update`.
    - The existing add-flow tests ('suggests a live name...', 'auto-suffixes...') and the finalized-delete-guard test keep passing unchanged, asserting on `'Klasse hinzufügen'` for the add path.
  </behavior>
  <action>
    In `src/lib/components/ClassForm.svelte`:

    1. Import `Pencil` alongside `Trash2` from `@lucide/svelte`.
    2. Add `let editingId = $state<number | undefined>(undefined);` near the other `$state` declarations.
    3. Extract the shared reset logic (currently the four inline assignments at the end of `addClass`) into `function resetForm() { ageGroup = ''; bowType = ''; distance = ''; classNameOverride = ''; editingId = undefined; }`.
    4. Rename `addClass` to `handleSubmit` and branch at the top of the body: after the `if (!ageGroup && !bowType && !distance) return;` guard and `errorFeedback = ''`, and after computing `nameToSave` (same computation for both branches — `autoSuffixOnCollision` already excludes nothing based on `editingId`, so leave `existingClasses` as-is; this matches the acceptable existing collision behavior and is out of scope to change), branch: if `editingId !== undefined`, guard `if (isFinalized) { errorFeedback = strings.results.guardMessage; return; }`, then `try { await db.classes.update(editingId, { name: nameToSave, ageGroup: ageGroup || undefined, bowType: bowType || undefined, distance: distance || undefined }); } catch (err) { errorFeedback = ...; return; }`, then `resetForm(); return;`. Otherwise (editingId undefined) keep the existing `db.classes.add({...})` try/catch, then call `resetForm();` instead of the four inline assignments.
    5. Add `function startEdit(cls: ClassRecord) { ageGroup = cls.ageGroup ?? ''; bowType = cls.bowType ?? ''; distance = cls.distance ?? ''; classNameOverride = cls.name; editingId = cls.id; }` — import `ClassRecord` as a type from `../db/schema` (add to the existing `import { db } from '../db/schema';` line as `import { db, type ClassRecord } from '../db/schema';`).
    6. Change the submit button's `onclick={addClass}` to `onclick={handleSubmit}` and its label from the static `{strings.setup.addClassButton}` to `{editingId !== undefined ? strings.setup.editClassButton : strings.setup.addClassButton}`.
    7. In the list row's non-delete-confirm branch (the `<div class="flex w-full items-center justify-between gap-2">` block, sibling to the existing Trash2 button, itself inside the `{#if deleteBlocked?.id === cls.id} ... {:else} <button ... Trash2 /> {/if}` at lines 196-214), add a Pencil edit button immediately before that `{#if deleteBlocked?.id === cls.id}` check (so it always renders next to whichever of Trash2/dismiss button is showing), following Registration.svelte's Pencil button exactly: `<button type="button" onclick={() => startEdit(cls)} aria-label={strings.setup.classEditAction} class="flex min-h-[44px] min-w-[44px] items-center justify-center"><Pencil size={20} strokeWidth={1.75} class="text-slate-600 dark:text-slate-300" /></button>` — NOT disabled by `isFinalized` (the guard lives in `handleSubmit`, per Registration.svelte's established pattern in the interfaces block above).

    In `src/lib/i18n/strings.de.ts`:
    - In the `setup:` block, add `editClassButton: 'Klasse ändern',` directly after the existing `addClassButton: 'Klasse hinzufügen',` line.
    - In the same `setup:` block, add `classEditAction: 'Bearbeiten',` directly after `classDeleteAction: 'Löschen',` (mirrors `registration.editAction`'s value).

    In `src/lib/components/ClassForm.test.ts`, add a new test after the existing three: seed one class via `db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' })`, render `ClassForm`, click the Pencil button (`screen.getByLabelText(strings.setup.classEditAction)`), assert the submit button now reads `strings.setup.editClassButton` ('Klasse ändern') via `screen.getByRole('button', { name: 'Klasse ändern' })`, change the distance select to `'25m'`, click submit, then assert (via `screen.findByText` or a fresh `db.classes.toArray()` read) that the original class row was updated in place (same `id`, new distance) rather than a second class being added — e.g. `const updated = await db.classes.toArray(); expect(updated).toHaveLength(1); expect(updated[0].distance).toBe('25m');`.
  </action>
  <verify>
    <automated>cd /home/code/Archery/InstantBogenturnier && npx vitest run src/lib/components/ClassForm.test.ts</automated>
  </verify>
  <done>ClassForm.svelte has a working edit flow (Pencil trigger, editingId-branched handleSubmit, resetForm, label swap); strings.de.ts has editClassButton/classEditAction; all ClassForm.test.ts tests (existing + new edit-flow test) pass.</done>
</task>

<task type="auto">
  <name>Task 2: Swap ShooterForm.svelte's submit button label between add/edit wording</name>
  <files>src/lib/components/ShooterForm.svelte, src/lib/i18n/strings.de.ts</files>
  <action>
    In `src/lib/i18n/strings.de.ts`'s `registration:` block, add `editShooterButton: 'Schütze ändern',` directly after the existing `addShooterButton: 'Schütze hinzufügen',` line.

    In `src/lib/components/ShooterForm.svelte`, change the submit button's static `{strings.registration.addShooterButton}` (line ~222) to `{editingId !== undefined ? strings.registration.editShooterButton : strings.registration.addShooterButton}` — `editingId` is already an existing `$state` variable in this file (line 59), no new state needed.
  </action>
  <verify>
    <automated>cd /home/code/Archery/InstantBogenturnier && npx vitest run src/lib/components/ClassForm.test.ts && npm run check</automated>
  </verify>
  <done>ShooterForm.svelte's submit button reads 'Schütze ändern' while editing an existing shooter (editingId set) and 'Schütze hinzufügen' otherwise; strings.de.ts has the new editShooterButton key; svelte-check passes with no new type errors.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

None crossed — this is a client-only UI change against data already validated and stored locally (Dexie/IndexedDB on the single trainer device). No new external input, network call, or dependency install.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick260708-01 | Tampering (data integrity) | ClassForm.svelte handleSubmit edit branch | mitigate | The finalized-tournament guard (`isFinalized` check before `db.classes.update`) is added explicitly, mirroring ShooterForm.svelte's existing `editingId`+`isFinalized` guard — prevents a trainer from silently altering a class's tuple (ageGroup/bowType/distance) that already has locked, finalized scores associated with shooters in that class. |
| T-quick260708-02 | Repudiation / accidental overwrite | ClassForm.svelte startEdit + resetForm | accept | Unlike ShooterForm.svelte, there is no explicit "cancel edit" affordance — this mirrors the existing shooter-edit UX (no cancel button either) and is out of scope for this task; the trainer can still overwrite the in-progress edit by clicking a different class's Pencil button, which re-runs `startEdit` and replaces the pre-filled state. |
</threat_model>

<verification>
Run after both tasks:
```
cd /home/code/Archery/InstantBogenturnier && npx vitest run src/lib/components/ClassForm.test.ts && npm run check
```
Manually verify with `npm run dev`: on the Setup screen, add a class, click its Pencil icon, confirm the form pre-fills with that class's values and the submit button reads "Klasse ändern", change a field and submit, confirm the class list shows the updated values with no duplicate row. Repeat the button-label check on the Registration screen's shooter edit flow (label reads "Schütze ändern" while editing, "Schütze hinzufügen" otherwise).
</verification>

<success_criteria>
- `npx vitest run src/lib/components/ClassForm.test.ts` passes, including the new edit-flow test, alongside all pre-existing ClassForm tests.
- `npm run check` passes with no new type errors.
- ClassForm.svelte supports editing an existing class in place (Pencil trigger -> pre-filled form -> `db.classes.update` on submit), guarded by the finalized-tournament check.
- Both ClassForm.svelte's and ShooterForm.svelte's submit buttons swap between add/edit wording based on whether an edit is in progress.
</success_criteria>

<output>
Create `.planning/quick/260708-pov-add-class-edit-function/260708-pov-SUMMARY.md` when done
</output>
