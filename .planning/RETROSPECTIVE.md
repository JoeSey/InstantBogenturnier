# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-07-06
**Phases:** 4 | **Plans:** 12 | **Tasks:** 28

### What Was Built
- Installable, fully offline-capable PWA shell (Svelte 5 + Vite 8 + Tailwind 4) with responsive glass nav and automatic light/dark mode.
- Complete tournament setup: classes with app-suggested names, shooting lines, WA-preset/custom rounds & passes, and reusable presets (save/load/delete/export/import).
- Shooter registration with round-robin auto-assignment across shooting lines and live AB/AB-CD mode detection.
- Live, per-arrow autosave score entry table (tap-button 0-10/X/M), sortable columns, and a permanent "Turnier abschließen" finalize lock.
- Ranked results view (shared-rank/skip-next) adapting from a phone dropdown to a multi-column desktop grid, plus a destructive tournament-reset action guarded against loss of finalized data.
- Post-ship polish pass (same day as ship): narrower desktop nav, two-column setup layout, auto-saving rounds config, zero-archer edge-case handling, and two follow-up fixes for a sidebar-overlap regression the nav-width change introduced.

### What Worked
- Svelte 5 runes (`$state`/`$derived`) fully replaced the need for an external state library — score-table sorting, completion detection, and ranking were all plain reactive derivations.
- A single shared `computeIsFinalized` pure function, reused across delete-shooter, delete-class, and rounds/passes config guards, kept the "finalized tournament is locked" rule consistent everywhere instead of being reimplemented per view.
- The onchange-driven auto-save convention (no explicit "Speichern" button), established early for the shooting-lines field, was later recognized as the right pattern to extend to "Runden und Passen" during post-ship UAT — consistency across the setup page made the fix obvious once someone looked for the existing pattern.
- Quick tasks (`/gsd:quick`) were an effective vehicle for same-day post-ship polish: 9 quick tasks shipped between 2026-07-05 and 2026-07-06 without needing a new phase for each one-off UI fix.

### What Was Inefficient
- The sidebar-width change (240px → 120px) updated `Sidebar.svelte` and `App.svelte`'s `<main>` padding, but missed `TopAppBar.svelte`'s own independent `xl:pl-[256px]` padding value and `UpdateBanner.svelte`'s missing padding compensation entirely — a grep for the old width value across all consumers, not just the two files the plan mentioned, would have caught both in the same task instead of requiring a follow-up bug report from UAT.
- A couple of quick tasks landed without any status/verification frontmatter, which later showed up as noise in the milestone-close audit (had to be manually verified as false positives rather than caught automatically).

### Patterns Established
- **Sidebar-width companion padding**: any fixed-position sidebar width change must be greped across all consumers (`Sidebar.svelte`, `App.svelte main`, `TopAppBar.svelte`, `UpdateBanner.svelte`) using the `width + 16px` convention, not just the most visible one.
- **Auto-save over explicit save buttons**: for single-session, single-device tournament setup, onchange-driven persistence is the established convention — new setup fields should follow it rather than adding a save button.
- **Shared `isFinalized` guard**: any new destructive or configuration-changing action on tournament data should gate through the shared `computeIsFinalized` check, not a bespoke one.

### Key Lessons
1. When a shared layout constant (nav width, breakpoint padding) changes, grep the whole codebase for the old value before considering the change complete — don't rely on remembering every consumer.
2. Post-ship UAT on real screen sizes (not just automated viewport tests) caught two visual bugs automated tests missed entirely (dead grid space, sidebar-overlap) — worth doing even for a "done" milestone before archiving.
3. Quick-task summaries should set a status field even outside `--validate` mode; it costs little and avoids manual triage noise at milestone close.

### Cost Observations
- Model mix: planner/executor agents ran on `sonnet` (config `model_profile: budget`); no `opus` or `haiku` verification/checker agents were used since quick-mode tasks skipped `--validate`.
- Sessions: 4 phases (12 plans) plus 9 quick tasks across 2026-07-03 → 2026-07-06.
- Notable: same-day ship-to-polish turnaround — post-ship UAT and fixes for the final 3 items completed within hours of the v1.0 push, all via quick tasks rather than a new phase.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 13 (4 phase + 9 quick) | 4 | Initial roadmap execution; quick-task workflow introduced for post-ship polish |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|---------------------|
| v1.0 | 128 (Vitest) + Playwright e2e suite | Not measured | 0 (all changes used the already-locked stack) |

### Top Lessons (Verified Across Milestones)

1. Grep for all consumers of a shared layout constant before calling a resize/rename complete.
