# Milestones

## v2 3D / Field Tournaments (branch `feature/3d-tournaments` — pending merge)

**Delivered:** A parallel scoring model for DFBV-style 3D/field parcours alongside the existing ring-target flow — course of N stations instead of rounds/passes, zone-and-arrow-ordinal outcome tokens (Kill/Vital/Wound × 1./2./3. Pfeil) instead of ring values, per-leg rulesets with editable point tables, per-archer whole-scorecard entry, and Kill/Vital/Wound tie-break in results. `scoringMode` undefined ⇒ ring mode, so every existing tournament and preset is untouched with zero migration.

**Structure:** 7 build slices, executed directly per user request (bypassing the discuss/plan/execute workflow), each an atomic commit. Preceded by a research pass (DFBV SpO 2024 §6.7 — see auto-memory `3d-archery-scoring-research.md`) and an agreed data-model design (`.planning/milestones/v2-3D-DESIGN.md`).
**Git range:** `b7d60b5` (slice 0 — per-archer entry layout, landed on `main` first) → `c914bf4`/`8e19b7a` (design docs) → `e6fd0bc` … `d220683` (slices 1–6) → slice 7 (e2e + docs).
**Tests at close:** 313 unit/component tests + `e2e/threeD.spec.ts` (offline happy-path) pass; production build clean; `npm run check` unchanged at 11 pre-existing errors.

**Key accomplishments:**

- **Schema (slice 1):** `ScoreValue` split into `RingScoreValue | ThreeDScoreValue` (`K1`..`W3` | `M`); `ScoringMode`, `RoundRuleset`, and `scoringMode`/`roundRulesets` on `RoundConfig` — no `ScoreRecord` PK change, no Dexie version bump. `threeDTemplates.ts` ships `dfbv-3arrow` (SpO §6.7.8: 20/18/16 → 14/12/10 → 8/6/4) and `dfbv-hunter` (§6.7.9); `threeDScoring.ts` has `resolveRuleset` (merges point overrides over template defaults) and `scoreTarget`.
- **Generalised scoring (slice 2):** `buildScoringContext(config)` — one object exposing `pointsFor`/`tieBreakLabels`/`tieBreakCounts`/`entriesExpected` — plus `isTournamentComplete`. `ranking.ts`'s per-shooter helpers take a context or the legacy ring count; `assignRanks` compares a tuple key `[sum, ...tieBreakCounts]` so ring "1-2-2-4" is preserved and 3D breaks ties by Kill then Vital count.
- **Setup 3D panel (slice 3):** "Wertung" segmented control swaps the ring/preset block for a 3D-Aufbau panel — stations per leg, leg count, per-leg template dropdown, and a `ThreeDPointGrid` matrix editor (Kill/Vital/Wound × ordinal) with a "(Standardwerte)"/"(angepasst)" badge and reset. Presets carry `scoringMode`+`roundRulesets`; import validation requires a well-formed ruleset per leg.
- **3D score entry (slice 4):** `ScoreOutcomeGrid` (zone × ordinal button grid + Fehlschuss) and `ArcherCard3d` (Ziel | Wertung | Punkte rows). In 3D the per-archer card is the only layout; a fresh pick auto-advances the picker to the next unscored station and closes when the card is complete.
- **Results (slice 5):** `ResultsTable` gains Kill/Vital/Wound count columns (via a `tieBreakLabels` prop) in 3D mode; the sums/ranks were already correct from slice 2.
- **PDFs (slice 6):** results-list PDF replaces the X/10/9 column with per-leg template labels + Kill/Vital/Wound counts; the blank scoresheet becomes a per-station outcome card — one A5 page per leg with that leg's point-table legend.
- **Close-out (slice 7):** `e2e/threeD.spec.ts` drives config → outcome entry → finalize → Kill/Vital/Wound results and both PDFs offline; README/SPECS updated; `appVersion` → `2.0`.

**Known deferred (design leaves room, no code):** additive-scoring templates (`dfbv-doppelhunter` 2 entries/target, `wa-3d` flat 11/10/8/5), a 2-zone Scandinavian template, per-leg station counts. The `entriesPerTarget` / `zones`-as-data model means these are data + minor UI, not a reshape.

---

## v1.5 Post-Ship Robustness & Cross-Device Continuation (Shipped: 2026-07-17)

