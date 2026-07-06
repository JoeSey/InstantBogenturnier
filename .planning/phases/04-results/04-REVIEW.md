---
phase: 04-results
reviewed: 2026-07-06T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - e2e/nav.spec.ts
  - e2e/results.spec.ts
  - src/App.svelte
  - src/lib/components/ClassForm.svelte
  - src/lib/components/ClassForm.test.ts
  - src/lib/components/ClassSelector.svelte
  - src/lib/components/ResultsTable.svelte
  - src/lib/components/ResultsTable.test.ts
  - src/lib/i18n/strings.de.ts
  - src/lib/utils/ranking.test.ts
  - src/lib/utils/ranking.ts
  - src/lib/utils/scoreCompletion.test.ts
  - src/lib/utils/scoreCompletion.ts
  - src/lib/views/Registration.svelte
  - src/lib/views/Registration.test.ts
  - src/lib/views/Results.svelte
  - src/lib/views/Results.test.ts
  - src/lib/views/ScoreEntry.svelte
  - src/lib/views/Setup.svelte
  - src/lib/views/SetupRounds.svelte
  - src/lib/views/SetupRounds.test.ts
findings:
  critical: 2
  warning: 4
  info: 2
  total: 8
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-07-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the Phase 4 (results/ranking/reset/finalize-lock) vertical slice: the pure
ranking/completion utilities (`ranking.ts`, `scoreCompletion.ts`), the Results view and
its supporting components (`ResultsTable`, `ClassSelector`), the reset flow, and the
Phase 4-03 "finalize-lock" retrofit applied to `Setup`, `SetupRounds`, `ClassForm`, and
`Registration`. The pure ranking/completion logic itself (`assignRanks`,
`computeClassRankings`, `computeShooterSum`, `areAllScoresEntered`,
`computeIsFinalized`) is correct and well covered by tests, including the tie-handling
("1-2-2-4") and cross-round-sum fixtures.

However, two BLOCKER-level defects were found by tracing call chains into files that
Phase 4 directly touches or depends on: (1) `SetupRounds.svelte` never rehydrates its
form fields from the persisted `db.rounds` record, so revisiting "Einrichtung" after
saving a config and clicking "Speichern" again silently overwrites the real
configuration with the component's hardcoded defaults; (2) the finalize-lock retrofit
(RES-06/D-11/D-12) that this phase adds to `Registration.svelte`, `ClassForm.svelte`,
`Setup.svelte`, and `SetupRounds.svelte` does not extend to `ShooterForm.svelte`'s
edit-shooter path, so a trainer can still reassign a shooter to a different class (or
rename them) after the tournament has been finalized, which silently corrupts the
now-supposedly-"locked" per-class rankings. Several further WARNING-level robustness
gaps (duplicate guard-message rendering, orphaned score records on shooter delete,
UI-only guard enforcement, optimistic-UI masking of failed autosaves) were also found.

## Critical Issues

### CR-01: `SetupRounds.svelte` never rehydrates from the persisted `db.rounds` config — remounting resets the form to defaults, and saving in that state silently overwrites the real configuration

**File:** `src/lib/views/SetupRounds.svelte:17-23` (state initialization), `src/lib/views/SetupRounds.svelte:65-68` (`save()`)

**Issue:** `SetupRounds.svelte` initializes `selectedMode`, `selectedPresetId`,
`customRounds`, `customPassesPerRound`, `customArrowsPerPasse`, and `customDistance`
from hardcoded literals (`'preset'`, `WA_PRESETS[0].id`, `1`, `10`, `3`, `'18m'`) and
never reads back the existing `db.rounds` record (there is no
`liveQuery(() => db.rounds.get(1))` anywhere in this file, unlike the sibling
`lineCount` input in `Setup.svelte:13-14`, which correctly rehydrates via
`liveQuery(() => db.shootingLines.get(1))`).

