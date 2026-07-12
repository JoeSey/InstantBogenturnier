# Roadmap: Bogen-Trainingsturnier Verwaltung

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-07-06)
- ✅ **v1.1 PDF Export** — Phases 5-6 (shipped 2026-07-07)
- ✅ **v1.2 Scoresheets** — Phase 7 (shipped 2026-07-07)
- 🚧 **v1.3 DFBV Target Faces** — Phases 8-9 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-07-06</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-07-04
- [x] Phase 2: Setup & Registration (4/4 plans) — completed 2026-07-04
- [x] Phase 3: Score Entry (3/3 plans) — completed 2026-07-05
- [x] Phase 4: Results (3/3 plans) — completed 2026-07-05

Full phase details (goals, success criteria, requirements): `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 PDF Export (Phases 5-6) — SHIPPED 2026-07-07</summary>

- [x] Phase 5: PDF Export (3/3 plans) — completed 2026-07-06
- [x] Phase 6: Certificates PDF Export (5/5 plans) — completed 2026-07-07

Full phase details (goals, success criteria, requirements): `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Scoresheets (Phase 7) — SHIPPED 2026-07-07</summary>

- [x] Phase 7: Blank Scoresheet PDF (2/2 plans) — completed 2026-07-07

Full phase details (goals, success criteria, requirements): `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 DFBV Target Faces (In Progress)

**Milestone Goal:** Support 5-ring DFBV target faces alongside the existing WA 10-ring faces, so trainer colleagues running DFBV-style tournaments get correct scoring options, colors, and PDF output.

- [x] **Phase 8: Rings Configuration** - Trainer can set a tournament's Auflagen (10 or 5 rings) via updated Vorlagen presets or an explicit Benutzerdefiniert choice (completed 2026-07-12)
- [ ] **Phase 9: Rings-Aware Score Entry & PDF Output** - Score entry dialog and results PDF correctly reflect the tournament's active rings setting

## Phase Details

### Phase 8: Rings Configuration
**Goal**: Trainer can configure a tournament's Auflagen (10 or 5 rings) — automatically via a Vorlagen preset, or explicitly in Benutzerdefiniert mode — with older configs defaulting safely to 10.
**Depends on**: Phase 7 (Blank Scoresheet PDF; builds on the same `db.rounds` config surface in `SetupRounds.svelte`)
**Requirements**: TARGET-01, TARGET-02, TARGET-03, TARGET-04
**Success Criteria** (what must be TRUE):
  1. Trainer can pick one of three Vorlagen presets ("WA 10 Passen à 3 Pfeile", "DFBV 6 Runden à 5 Pfeile", "WA 70"), each silently applying its correct Auflagen (10 or 5) with no separate rings control shown.
  2. Trainer can switch to Benutzerdefiniert mode and explicitly choose Auflagen 10 or 5 via a radio control, in place of the old free-text distance field.
  3. The top-level radio group in Runden und Passen reads "Vorlagen/Benutzerdefiniert".
  4. A tournament configured before this change (no `rings` field stored) continues to behave exactly as a 10-ring tournament, with no manual migration step required.
**Plans**: 2 plans
**UI hint**: yes

Plans:
- [x] 08-01-PLAN.md — RoundConfig.rings field + new WA/DFBV presets + strings
- [x] 08-02-PLAN.md — SetupRounds.svelte Auflagen UI wiring + PresetSave.svelte rings persistence

### Phase 9: Rings-Aware Score Entry & PDF Output
**Goal**: Score entry and results PDF output correctly reflect whichever rings setting (10 or 5) is active for the tournament, for both new entry and later inspection of existing scores.
**Depends on**: Phase 8
**Requirements**: TARGET-05, TARGET-06, TARGET-07, TARGET-08
**Success Criteria** (what must be TRUE):
  1. The score-entry dialog (ScorePicker) shows the correct value/color set for the tournament's active rings setting — 10-ring unchanged (X/10/9 yellow, 8/7 red, 6/5 blue, 4/3 black, 2/1 white, M grey); 5-ring shows X/5 white, 4-1 dark blue, M grey.
  2. Physical-keyboard score entry (digits/X/M) resolves unambiguously and correctly under both rings settings.
  3. The results-list PDF's score-column header reads "X/10/9" for 10-ring tournaments and "X/5" for 5-ring tournaments.
  4. Previously entered scores display correctly, without crashing, when inspected under the tournament's current rings setting.
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 09-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-07-04 |
| 2. Setup & Registration | v1.0 | 4/4 | Complete | 2026-07-04 |
| 3. Score Entry | v1.0 | 3/3 | Complete | 2026-07-05 |
| 4. Results | v1.0 | 3/3 | Complete | 2026-07-05 |
| 5. PDF Export | v1.1 | 3/3 | Complete | 2026-07-06 |
| 6. Certificates PDF Export | v1.1 | 5/5 | Complete | 2026-07-07 |
| 7. Blank Scoresheet PDF | v1.2 | 2/2 | Complete | 2026-07-07 |
| 8. Rings Configuration | v1.3 | 2/2 | Complete   | 2026-07-12 |
| 9. Rings-Aware Score Entry & PDF Output | v1.3 | 0/? | Not started | - |
