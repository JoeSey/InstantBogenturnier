# Bogen-Trainingsturnier Verwaltung

## What This Is

A client-side web app (installable PWA) that lets an archery club trainer run informal training tournaments as judge (Kampfrichter) — from pre-tournament setup, through shooter registration and live score entry, to ranked results — fully usable offline on a single device at the shooting range.

**Shipped as v1.0** (2026-07-06): the full setup → registration → live score entry → ranked results flow, installable and offline-capable.

## Core Value

Score entry and results ranking must work correctly and offline, on one device, during a live tournament at the range — everything else is secondary.

## Requirements

### Validated

- [x] App is installable as a PWA and fully functional offline (no network required during the tournament) — Validated in Phase 1: Foundation
- [x] App uses a modern, glassmorphism-influenced design, responsive across phone/tablet/desktop, with automatic light/dark mode and a manual override toggle — Validated in Phase 1: Foundation
- [x] Trainer can define classes as a tuple of age group / bow type / distance, with only one field required and the rest optional, with an app-suggested name (e.g. RCV-U14) that the user can override — Validated in Phase 2: Setup & Registration
- [x] Trainer can set the number of shooting lines for the tournament — Validated in Phase 2: Setup & Registration
- [x] Trainer can set number of rounds and passes, choosing from WA presets (e.g. 1 round of 30 passes, 2 rounds of 30 passes) or a free custom configuration — Validated in Phase 2: Setup & Registration
- [x] Trainer can register shooters with name, class, and optional shooting line assignment — Validated in Phase 2: Setup & Registration
- [x] App indicates during shooter registration whether the tournament is running in mode AB or AB/CD (derived from shooter count vs. shooting line count) — Validated in Phase 2: Setup & Registration
- [x] Trainer can save and reload 4-8 named tournament configuration presets (classes, lines, rounds/passes setup) to quickly start a new tournament — Validated in Phase 2: Setup & Registration (implementation also adds full-preset export/import via `dexie-export-import`, pulled forward from the v1 tech-stack recommendation — see 02-CONTEXT.md D-15)
- [x] Trainer can enter scores per round/passe in a table (line, name, class, per-arrow scores, sum) sortable by clicking column headers (line, name, class, sum) — Validated in Phase 3: Score Entry
- [x] Trainer can save score entries mid-entry (interim save, via true per-cell autosave) and the app detects when all rounds/passes are complete, revealing an "Abschließen" (finalize/lock) action distinct from saving — Validated in Phase 3: Score Entry
- [x] Trainer can view results sorted by score descending, with ties sharing a rank and skipping the next rank (shared-rank/skip-next "1-2-2-4" convention) — Validated in Phase 4: Results
- [x] Results view adapts by screen size: class-selectable dropdown on phone, multi-column all-classes view on larger screens — Validated in Phase 4: Results
- [x] Trainer can explicitly start a new tournament via a dedicated reset action that clears all shooters and scores (not saved presets), after a confirmation warning — Validated in Phase 4: Results
- [x] App blocks destructive edits (deleting shooters, changing rounds/passes configuration) while finalized tournament data exists, directing the trainer to reset first instead of silently cascading — Validated in Phase 4: Results

### Active

(None yet — next milestone requirements to be defined via `/gsd:new-milestone`. Candidates already tracked below in Out of Scope: PDF export/certificates and blank scoresheets for v1.5.)

### Out of Scope

- PDF export of result lists and per-shooter certificates — deferred to v1.5
- WhatsApp delivery of certificates — deferred to v2
- Blank pre-printed scoresheets (DIN A5) — deferred to v1.5
- Concurrent multi-device score entry — explicitly ruled out; single device/single judge operation confirmed as the usage pattern
- Long-term persistence of tournament results after a tournament closes — only the 4-8 saved configuration presets persist, not results themselves
- Open-source packaging / multi-club distribution work (README, licensing, per-club onboarding) — deferred to v2.5, but architecture should avoid hardcoding club identity so this isn't a rewrite later

## Context

- Today, the club only runs one official tournament per year, tracked via paper scoresheets. The informal training tournament this app supports is a **new format** with no existing process to digitize — this app is meant to make that new format viable, not replace a painful existing one.
- Typical scale: 8-14 shooters across 2-5 classes per training tournament. Small enough that a fully client-side app has no realistic performance concerns.
- The trainer (judge) operates from a single device throughout the tournament, including at the range where connectivity may be unavailable or unreliable.
- Longer-term ambition (not in scope now): open-sourcing this for other archery clubs, tentatively v2.5.

