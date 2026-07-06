# Milestones

## v1.1 PDF Export (Shipped: 2026-07-06)

**Delivered:** PDF export of tournament results, with a configurable header title and two logo images stored via a new Settings section.

**Phases completed:** 1 phase (Phase 5), 3 plans, 4 tasks (2 build + 2 gap-closure)
**Timeline:** 2026-07-06 (same day as v1.0's ship date)
**Git range:** 7b87a76 (phase plan) → 98144d6 (roadmap archive) — 27 files changed, +2513/-23 LOC
**Known deferred items at close:** 10 (see STATE.md Deferred Items — carried over unchanged from v1.0's close; all verified false positives, no real open work)

**Key accomplishments:**

- Trainer can configure a PDF header title and two logo images in a new Settings section, backed by a Dexie v4 `settings` table with Canvas-based image downscaling (`downscaleImageBlob()`).
- Trainer can export ranked tournament results as a single, paginated PDF (one section per class, Rank/Name/Gesamt columns) directly from the Results view via `generateResultsPdf()` — verified end-to-end including fully offline.
- Trainer can include or exclude incomplete-score shooters from the export via a checkbox, default excluded.
- Post-verification gap closure (plan 05-03): header logos of any format (PNG or JPEG) and any aspect ratio now render correctly in the PDF — fixed by normalizing uploads to PNG at the downscale step and adding an aspect-ratio-preserving `containFit()` placement helper.
- Existing `dexie-export-import` preset backup mechanism reused unmodified to also cover the new settings/logo data.

**Follow-up:** Per-shooter PDF certificates were split off from Phase 5 via SPIDR (Interfaces axis) into a future phase — not yet scheduled.

---

## v1.0 MVP (Shipped: 2026-07-06)

**Delivered:** Full setup → registration → live score entry → ranked results flow for running an informal archery training tournament, installable as an offline-capable PWA on a single device.

**Phases completed:** 4 phases, 12 plans, 28 tasks
**Timeline:** 2026-07-03 → 2026-07-06 (3 days)
**Git range:** 6f4193c (scaffold) → 74578fa (final polish) — 208 commits, 195 files changed, ~35.7k insertions
**Size:** ~6,100 LOC (Svelte/TypeScript)
**Known deferred items at close:** 10 (see STATE.md Deferred Items — all verified false positives from the pre-close audit: 9 quick-task summaries missing an optional status field, 1 resolved-debug-session log misidentified as an open session; no real open work)

**Key accomplishments:**

- Scaffolded InstantBogenturnier from zero into an installable, offline-capable Svelte 5 + Vite 8 + Tailwind 4 PWA with a FOUC-safe persisted light/dark toggle, single-source app identity, empty Dexie schema opened on boot, and full green Vitest + offline Playwright test coverage.
- Responsive glass nav shell (bottom tab bar / sidebar switching at 768px) with four "coming soon" placeholder sections and a session-dismissible, user-gated PWA update banner — all 4 tasks complete, including human verification on a real device.
- Dexie v2 schema (5 tables) plus a fully working Classes card: live app-suggested class names (bow-abbr/age/distance tuple) with semantic collision auto-suffixing, backed by fake-indexeddb-tested Dexie CRUD.
- Shooting-line count input and a WA-preset-or-custom rounds/passes configurator, both persisting to their singleton Dexie rows and driving a live summary line before save.
- Shooter registration with a non-dismissible, transparent round-robin auto-assignment preview modal and a live AB/AB-CD mode indicator computed via `shooterCount > 2 x lineCount`.
- Full preset management (save/load/delete/export/import, capped at 8) built on dexie-export-import, scoped strictly to the presets table so it never touches the shooter roster or live setup state.
- Tap-button (0-10/X/M) autosave score table wired into the Erfassung nav tab, backed by a new Dexie v3 `scores` table with compound-key upsert semantics — every tap writes to IndexedDB immediately with no save button.
- Clickable Linie/Name/Klasse/Summe column-header sorting on the live score table, backed by a fully unit-tested pure sortComparators module and ephemeral (non-persisted) Svelte 5 $state.
- Added `areAllScoresEntered` completion detection and a permanently irreversible "Turnier abschließen" finalize action, gated behind full completion and an explicit non-dismissible confirmation, completing SCORE-01 through SCORE-07.
- Pure tournament-wide ranking function (shared-rank/skip-next ranks) plus a Results.svelte view rendering a phone class dropdown or a responsive 1/2/3-column desktop grid, wired into nav in place of the Phase 1 placeholder.
- Destructive "Neues Turnier starten" reset button on Results.svelte, atomically clearing only shooters+scores via a single Dexie transaction, gated behind a reused non-dismissible ConfirmDialog.
- Single shared `computeIsFinalized` pure function now gates delete-shooter, delete-class, and the entire rounds/passes + shooting-line config behind disabled controls with an inline "Turnier abgeschlossen" message once a tournament is finalized.

---
