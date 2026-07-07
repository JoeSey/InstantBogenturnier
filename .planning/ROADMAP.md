# Roadmap: Bogen-Trainingsturnier Verwaltung

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-07-06)
- ✅ **v1.1 PDF Export** — Phases 5-6 (shipped 2026-07-07)
- 🚧 **v1.2 Scoresheets** — Phase 7 (in progress)

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

### v1.2 Scoresheets (Phase 7) — IN PROGRESS

- [ ] **Phase 7: Blank Scoresheet PDF** - Trainer can download a blank A5 scoresheet PDF, grid-sized to the current rounds/passes/arrows config, from Einrichtung

## Phase Details

### Phase 7: Blank Scoresheet PDF
**Goal**: Trainer can generate and print a blank A5 scoresheet, matching the tournament's configured grid, as a paper fallback at the range.
**Depends on**: Nothing new (reuses Phase 5/6 jsPDF + Settings header infrastructure)
**Requirements**: SHEET-01, SHEET-02, SHEET-03, SHEET-04, SHEET-05, SHEET-06, SHEET-07
**Success Criteria** (what must be TRUE):
  1. Trainer can click a button/link in the Einrichtung (Setup) view, next to the rounds/passes config, and download a scoresheet PDF.
  2. The downloaded PDF's score grid has exactly the number of rounds/passes/arrow-columns currently configured in `db.rounds` — changing the config changes the grid on next export.
  3. The PDF is A5 portrait, a single page, with blank handwriting fields at the top (name, class, shooting line, Schreiber) and blank signature lines at the bottom (Unterschrift Schütze, Unterschrift Schreiber).
  4. The PDF header shows the same configured title and left/right logo images as the results-list and certificate PDFs (when configured in Settings).
  5. The export works with the device offline (airplane mode / no network).
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md — Blank scoresheet PDF builder/generator (scoresheetExport.ts) with A5 grid, header fields, signature lines
- [ ] 07-02-PLAN.md — Wire download button into SetupRounds.svelte, i18n strings, e2e coverage incl. offline

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-07-04 |
| 2. Setup & Registration | v1.0 | 4/4 | Complete | 2026-07-04 |
| 3. Score Entry | v1.0 | 3/3 | Complete | 2026-07-05 |
| 4. Results | v1.0 | 3/3 | Complete | 2026-07-05 |
| 5. PDF Export | v1.1 | 3/3 | Complete | 2026-07-06 |
| 6. Certificates PDF Export | v1.1 | 5/5 | Complete | 2026-07-07 |
| 7. Blank Scoresheet PDF | v1.2 | 0/2 | Not started | - |
