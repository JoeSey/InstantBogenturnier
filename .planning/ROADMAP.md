# Roadmap: Bogen-Trainingsturnier Verwaltung

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-07-06)
- 🚧 **v1.1 PDF Export** — Phase 5 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-07-06</summary>

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-07-04
- [x] Phase 2: Setup & Registration (4/4 plans) — completed 2026-07-04
- [x] Phase 3: Score Entry (3/3 plans) — completed 2026-07-05
- [x] Phase 4: Results (3/3 plans) — completed 2026-07-05

Full phase details (goals, success criteria, requirements): `.planning/milestones/v1.0-ROADMAP.md`

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-07-04 |
| 2. Setup & Registration | v1.0 | 4/4 | Complete | 2026-07-04 |
| 3. Score Entry | v1.0 | 3/3 | Complete | 2026-07-05 |
| 4. Results | v1.0 | 3/3 | Complete | 2026-07-05 |

### Phase 5: PDF Export

**Goal:** As a Trainer/Kampfrichter, I want to export the tournament results as a PDF, so that I can archive, print, or manually share them after a tournament.
**Mode:** mvp
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06, PDF-07
**Depends on:** Phase 4
**Plans:** 1/2 plans executed

Plans:
- [x] 05-01-PLAN.md — Settings data layer (Dexie v4 `settings` table, image downscaling) + SettingsForm UI wired into Setup view
- [ ] 05-02-PLAN.md — jsPDF/jspdf-autotable install, pure PDF generation function, Results view export button + checkbox
