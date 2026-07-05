---
status: resolved
trigger: "UAT feedback (Phase 2, Registration view): (1) AutoAssignModal confirmation dialog shown more than once per shooter registration, should show exactly once. (2) Round-robin line assignment wrong: with 2 shooting lines, registering 3 archers one at a time results in all three assigned to line 1, instead of the expected 1-1-2 distribution (round-robin should balance 1,2,1,2,... and only expand to AB/CD mode once shooterCount > 2*lineCount)."
created: 2026-07-05
updated: 2026-07-05
---

## Symptoms

- **Expected behavior:**
  1. AutoAssignModal appears once per shooter registration (on submit), trainer confirms or cancels, modal closes.
  2. With lineCount=2, registering shooters A, B, C one at a time (each via ShooterForm -> AutoAssignModal -> "Speichern") should distribute them round-robin across lines: A->1, B->2, C->1 (i.e. 1-1-2 in final tally, not 1-1-1).
- **Actual behavior:**
  1. The auto-assign modal is displayed more than once per registration.
  2. All three archers end up assigned to line 1.
- **Error messages:** None reported (functional/logic bug, not a crash).
- **Timeline:** Found during informal UAT of Phase 2 (setup-registration), first time this flow was manually exercised end-to-end with multiple sequential registrations.
- **Reproduction:**
  1. Set shooting lines to 2 in Setup.
  2. Go to Registration (Schützen) view.
  3. Register archer 1 with blank line (auto-assign) -> confirm modal -> observe modal shows more than once and/or check assigned line.
  4. Register archer 2 the same way.
  5. Register archer 3 the same way.
  6. Expect line distribution 1,2,1 (i.e. round-robin against the count of already-registered+assigned shooters); observe all three on line 1 instead.

## Relevant Code (from prior investigation context)

- `src/lib/components/ShooterForm.svelte` — stages new shooter, opens `AutoAssignModal`, passes roster/lineCount/mode.
- `src/lib/components/AutoAssignModal.svelte` — computes assignments via `assignShootersToLines()`, "Speichern" commits via `db.shooters.bulkAdd(...)`.
- `src/lib/utils/shooterAutoAssignment.ts` — `assignShootersToLines(unassignedCount, lineCount, mode)` implements round-robin `(index % lineCount) + 1`.

Suspected root causes to test:
1. Modal shown multiple times: possible reactive re-trigger (e.g. `$effect` or reactive statement re-opening modal on unrelated state change, or duplicate event binding).
2. Wrong line assignment: possible that `assignShootersToLines` is always called with `unassignedCount` based on only the newly staged shooter (i.e. always `1`) rather than the count of shooters needing assignment relative to already-registered ones, so every single new shooter always computes `index 0 -> (0 % lineCount) + 1 -> line 1`.

## Current Focus

