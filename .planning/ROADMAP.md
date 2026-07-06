# Roadmap: Bogen-Trainingsturnier Verwaltung

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-07-06)
- ✅ **v1.1 PDF Export** — Phase 5 (shipped 2026-07-06)

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
<summary>✅ v1.1 PDF Export (Phase 5) — SHIPPED 2026-07-06</summary>

- [x] Phase 5: PDF Export (3/3 plans) — completed 2026-07-06

Full phase details (goals, success criteria, requirements): `.planning/milestones/v1.1-ROADMAP.md`

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|-----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-07-04 |
| 2. Setup & Registration | v1.0 | 4/4 | Complete | 2026-07-04 |
| 3. Score Entry | v1.0 | 3/3 | Complete | 2026-07-05 |
| 4. Results | v1.0 | 3/3 | Complete | 2026-07-05 |
| 5. PDF Export | v1.1 | 3/3 | Complete | 2026-07-06 |

### Phase 6: Certificates PDF Export

**Goal:** Generate downloadable PDF certificates (Urkunden) for shooters — a tournament-wide bulk export producing a ZIP of one PDF per shooter, and a per-row single-certificate export from the results table.
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08
**Depends on:** Phase 5
**Plans:** 1/5 plans executed

Plans:
- [x] 06-01-PLAN.md — Install JSZip, add certificateHeading Dexie v5 migration, add Phase 6 UI strings
- [ ] 06-02-PLAN.md — certificateExport.ts: buildCertPdf/generateSingleCertPdf/generateBulkCerts (TDD)
- [ ] 06-03-PLAN.md — SettingsForm.svelte: certificate heading field
- [ ] 06-04-PLAN.md — Results.svelte + ResultsTable.svelte: bulk + per-row certificate export UI
- [ ] 06-05-PLAN.md — E2E tests for bulk ZIP export and per-row single export