Because `App.svelte` swaps `<ActiveView />` by reference (destroy/recreate, not
show/hide), every time the trainer navigates away from "Einrichtung" and back,
`Setup.svelte` — and therefore `SetupRounds.svelte` — is fully remounted. If the
trainer had already saved e.g. the WA 70m preset, the "Runden und Passen" card will
silently re-render showing the WA 18m preset selected (the component's default) even
though `db.rounds` still holds the WA 70m config. If the trainer then clicks
"Speichern" (a very plausible action — to confirm settings, or out of habit before
starting scoring), `save()` calls `db.rounds.put({ id: 1, ...resolvedConfig })` with
the **default** values, silently overwriting the real, previously-saved tournament
configuration. This is a real data-loss/correctness risk directly affecting the app's
stated core value ("Score entry and results ranking must work correctly ... during a
live tournament"), since an unexpected arrow-count/passes-count change after shooters
have already started scoring will desynchronize `ScoreEntry.svelte`'s per-passe grid
and `isShooterComplete`/`areAllScoresEntered` completion checks against already-entered
score rows.

No test in `SetupRounds.test.ts` covers "mount with a pre-existing `db.rounds` record"
— this gap in the test suite is exactly what let the missing rehydration ship.

**Fix:**
```svelte
<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../db/schema';
  import { WA_PRESETS } from '../fixtures/waPresets';
  import { strings } from '../i18n/strings.de';

  let { isFinalized = false }: { isFinalized?: boolean } = $props();

  const roundsQuery = liveQuery(() => db.rounds.get(1));
  let existingConfig = $derived($roundsQuery);

  let selectedMode = $state<'preset' | 'custom'>('preset');
  let selectedPresetId = $state<string>(WA_PRESETS[0].id);
  let customRounds = $state(1);
  let customPassesPerRound = $state(10);
  let customArrowsPerPasse = $state(3);
  let customDistance = $state('18m');

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
      customDistance = cfg.distance;
    }
  });
  // ... rest unchanged
</script>
```

### CR-02: Editing an existing shooter (`ShooterForm.svelte`) has no finalize-lock guard — a trainer can reassign a shooter's class after the tournament is finalized, corrupting "locked" per-class rankings

**File:** `src/lib/views/Registration.svelte:96` (renders `ShooterForm` unconditionally), `src/lib/components/ShooterForm.svelte:72-96` (`handleSubmit`, edit branch)

**Issue:** Phase 4-03's finalize-lock retrofit (RES-06/D-11/D-12,
`04-03-PLAN.md` Task 2) disables *delete*-shooter in `Registration.svelte` once
`computeIsFinalized(allScores)` is true, but the *edit* path (Pencil icon →
`ShooterForm.svelte`) is deliberately left enabled — `Registration.test.ts` even
documents this explicitly as a "Pitfall 5 regression guard". `ShooterForm.svelte`'s
`handleSubmit` (lines 72-96) calls
`db.shooters.update(editingId, { name, classId: Number(classId), lineAssignment })`
with no `isFinalized`/`computeIsFinalized` check anywhere in the component.

This means after the trainer has clicked "Turnier abschließen" (finalize), they can
still open the edit form for any shooter and change that shooter's `classId` to a
*different* class. Since `computeClassRankings` (in `ranking.ts`) groups every
registered shooter into its class purely by the shooter's current `classId` at
rendering time, this silently moves that shooter's already-finalized (frozen) score
sum into a different class's ranked table — a class they never actually competed in —
while removing them from the original class's now-supposedly-permanently-locked
results. This directly defeats the guarantee communicated to the trainer via
`strings.results.guardMessage` ("Turnier abgeschlossen — Zurücksetzen, um zu ändern.")
and `strings.scoring.finalizedMessage` ("Erfassung abgeschlossen. Die Ergebnisse sind
jetzt gesperrt."): the results are not actually locked, only deletion is.

Allowing a name-typo fix after finalize might be a reasonable exception, but
allowing `classId` reassignment is not — it is a correctness violation of the
single most important invariant this phase (RES-06) exists to establish.

**Fix:**
```svelte
<!-- ShooterForm.svelte -->
<script lang="ts">
  import { computeIsFinalized } from '../utils/scoreCompletion';
  // ...
  const scoresQuery = liveQuery(() => db.scores.toArray());
  let allScores = $derived($scoresQuery ?? []);
  let isFinalized = $derived(computeIsFinalized(allScores));

  async function handleSubmit() {
    // ...
    if (editingId !== undefined) {
      if (isFinalized) return; // block class/name/line reassignment once locked
      // ... existing update logic
    }
  }
</script>
```
Alternatively, keep name edits allowed but explicitly disable/lock the `classId`
`<select>` (and `lineAssignment` input) once `isFinalized` is true, and surface
`strings.results.guardMessage` in the edit form so the restriction is visible to the
trainer rather than a silent no-op.

## Warnings

### WR-01: `ClassForm.svelte` renders the finalize guard message once per class row instead of once globally

**File:** `src/lib/components/ClassForm.svelte:190-194`
**Issue:** The `{:else if isFinalized}` branch that renders
`strings.results.guardMessage` lives *inside* the `{#each existingClasses as cls}`
loop (line 158), rather than once above the list (as is done correctly in
`Registration.svelte:71-75` and `Setup.svelte:62-66,76-80`). With more than one class
configured, once `isFinalized` is true, the same
`role="status"` guard message is rendered N times (once per class row), producing
visual clutter and, since each carries `role="status"`, likely N duplicate
screen-reader announcements. `ClassForm.test.ts`'s finalize test only seeds a single
class, so this duplication is not caught by the existing test suite.
**Fix:** Move the guard message out of the `{#each}` loop, e.g. render it once
directly below the `<ul>` (or above it, matching the other three views' placement),
and only disable-render the per-row `deleteBlocked` message inside the loop.

### WR-02: `Registration.svelte`'s `deleteShooter` leaves orphaned `ScoreRecord`s in `db.scores`

**File:** `src/lib/views/Registration.svelte:43-55`
**Issue:** `deleteShooter(id)` calls `db.shooters.delete(id)` only. If the shooter
being deleted already has entered scores (a normal mid-tournament correction, e.g. the
trainer registered the wrong person and wants to remove them after a few arrows were
already scored), the corresponding rows in `db.scores` (keyed by
`[shooterId+roundIndex+passeIndex+arrowIndex]`) are never removed. These become
permanently orphaned records in IndexedDB (until a full "Neues Turnier starten"
reset clears `db.scores` wholesale). This is inconsistent with the referential-
integrity discipline already established elsewhere in this codebase — `ClassForm.svelte`'s
`requestDelete` (CR-02 in that file's comments) explicitly blocks deleting a class
while shooters still reference it via `classId`, specifically to avoid a dangling
foreign key. No equivalent protection or cleanup exists for shooters → scores.
**Fix:**
```ts
async function deleteShooter(id: number | undefined) {
  if (id === undefined) return;
  errorFeedback = '';
  try {
    await db.transaction('rw', db.shooters, db.scores, async () => {
      await db.shooters.delete(id);
      await db.scores.where('shooterId').equals(id).delete();
    });
  } catch (err) {
    errorFeedback = strings.common.saveError.replace(
      '{error}',
      err instanceof Error ? err.message : String(err)
    );
  }
}
```

### WR-03: Several finalize-lock guards are enforced only via the HTML `disabled` attribute, not inside the handler function itself

**File:** `src/lib/views/Setup.svelte:23-27` (`handleLineCountChange`), `src/lib/views/SetupRounds.svelte:65-68` (`save`), `src/lib/components/ClassForm.svelte:71-83,93-106` (`requestDelete`/`confirmDelete`)
**Issue:** Unlike `ScoreEntry.svelte`'s `openPicker`, which explicitly re-checks
`if (isFinalized) return;` at the top of the function (in addition to disabling the
UI), the handlers listed above rely entirely on the DOM `disabled` attribute
(`disabled={isFinalized}`) to prevent writes once the tournament is finalized. This is
a defense-in-depth gap: if the `disabled` attribute is ever removed accidentally in a
future refactor, or the handler is invoked programmatically/via a stray event, or
there's a brief window where `isFinalized`'s derived value hasn't yet propagated to
the DOM, a "locked" write could still occur silently with no error surfaced.
**Fix:** Add an explicit `if (isFinalized) return;`-style guard at the top of
`handleLineCountChange`, `save()`, `requestDelete`, and `confirmDelete`, mirroring the
pattern already used in `ScoreEntry.svelte`.

### WR-04: `ScoreEntry.svelte`'s optimistic `justPickedValues` update is not conditioned on the autosave actually succeeding

**File:** `src/lib/views/ScoreEntry.svelte:176-214`, specifically the unconditional `justPickedValues.set(...)` at line 197
**Issue:** `handleScoreSelect` fires `db.scores.put(...)` without `await` (by design,
per the D-06 comment, so the UI is never blocked), attaching only a `.catch()` that
sets `errorFeedback`. Immediately afterward — regardless of whether that promise has
resolved or rejected — `justPickedValues.set(...)` unconditionally records the picked
value, which drives both the picker's live row preview (`pickerRowPreview`) and the
`isFilled`/auto-advance decision to the next arrow. If the write actually fails (e.g.
storage quota exceeded), the picker still visually behaves as if the value was saved
and auto-advances/auto-closes as normal; only the separately-rendered `errorFeedback`
text (easy to miss once the trainer has already moved on to the next shooter/arrow)
indicates anything went wrong. The persisted `ScoreTable` will eventually show the
cell as still empty (since `currentPasseScoreByKey` is sourced from the real
`allScores` liveQuery, not from `justPickedValues`), but only after the picker for
that row is closed — by which point the discrepancy is easy to overlook during a live
tournament.
**Fix:** Only update `justPickedValues` (and auto-advance) after the write promise
resolves; on failure, keep the picker open on the same cell and surface the error
inline (e.g. in the picker itself), so a failed save can't be silently passed over.

## Info

### IN-01: Magic default line count (`2`) duplicated across three files

**File:** `src/lib/views/Registration.svelte:20`, `src/lib/views/Setup.svelte:14`, `src/lib/components/ShooterForm.svelte:25`
**Issue:** `$lineConfigQuery?.count ?? 2` (fallback default shooting-line count) is
repeated verbatim in three separate files instead of being defined once as a shared
named constant (e.g. `DEFAULT_LINE_COUNT`).
**Fix:** Extract a single `export const DEFAULT_LINE_COUNT = 2;` (e.g. alongside the
`db/schema.ts` types or in a small `constants.ts`) and import it in all three places.

### IN-02: Repeated error-message-extraction boilerplate

**File:** `src/lib/components/ClassForm.svelte:59-61,99-101`, `src/lib/views/Registration.svelte:50-53`, `src/lib/views/Results.svelte:73-76`, `src/lib/views/ScoreEntry.svelte:191-194,242-246`
**Issue:** The pattern
`err instanceof Error ? err.message : String(err)` combined with
`strings.common.saveError.replace('{error}', ...)` is duplicated near-identically
across five call sites in four files instead of being factored into a single shared
helper (e.g. `formatSaveError(err: unknown): string`).
**Fix:** Add a small helper in `scoreCompletion.ts` or a new `errors.ts` util and
import it everywhere this pattern currently appears.

---

_Reviewed: 2026-07-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