**Delivered:** Fixed a first-real-deployment PWA-only crash discovered live at a tournament, then shipped five follow-on requests from the same session as quick tasks (no phases/plans — executed directly per user request, bypassing the discuss/plan/execute workflow for this batch of small, independently-shippable items).

**Phases completed:** 0 phases, 6 quick tasks
**Timeline:** 2026-07-17 (single-day milestone)
**Git range:** bf0fe25 (PWA download fix) → 6af8f96 (advance-button dedup) — see `.planning/milestones/v1.5-ROADMAP.md` for the itemized list
**Known deferred items at close:** none new; v1.0-era false positives from prior closes remain (see Deferred Items in STATE.md)

**Key accomplishments:**

- **PWA export/download reliability**: installed (standalone-display-mode) PWAs on iPadOS/macOS Safari couldn't reliably trigger any file export (scoresheet, results PDF, certificates, presets) — the `<a download>` + blob: URL pattern could throw and even required force-quitting the app. Replaced with a `downloadBlob()` helper that opens the blob in a new window.
- **Root-caused a second, recurring failure** ("Schießformular konnte nicht generiert werden" right after every settings save): WebKit's IndexedDB invalidates a previously-read Blob on any subsequent write to the same object store. Migrated `SettingsRecord`'s header-logo fields from `Blob` to base64 data URI strings (Dexie v6 migration) rather than working around the bug — eliminates the precondition entirely. Diagnosed via an on-screen `describeError()` debug pass after two earlier guessed fixes (download mechanism, then write-timing) didn't resolve it, since installed PWAs have no accessible devtools console.
- Renamed the git default branch `master` → `main` to match GitHub's default; old branch deleted.
- **Score-entry audio + flash confirmation**: a short tone (Web Audio) plus a brief full-screen flash on every registered score tap. True haptic feedback (Vibration API) isn't available on iOS Safari, including installed PWAs, at all — this is the cross-platform substitute. Fixed a follow-up CSS bug (missing `animation-fill-mode: forwards`) that left the flash stuck solid instead of fading out.
- **Whole-tournament export/import** ("continue on another device"): new controls on the Ergebnisse tab export classes/shooters/scores/settings to a file (iOS's native save/share sheet handles iCloud Drive) and re-import with an overwrite-confirm dialog naming exactly what will be replaced. Pre-import validation rejects a structurally-incomplete file before ever showing that dialog. Reuses `PresetList.svelte`'s `exportDB`/`importInto` pattern with the opposite skip-list (`presets` untouched instead of everything-but-presets); unlike the preset-load flow, no `classId` reconciliation is needed since classes and shooters are replaced together from the same snapshot.
- **Runde/Passe prev/next navigation**: unconditional "<"/">" buttons flanking the Runde/Passe dropdowns, stepping linearly through the whole round/passe sequence (wrapping at round boundaries) — added after feedback that switching between two halves of the archer roster mid-tournament via the dropdowns alone was clumsy. The old conditional teal "advance" arrow (shown only once the current passe was fully scored) was folded into the new Next button instead of staying a second, redundant ">" control.
- This milestone also folds in **v1.3 DFBV Target Faces** (Phases 8-9, completed 2026-07-12 per STATE.md but never separately tagged/released) — see that entry below and `.planning/milestones/v1.3-ROADMAP.md`.

---

## v1.3 DFBV Target Faces (Shipped: 2026-07-12, tagged retroactively with v1.5)

**Delivered:** 5-ring DFBV target face support alongside the existing WA 10-ring faces — correct scoring options, colors, and PDF output for DFBV-style tournaments.

**Phases completed:** 2 phases (Phase 8, Phase 9), 5 plans
**Timeline:** 2026-07-12 (single-day milestone)
**Git range:** see `.planning/milestones/v1.3-ROADMAP.md` for phase/plan breakdown
**Known deferred items at close:** 10 (see STATE.md Deferred Items — carried over unchanged from prior milestone closes; all verified false positives, no real open work)

**Key accomplishments:**

- Trainer can pick one of three Vorlagen presets ("WA 10 Passen à 3 Pfeile", "DFBV 6 Runden à 5 Pfeile", "WA 70"), each silently applying its correct Auflagen (10 or 5 rings) with no separate rings control shown, or switch to Benutzerdefiniert mode and explicitly choose Auflagen 10 or 5.
- A tournament configured before this change (no `rings` field stored) continues to behave exactly as a 10-ring tournament, with no manual migration step required.
- The score-entry dialog (ScorePicker) shows the correct value/color set for the tournament's active rings setting, both via tap and physical-keyboard entry — 10-ring unchanged, 5-ring shows X/5 white, 4-1 dark blue, M grey.
- The results-list PDF's score-column header reads "X/10/9" for 10-ring tournaments and a distinct 5-ring hit-count header for 5-ring tournaments; X's point value (10 vs 5) is correctly applied everywhere sums/rankings/PDF totals are computed.
- Previously entered scores display correctly, without crashing, when inspected under the tournament's current rings setting.

---

## v1.2 Scoresheets (Shipped: 2026-07-07)

**Delivered:** Downloadable blank A5 scoresheet PDF, grid sized to the current rounds/passes/arrows config, as a paper fallback at the range.

**Phases completed:** 1 phase (Phase 7), 2 plans, 3 tasks
**Timeline:** 2026-07-07 (single-day milestone, including several UAT polish rounds)
**Git range:** f293553 (roadmap) → fc64536 (post-ship UAT fixes) — 14 files changed
**Known deferred items at close:** 10 (see STATE.md Deferred Items — carried over unchanged from prior milestone closes; all verified false positives, no real open work)

**Key accomplishments:**

- Trainer can download a blank A5 scoresheet PDF from the Einrichtung (Setup) view, next to the rounds/passes config — pure `scoresheetExport.ts` module built TDD-style, reusing `containFit()`/`blobToDataUri()` and the Settings title+logo header treatment from Phase 5/6.
- Verified fully offline via e2e test (`context.setOffline(true)`), matching the app's core value.
- Post-ship UAT redesign: real tournament scoresheets are per-round, not one sheet for the whole tournament — replaced the multi-round packed grid with a single-round `Passe | Ringe Pfeil Nr. (per-arrow sub-columns) | Summe Zeile | Summe gesamt` table, pre-filled pass numbers, a struck-through redundant first-row cell, and a blank "Runde:" field (auto-omitted for single-round tournaments).
- Bonus UAT fixes bundled into the same milestone: keyboard shortcuts for score entry (digits 1-9, "0"→10, "x"/"X", "m"/"M") in `ScorePicker.svelte`, and a global `touch-action: manipulation` fix for iOS/iPadOS's double-tap-to-zoom interfering with fast repeated score taps.

---

## v1.1 PDF Export (Shipped: 2026-07-07)

**Delivered:** PDF export of tournament results (configurable header title + two logo images), plus per-shooter PDF certificates (bulk ZIP export and per-row single export).

**Phases completed:** 2 phases (Phase 5, Phase 6), 8 plans, 20+ tasks
**Timeline:** 2026-07-06 (Phase 5) → 2026-07-07 (Phase 6 + post-ship polish)
**Git range:** 7b87a76 (phase 5 plan) → 79589c0 (v1.1 tag) — 42 files changed
**Known deferred items at close:** 10 (see STATE.md Deferred Items — carried over unchanged from v1.0's close; all verified false positives, no real open work)

**Key accomplishments:**

- Trainer can configure a PDF header title and two logo images in a new Settings section, backed by a Dexie v4 `settings` table with Canvas-based image downscaling (`downscaleImageBlob()`).
- Trainer can export ranked tournament results as a single, paginated PDF (one section per class, Rank/Name/Gesamt columns) directly from the Results view via `generateResultsPdf()` — verified end-to-end including fully offline.
- Trainer can include or exclude incomplete-score shooters from the export via a checkbox, default excluded.
- Post-verification gap closure (plan 05-03): header logos of any format (PNG or JPEG) and any aspect ratio now render correctly in the PDF — fixed by normalizing uploads to PNG at the downscale step and adding an aspect-ratio-preserving `containFit()` placement helper.
- Existing `dexie-export-import` preset backup mechanism reused unmodified to also cover the new settings/logo data.
- Phase 6: trainer can generate per-shooter PDF certificates (Urkunden) — a tournament-wide bulk action producing one ZIP of per-shooter PDFs (JSZip), and a per-row action producing a single standalone certificate PDF, both reusing Phase 5's header/logo infrastructure plus a new configurable static heading (Dexie v5 migration).
- Post-ship polish (2026-07-07): results grid switched to an auto-fit layout (cards no longer squeezed into a fixed column count), always-visible scrollbar on horizontally-scrollable tables, certificate layout redesigned to mirror a real printed club certificate, and a fresh-install edge case fixed where the rounds/passes config never persisted until an explicit `onchange` fired.

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
