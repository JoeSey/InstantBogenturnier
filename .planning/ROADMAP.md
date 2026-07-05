# Roadmap: Bogen-Trainingsturnier Verwaltung

## Overview

This roadmap delivers a client-only, installable PWA that takes a trainer/judge from an empty app to a fully ranked, offline-capable training tournament on one device. The journey follows the app's own natural tournament flow — Foundation (offline shell + visual system) → Setup & Registration (configure the tournament and its shooters) → Score Entry (the app's core value: live, loss-proof per-arrow scoring) → Results (correctly ranked, adaptive output) — with foundational offline/PWA infrastructure built first since research flagged it as cheap to get right early and expensive to retrofit later.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Installable offline PWA shell with the responsive, themeable glassmorphism visual system (completed 2026-07-04)
- [x] **Phase 2: Setup & Registration** - Trainer configures classes, lines, rounds/passes, presets, and registers shooters (completed 2026-07-04)
- [x] **Phase 3: Score Entry** - Trainer enters, saves, and finalizes per-arrow scores live, with zero data loss (completed 2026-07-05)
- [ ] **Phase 4: Results** - Trainer views correctly-ranked, per-class results adapted to any screen size

## Phase Details

### Phase 1: Foundation
**Goal**: The app installs on a device and runs fully offline, presenting a coherent, responsive, themeable visual shell that every later phase builds on.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. User can install the app to their device (home screen / desktop) and launch it with zero network connectivity.
  2. Trainer can reopen the installed app in airplane mode and see the full working app shell — no blank page, no broken/stale cached assets.
  3. App presents a glassmorphism-influenced design that adapts correctly across phone, tablet, and desktop widths.
  4. App automatically matches the system's light/dark preference and offers a manual override toggle that persists across restarts.
**Plans**: 2 plans
- [x] 01-01-PLAN.md — Walking skeleton: scaffold + offline PWA + persisted light/dark theme toggle (PLAT-01, PLAT-03)
- [x] 01-02-PLAN.md — Responsive glass nav shell + four placeholder sections + session-dismissible update banner (PLAT-02, PLAT-01)
**UI hint**: yes

### Phase 2: Setup & Registration
**Goal**: Trainer can fully configure a tournament — classes, shooting lines, rounds/passes, and a shooter roster — before any scoring begins, and can reuse past configurations via presets.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, REG-01, REG-02
**Success Criteria** (what must be TRUE):
  1. Trainer can define one or more classes as an age-group/bow-type/distance tuple (only one field required) with an app-suggested name (e.g. RCV-U14) they can override.
  2. Trainer can set the number of shooting lines and configure rounds/passes either from WA-style presets or a free custom configuration (arrows per end, ends per round, number of rounds, distance).
  3. Trainer can register shooters with name, class, and optional shooting-line assignment, and the app clearly indicates whether the tournament is running in mode AB or AB/CD, derived from shooter count vs. line count.
  4. Trainer can save the current tournament setup as one of 4-8 named presets and load a previously saved preset to quickly start a new tournament.
**Plans**: 4 plans
- [x] 02-01-PLAN.md — Dexie v2 schema + class definition (name suggestion, collision auto-suffix) (SETUP-01, SETUP-02)
- [x] 02-02-PLAN.md — Shooting-line count + rounds/passes configuration (WA presets or custom) (SETUP-03, SETUP-04)
- [x] 02-03-PLAN.md — Shooter registration with AB/AB-CD mode detection + auto-assignment preview (REG-01, REG-02)
- [x] 02-04-PLAN.md — Preset save/load/delete + export/import (SETUP-05, SETUP-06)

### Phase 3: Score Entry
**Goal**: As a trainer, I want to enter and save per-arrow scores live, without losing data, so that I can run the live tournament with confidence, even mid-entry disruptions.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: SCORE-01, SCORE-02, SCORE-03, SCORE-04, SCORE-05, SCORE-06, SCORE-07
**Success Criteria** (what must be TRUE):
  1. Trainer can enter per-arrow scores (0-10 or M) for each shooter per round/passe in a table showing line, name, class, per-arrow values, and sum, with "M" automatically counted as zero in the sum.
  2. Table is sortable by clicking any of the column headers (line, name, class, sum).
  3. Entries are saved as they are entered / interim-saved at any point, with no data loss if the device or tab closes mid-entry, and remain editable until finalized.
  4. App detects when all configured rounds/passes are fully entered and offers a distinct "Abschließen" (finalize) action separate from "Speichern" (save); once finalized, entries are locked and cannot be further edited.
**Plans**: 3 plans
- [x] 03-01-PLAN.md — Score entry vertical slice: tap-button autosave, table, round/passe nav (SCORE-01, SCORE-02, SCORE-03, SCORE-05)
- [x] 03-02-PLAN.md — Sortable column headers (SCORE-04)
- [x] 03-03-PLAN.md — Completion detection + finalize/permanent lock (SCORE-06, SCORE-07)

### Phase 4: Results
**Goal**: Trainer can view accurate, correctly-ranked results for each class immediately once scoring is complete, on any device at the range.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: RES-01, RES-02, RES-03, RES-04
**Success Criteria** (what must be TRUE):
  1. Trainer can view results ranked by total score descending, grouped per class.
  2. Tied scores share the same rank and the next rank is skipped (standard "1-2-2-4" competition ranking).
  3. On phone-sized screens, results are shown one class at a time via a dropdown selector; on tablet/desktop screens, results for multiple/all classes are shown in a single- or multi-column layout depending on screen width.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-07-04 |
| 2. Setup & Registration | 4/4 | Complete    | 2026-07-04 |
| 3. Score Entry | 3/3 | Complete    | 2026-07-05 |
| 4. Results | 0/TBD | Not started | - |
