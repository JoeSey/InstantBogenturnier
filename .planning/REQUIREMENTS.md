# Requirements: Bogen-Trainingsturnier Verwaltung

**Defined:** 2026-07-03
**Core Value:** Score entry and results ranking must work correctly and offline, on one device, during a live tournament at the range — everything else is secondary.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Setup

- [ ] **SETUP-01**: Trainer can define classes as a tuple of age group / bow type / distance, with only one field required and the rest optional
- [ ] **SETUP-02**: App suggests a class name from the entered tuple (e.g. RCV-U14), which the trainer can override
- [ ] **SETUP-03**: Trainer can set the number of shooting lines for the tournament
- [ ] **SETUP-04**: Trainer can configure rounds/passes from WA-style presets (e.g. 1 round of 10 ends of 3 arrows at 18m) or define custom values (arrows per end, ends per round, number of rounds, distance)
- [ ] **SETUP-05**: Trainer can save the current tournament setup as a named preset (4-8 slots)
- [ ] **SETUP-06**: Trainer can load a previously saved preset to quickly start a new tournament

### Registration

- [ ] **REG-01**: Trainer can register shooters with name, class assignment, and optional shooting-line assignment
- [ ] **REG-02**: App indicates whether the tournament is running in mode AB or AB/CD, derived from shooter count vs. shooting-line count

### Score Entry

- [ ] **SCORE-01**: Trainer can enter per-arrow scores (0-10, M) for each shooter per round/passe in a table showing line, name, class, per-arrow values, and sum
- [ ] **SCORE-02**: "M" (miss) is automatically treated as zero in sum calculations
- [ ] **SCORE-03**: Score entries are saved as they're entered — no data loss if the device/tab closes mid-entry
- [ ] **SCORE-04**: Table is sortable by clicking column headers (line, name, class, sum)
- [ ] **SCORE-05**: Trainer can interim-save progress at any point; entries remain editable until finalized
- [ ] **SCORE-06**: App detects when all configured rounds/passes are fully entered and offers a distinct "Abschließen" (finalize) action, separate from "Speichern" (save)
- [ ] **SCORE-07**: Once finalized, score entries are locked and cannot be further edited

### Results

- [ ] **RES-01**: Trainer can view results ranked by total score descending, grouped per class
- [ ] **RES-02**: Tied scores share the same rank; the next rank is skipped (standard "1-2-2-4" competition ranking)
- [ ] **RES-03**: On phone-sized screens, results are shown one class at a time via a dropdown selector
- [ ] **RES-04**: On tablet/desktop screens, results for multiple/all classes are shown in a single- or multi-column layout depending on screen width

### Platform

- [ ] **PLAT-01**: App is installable as a PWA and fully functional with zero network connectivity
- [ ] **PLAT-02**: App uses a modern, glassmorphism-influenced design, responsive across phone/tablet/desktop
- [ ] **PLAT-03**: App automatically switches light/dark mode based on system preference, with a manual override toggle

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Export & Sharing

- **EXPORT-01**: Trainer can download a PDF results list, with two configurable header images (v1.5)
- **EXPORT-02**: Trainer can generate a PDF certificate ("Urkunde") for the top n (configurable, up to all) shooters (v1.5)
- **EXPORT-03**: Trainer can print blank scoresheets (DIN A5, two per DIN A4 sheet) matching the configured tournament mode, before the tournament starts (v1.5)
- **EXPORT-04**: Trainer can send generated PDF certificates to the top n shooters via WhatsApp (v2)

### Distribution

- **DIST-01**: App is packaged for open-source distribution to other archery clubs, with per-club configurable identity (v2.5)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Concurrent multi-device score entry | Confirmed usage pattern is single judge, single device — introduces sync complexity with no validated need |
| Long-term persistence of tournament results | Results don't need to survive after a tournament closes; only the 4-8 saved configuration presets persist |
| Official WA/DSB X-ring countback tie-breaks and shoot-offs | Explicitly simplified for informal training tournaments — shared-rank/skip-next is the intended, final convention |
| Athlete accounts, season history, handicaps, federation ranking-database integration | Out of scope for a session-scoped, informal training tool |
| Team/elimination brackets, QR-code check-in, peer-verification dual-signature scorecards | Solve problems this tool doesn't have; conflict with single-judge, single-session model |
| Open-source packaging (README, licensing, per-club onboarding) | Deferred to v2.5 — architecture avoids hardcoding club identity now so this isn't a rewrite later |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 2 | Pending |
| SETUP-02 | Phase 2 | Pending |
| SETUP-03 | Phase 2 | Pending |
| SETUP-04 | Phase 2 | Pending |
| SETUP-05 | Phase 2 | Pending |
| SETUP-06 | Phase 2 | Pending |
| REG-01 | Phase 2 | Pending |
| REG-02 | Phase 2 | Pending |
| SCORE-01 | Phase 3 | Pending |
| SCORE-02 | Phase 3 | Pending |
| SCORE-03 | Phase 3 | Pending |
| SCORE-04 | Phase 3 | Pending |
| SCORE-05 | Phase 3 | Pending |
| SCORE-06 | Phase 3 | Pending |
| SCORE-07 | Phase 3 | Pending |
| RES-01 | Phase 4 | Pending |
| RES-02 | Phase 4 | Pending |
| RES-03 | Phase 4 | Pending |
| RES-04 | Phase 4 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22/22 ✓
- Unmapped: 0

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 after roadmap creation*
