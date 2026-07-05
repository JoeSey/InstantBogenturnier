# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## auto-assign-modal-round-robin — round-robin line assignment always assigns line 1, not balanced across lines
- **Date:** 2026-07-05
- **Error patterns:** round-robin, line assignment, AutoAssignModal, assignShootersToLines, lineAssignment, all shooters on line 1, shown more than once, double-tap, double-click, liveQuery stale, Dexie liveQuery lag, Svelte runes stale derived
- **Root cause:** assignShootersToLines() always started its round-robin index at 0 on every registration submission, because only the newly-staged (not-yet-assigned) shooter was ever passed in as the batch to assign — prior shooters were already persisted with a real lineAssignment, so there was no mechanism carrying the round-robin cursor across separate submissions. (A related, ultimately descoped-by-user-decision issue: relying on a `$derived` count sourced from a Dexie `liveQuery` for a point-in-time offset at submit time is unreliable — the liveQuery's async change notification can lag behind a just-committed write by one registration; fix by querying `db.<table>.toArray()` fresh/awaited at the moment of decision instead of using the reactive/derived value.)
- **Fix:** Added an optional `startIndex` parameter to `assignShootersToLines()`. Caller (ShooterForm.svelte) now awaits a fresh `db.shooters.toArray()` at submit time (not the liveQuery-derived reactive value) to compute the count of already-assigned shooters, and passes it through AutoAssignModal as `alreadyAssignedCount` -> used as `startIndex`.
- **Files changed:** src/lib/utils/shooterAutoAssignment.ts, src/lib/utils/shooterAutoAssignment.test.ts, src/lib/components/AutoAssignModal.svelte, src/lib/components/ShooterForm.svelte, src/lib/components/ShooterForm.test.ts
---