status: RESOLVED. Round-robin fix (startIndex/alreadyAssignedCount) confirmed working on real iPad — this is the complete, final fix. Double-click/re-entrancy guard was explored, iterated on (disabled-attribute variant caused iPad unresponsiveness, function-only-guard variant still didn't satisfy the user on-device), and ultimately descoped entirely per explicit user/coordinator decision: duplicate-tap protection is not required, only "display/process once per normal submission" was the actual requirement, and that was true even without any guard. Guard code and its regression test have been reverted/removed; full suite (36 tests) and svelte-check are green.
next_action: Archive session (move to resolved/), commit code + docs, append knowledge-base entry.

reasoning_checkpoint:
  hypothesis: |
    (A) Round-robin bug: assignShootersToLines() is always called with
    blankEntries.length as `unassignedCount` and no offset. Because every
    prior registration is persisted immediately (lineAssignment becomes a
    real number, not null), the "unassigned" roster fed into the modal on
    each new submission contains only the single newly-staged shooter, so
    the round-robin index always restarts at 0 -> always line 1.
    (B) Double-confirmation bug: AutoAssignModal.handleSave() has no
    re-entrancy guard. A second "Speichern" click/tap fired before the
    first async handleSave() call resolves (db writes + onSave()) re-runs
    the entire body again against the same still-mounted roster, causing
    a second db.shooters.bulkAdd() for the same registration (duplicate
    persisted record / effectively the confirmation being carried out
    more than once per registration).
  confirming_evidence:
    - "Repro test (ShooterForm.repro.test.ts): registering 3 shooters sequentially via Registration.svelte with lineCount=2 yields lineAssignment [1,1,1], not [1,2,1] — confirms (A) directly."
    - "Code trace: ShooterForm.handleSubmit() builds `unassigned` from allShooters.filter(lineAssignment==null); after each save this set is empty, so AutoAssignModal always computes assignShootersToLines(1, lineCount, mode) -> index 0 -> line 1 every time."
    - "Repro test (ShooterForm.repro2.test.ts): firing two `click` events on the 'Speichern' button before the first async handleSave() resolves results in db.shooters.count() === 2 for a single staged registration — confirms (B) directly."
    - "Code trace: handleSave() in AutoAssignModal.svelte has no `saving`/disabled guard and the Speichern button has no disabled binding — nothing prevents a second invocation while the first is still in-flight."
  falsification_test: |
    (A) would be falsified if computedAssignments for the 2nd/3rd submission
    used any offset already, or if allShooters/unassigned somehow retained
    a running index across calls — it does not, confirmed by the repro test.
    (B) would be falsified if the Speichern button were disabled or handleSave
    checked a re-entrancy flag before proceeding — neither exists, confirmed
    by reading the full component and by the repro test reproducing a
    duplicate insert.
  fix_rationale: |
    (A) Fix by threading a "how many shooters already occupy a line" offset
    into assignShootersToLines' index math so each new registration's
    round-robin continues where the previous one left off, instead of
    restarting at 0. This addresses the root cause (missing cross-submission
    state) rather than a symptom.
    (B) Fix by adding a `saving` state flag in AutoAssignModal: set true at
    the start of handleSave, return immediately if already true, disable the
    Speichern (and Zurück) buttons while true. Addresses the root cause
    (missing re-entrancy guard on an async commit handler) rather than
    papering over the resulting duplicate rows.
  blind_spots: |
    - Have not tested on a real touchscreen device (only jsdom-simulated
      double click) — the double-submit mechanism is proven at the code
      level (missing guard) but the exact real-world trigger (double-tap
      latency) is inferred from the app being a touch-first PWA, not
      independently observed on a physical device.
    - The round-robin offset design choice (counting ALL previously
      line-assigned shooters, manual + auto, as consuming a round-robin
      slot) is a reasonable interpretation of "balanced across all lines"
      but wasn't explicitly specified for mixed manual/auto scenarios in
      the original bug report (repro steps use blank/auto for all 3).

## Evidence

- timestamp: 2026-07-05T00:00:00Z
  checked: ShooterForm.svelte, AutoAssignModal.svelte, shooterAutoAssignment.ts (full read)
  found: >
    ShooterForm.handleSubmit() builds the modal roster as
    (allShooters with lineAssignment==null) + the new staged entry.
    AutoAssignModal derives blankEntries from roster where lineNum===null
    and calls assignShootersToLines(blankEntries.length, lineCount, mode)
    with no starting offset — index always begins at 0.
  implication: >
    Every registration after the first has zero "unassigned" carry-over
    (previous ones are already persisted with a real lineAssignment), so
    blankEntries is always just the 1 new shooter and its round-robin
    index is always 0 -> line 1, regardless of how many shooters were
    registered before.

- timestamp: 2026-07-05T00:05:00Z
  checked: Ran repro test simulating 3 sequential registrations through Registration.svelte (lineCount=2)
  found: "db.shooters.toArray() line assignments = [1, 1, 1] (expected [1, 2, 1])"
  implication: Confirms hypothesis (A) directly and reproducibly.

- timestamp: 2026-07-05T00:10:00Z
  checked: AutoAssignModal.svelte handleSave() and Speichern button markup
  found: >
    handleSave() is an async function with no guard flag; the Speichern
    button has no `disabled` binding tied to an in-flight save state.
  implication: >
    Two rapid invocations of handleSave() (e.g. double-tap) both run to
    completion, each performing its own db.shooters.bulkAdd() against the
    same staged roster snapshot, producing a duplicate record for a single
    registration submission.

- timestamp: 2026-07-05T00:12:00Z
  checked: Ran repro test firing two click events on Speichern before the first async call resolves
  found: "db.shooters.count() === 2 after a single registration flow with a double-click on Speichern (expected 1)"
  implication: Confirms hypothesis (B) directly and reproducibly.

- timestamp: 2026-07-05T00:20:00Z
  checked: >
    First fix attempt: added `startIndex` param to assignShootersToLines and a
    `$derived(allShooters.filter(...).length)` alreadyAssignedCount in
    ShooterForm, passed to AutoAssignModal. Re-ran the 3-sequential-registrations
    repro test.
  found: "Line assignments came back [1, 2, 2] instead of [1, 2, 1] — the 3rd registration's offset was stale by one."
  implication: >
    `allShooters` is a liveQuery-backed `$derived` value; Dexie's liveQuery
    change notification is asynchronous and had not yet reflected the 2nd
    registration's just-committed bulkAdd by the time the 3rd registration's
    handleSubmit ran (this is the documented liveQuery-with-runes edge case
    referenced in the project's stack notes). Using a reactive/derived count
    for a point-in-time decision at submit time is unreliable.

- timestamp: 2026-07-05T00:25:00Z
  checked: >
    Revised fix: replaced reliance on the `allShooters` liveQuery-derived value
    inside handleSubmit with a freshly-awaited `db.shooters.toArray()` query at
    submit time, used to build both the unassigned-carryover list and the
    alreadyAssignedCount snapshot (stored in a plain `$state`, not `$derived`).
    Re-ran repro tests, then the full suite.
  found: "3-sequential-registration test now yields [1, 2, 1] as expected; double-click-Speichern test yields db.shooters.count() === 1; full suite (37 tests, 10/12 files) green."
  implication: Both root causes are fixed and verified against the exact reproduction steps; no regressions in existing suite.

- timestamp: 2026-07-05T00:30:00Z
  checked: >
    User real-device feedback (iPad): round-robin assignment confirmed working
    correctly, but the double-click guard "isn't working" on iPad — user
    suspected a timing issue and asked to stop displaying/relying on the
    `disabled={saving}` button state, moving the guard purely into the
    Speichern handler's own logic instead.
  found: >
    `disabled={saving}` toggled synchronously from inside the same tap's
    click handler is a known-unreliable pattern on iPadOS Safari (can
    suppress/alter subsequent tap handling on the same element, making the
    button feel unresponsive rather than reliably blocking a second save).
    The re-entrancy guard itself (`if (saving) return`) was already correct
    and sufficient on its own — the DOM `disabled` binding was redundant UI
    affordance layered on top of it, and that layer is what caused the
    iPad-specific problem.
  implication: >
    Removed `disabled={saving}` from both Speichern and Zurück buttons in
    AutoAssignModal.svelte; changed `saving` from a Svelte `$state` (which
    existed only to drive the removed `disabled` binding) to a plain
    non-reactive closure variable, since it is now purely an internal guard
    read/written only inside handleSave() and never bound to the template.
    Re-ran the full suite (37 tests) — all still green, including the
    double-click-no-duplicate regression test, confirming the guard remains
    effective without the disabled attribute.

- timestamp: 2026-07-05T00:40:00Z
  checked: >
    User re-verification on iPad after removing the `disabled` attribute:
    "Drop the double-click, it still does not work. Displaying the dialog
    once is sufficient." Coordinator decision: de-scope the double-click /
    re-entrancy guard entirely — it is not a required guarantee. The only
    actual requirement was that the AutoAssignModal displays/is processed
    once per normal registration submission, which is already true without
    any guard (the original "shown more than once" UAT symptom was the
    duplicate-DB-write side effect of a double-tap, not the dialog literally
    rendering twice — see Eliminated below).
  found: >
    Reverted AutoAssignModal.svelte's handleSave() to a plain implementation
    with no `saving` flag / no re-entrancy guard (byte-for-byte equivalent to
    the pre-debug-session version, apart from unrelated formatting). Removed
    the "does not persist a duplicate shooter when Speichern is clicked
    twice" regression test from ShooterForm.test.ts, since that guarantee is
    no longer provided by design. Re-ran full suite: 10 files, 36 tests, all
    green. `npm run check`: 0 svelte-check errors (same pre-existing
    unrelated vite.config.ts tsc error as before).
  implication: >
    Scope finalized: round-robin fix (startIndex/alreadyAssignedCount) is the
    complete, confirmed resolution. Double-click/duplicate-tap protection is
    explicitly out of scope per user decision — not a bug, not required.

## Resolution

root_cause: |
  Round-robin: assignShootersToLines() was always invoked with the
  round-robin index starting at 0 for every registration submission, because
  the only "unassigned" shooters fed into it were the ones from the current
  roster (which is always just the single newly-staged shooter once each
  prior registration is persisted with a real lineAssignment). There was no
  mechanism carrying the round-robin cursor across separate submissions.
  (The "modal shown more than once" UAT symptom was investigated in depth;
  the dialog itself was confirmed to render exactly once per submission in
  every scenario tested. Its underlying mechanism — a missing re-entrancy
  guard on AutoAssignModal.handleSave() allowing a double-tap to persist a
  duplicate db record — was identified and fixed, but subsequently
  descoped by explicit user decision: see Eliminated below.)
fix: |
  src/lib/utils/shooterAutoAssignment.ts: assignShootersToLines() gained an
  optional `startIndex` parameter (default 0) used to offset the round-robin
  index math. src/lib/components/ShooterForm.svelte: handleSubmit now awaits
  a fresh `db.shooters.toArray()` at submit time (instead of using the
  liveQuery-derived `allShooters`, which can lag behind a just-committed
  write — a documented Dexie liveQuery/Svelte-runes edge case) to compute
  both the unassigned-carryover list and a `stagedAlreadyAssignedCount`
  snapshot, passed to AutoAssignModal as the new `alreadyAssignedCount` prop.
  src/lib/components/AutoAssignModal.svelte uses `alreadyAssignedCount` as
  `startIndex` when calling assignShootersToLines().
verification: |
  - Regression test added: shooterAutoAssignment.test.ts ("continues the
    round-robin from startIndex across separate single-shooter calls");
    ShooterForm.test.ts ("distributes 3 sequentially-registered shooters
    round-robin (1,2,1) with lineCount=2").
  - Full suite: `npx vitest run` -> 10 test files, 36 tests, all passing.
  - `npm run check` (svelte-check + tsc) -> 0 errors/warnings from svelte-check
    (the one tsc error in vite.config.ts is pre-existing/unrelated, confirmed
    via `git stash` reproducing the same error before this fix).
  - Round-robin behavior confirmed working on a real iPad by the user
    ("assignment is great now").
files_changed:
  - src/lib/utils/shooterAutoAssignment.ts
  - src/lib/utils/shooterAutoAssignment.test.ts
  - src/lib/components/AutoAssignModal.svelte
  - src/lib/components/ShooterForm.svelte
  - src/lib/components/ShooterForm.test.ts

## Eliminated

- hypothesis: "Modal shown multiple times due to a reactive re-trigger (e.g. an $effect or duplicate onclick binding reopening the modal on unrelated state change)."
  evidence: >
    Full read of ShooterForm.svelte and Registration.svelte found exactly one
    `onclick={handleSubmit}` binding and exactly one `{#if showModal}` block
    with no other code path setting showModal=true. jsdom repro tests firing
    two rapid clicks on "Schütze hinzufügen" before the modal mounts still
    produced exactly 1 dialog element. Ruled out as the DOM-rendering
    mechanism; the closest related real mechanism found was a missing
    re-entrancy guard on AutoAssignModal.handleSave() (a double-tap on
    "Speichern" could persist a duplicate db record) — see next entry.
  timestamp: 2026-07-05T00:15:00Z

- hypothesis: "Double-click/duplicate-tap protection on 'Speichern' (re-entrancy guard in AutoAssignModal.handleSave(), with or without a `disabled` button binding) is required to fix the reported bug."
  evidence: >
    A `saving` guard + `disabled={saving}` binding was implemented and
    verified via automated tests (double-click no longer produced a
    duplicate record). However, on real iPad hardware the `disabled`-based
    variant made the button feel unresponsive (iPadOS Safari toggling
    `disabled` synchronously inside its own tap handler is unreliable), and
    a revision removing the `disabled` binding (keeping only the in-function
    guard) still did not satisfy the user on-device ("Drop the double-click,
    it still does not work"). Per explicit user/coordinator decision,
    duplicate-tap protection was declared out of scope: the only actual
    requirement is that the confirmation is displayed/processed once per
    normal (single-tap) submission, which is true without any guard. The
    guard code and its regression test were reverted/removed.
  timestamp: 2026-07-05T00:40:00Z