**v1.0 shipped state (2026-07-06):**
- ~6,100 LOC across Svelte/TypeScript (`src/`), 208 commits, built 2026-07-03 → 2026-07-06.
- Tech stack confirmed as planned: Svelte 5 + Vite 8 + Tailwind 4, `vite-plugin-pwa` (`registerType: 'prompt'`), Dexie.js (v3 schema: classes, shootingLines, roundsConfig, shooters, scores), `dexie-export-import` for preset backup.
- Post-ship UAT (2026-07-06) surfaced four polish items, all fixed same-day via quick tasks: desktop sidebar nav was too wide (240px→120px, with a stale `xl:pl-[256px]` compensation value on `TopAppBar` missed during that fix and corrected separately), the Setup page's two-column grid stranded dead space under short cards (fixed by giving each column independent flex flow), the "Runden und Passen" section required an undiscoverable explicit save (switched to auto-save matching the rest of the setup page), and ending a tournament with zero registered archers was allowed to look "complete" (now explicitly guarded with a message).
- Known tech debt: `npm run check`'s `tsc -p tsconfig.node.json` step fails on a pre-existing `vite.config.ts` module-resolution error (`Cannot find module './src/lib/config/app.config'`), unrelated to any v1.0 phase — not yet fixed, logged in `.planning/quick/260706-9iv-.../260706-9iv-deferred-items.md`.

## Constraints

- **Tech stack**: Client-only (no backend/server, no hosted DB) — driven by the offline-at-the-range requirement and the fact that results don't need server-side persistence.
- **Framework**: Svelte + Vite + Tailwind CSS, `vite-plugin-pwa` for offline/service-worker caching, Dexie.js as the IndexedDB wrapper for local storage.
- **Device model**: Single-device operation only for v1 — no multi-device sync/concurrency to design for.
- **Offline**: Must be fully operable with zero network connectivity during live tournament use.
- **Future-facing**: Club-specific identity (name, branding) should live in configuration, not be hardcoded, in anticipation of a possible v2.5 open-source release.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-only PWA, no backend/DB | Matches hard offline-at-range requirement; results don't need persisting beyond the session; simplest path to eventual open-sourcing | ✓ Good — shipped fully offline-capable, verified via Playwright offline tests |
| Single-device score entry (no multi-device sync) | Confirmed actual usage pattern — one judge/trainer enters all scores | ✓ Good — no gaps surfaced during build or UAT |
| Svelte + Vite + Tailwind + vite-plugin-pwa + Dexie.js | Small bundle/fast load on range-side tablets/phones; Svelte's built-in reactivity covers score-table sorting and preset state without extra state libraries | ✓ Good — runes-based reactivity handled sorting/completion-detection/ranking cleanly with no extra state library needed |
| Club identity kept as configuration, not hardcoded | Enables possible v2.5 open-source distribution to other clubs without a rewrite | — Pending — not yet exercised; deferred until v2.5 |
| v1 milestone = core Phases 1-4 only | PDF export (v1.5) and WhatsApp delivery (v2) are explicitly deferred to keep the first milestone focused | ✓ Good — shipped as scoped, no scope creep |
| `vite-plugin-pwa` `registerType: 'prompt'` (not `autoUpdate`) | Avoid forcing a reload mid-tournament if the SW updates while the trainer briefly regains signal at the range | ✓ Good — implemented as planned in Phase 1 |
| Tie-break convention: shared-rank/skip-next ("1-2-2-4"), no X-ring countback | Explicitly simplified for informal training tournaments per user confirmation | ✓ Good — implemented in Phase 4, matches spec |
| Post-completion score correction: disallowed, permanent lock (no unlock path) | Confirmed in Phase 3 discussion (2026-07-05) — simplicity over recoverability for a single-session tool | ✓ Good — implemented in Phase 3/4, reused as `computeIsFinalized` guard across delete-shooter/delete-class/rounds-config |
| `dexie-export-import` for full preset export/import | Pulled forward from v1 tech-stack recommendation as cheap insurance against iOS Safari's IndexedDB eviction | ✓ Good — implemented in Phase 2, scoped strictly to the presets table |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-06 — after v1.0 milestone*
