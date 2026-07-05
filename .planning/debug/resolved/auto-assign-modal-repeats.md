---
status: resolved_not_a_bug
trigger: "Reopening prior session .planning/debug/resolved/auto-assign-modal-round-robin.md. That session's 'Eliminated' hypothesis claimed AutoAssignModal never renders more than once, attributing the original 'modal shown more than once' complaint entirely to a double-tap causing a duplicate DB write (subsequently descoped per user decision). Fresh on-device testing after a full website-data clear (ruling out stale service-worker cache; round-robin fix commit ab49025 confirmed present in the served build) contradicts that elimination: user reports 'the dialog keeps popping up after the first archer' without any deliberate double-tap."
created: 2026-07-05
updated: 2026-07-05
---

## Symptoms

- **Expected behavior (user's actual expectation, clarified):** The auto-assign confirmation modal should show once per session/tournament setup (the first time a shooter is auto-assigned), then subsequent registrations should silently auto-assign without a modal.
- **Actual behavior:** AutoAssignModal opens on every single registration submission (by design — see Resolution). User perceives this as the dialog "popping up again" when finishing archer 2's form.
- **Reproduction, precisely characterized via follow-up questions:** Archer 1 registers fine, modal shows once, closes fine on Speichern. Archer 2: filling the form and submitting opens the modal again. This is the current designed behavior (one confirmation per registration), not a defect — confirmed via direct user Q&A ("It closes fine after archer 1, but opens again when I finish archer 2's form. displaying it once is sufficient.").

## Resolution — NOT A BUG

Code review of the current (already-patched, round-robin-fixed) `ShooterForm.svelte` / `AutoAssignModal.svelte` confirms the modal is *designed* to open on every registration submission where any shooter needs auto-assignment. This was an explicit, documented decision from Phase 2 planning:

- `02-03-PLAN.md`'s threat model (T-02-07, disposition `accept`): "AB/AB-CD mode & auto-assignment algorithm exposed in the UI... transparency is an explicit UX requirement (RESEARCH.md Pitfall 4), not a security concern."
- The modal's own copy (`strings.registration.autoAssignModalRationale`/`autoAssignHint`) exists specifically to explain the auto-assignment to the trainer each time.

No code defect found. `showModal` state management, `handleSave`/`handleModalSave`/`handleModalBack` all behave correctly and match the intended one-modal-per-registration design.

**Scope decision (made with user, 2026-07-05):** Change the UX so the modal is shown only once per session (first auto-assignment ever), then subsequent registrations auto-assign silently without a confirmation dialog. This is a feature/behavior change, not a bug fix — routed to `/gsd-quick` for implementation rather than continuing under this debug session.

## Eliminated

- hypothesis: "Silent write failure in handleSave() lands in the catch block, so onSave() never fires and the modal never actually closes (mis-described by user as 'popping up again')."
  evidence: "User's precise repro (via follow-up question) confirms the modal DOES close correctly after archer 1's Speichern — it reopens later, for archer 2's own submission, which is expected per-registration behavior, not a stuck/un-closing dialog."
  timestamp: 2026-07-05T00:00:00Z
- hypothesis: "liveQuery-driven reactivity (allShooters/lineConfigQuery) causes a real re-render loop under real Dexie that flips showModal back to true on its own."
  evidence: "Ruled out by the same clarified repro: the modal only reopens in direct response to the user submitting a new (second) registration, not spontaneously or independent of user action."
  timestamp: 2026-07-05T00:00:00Z
