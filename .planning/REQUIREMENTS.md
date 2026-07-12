# Requirements: Bogen-Trainingsturnier Verwaltung

**Defined:** 2026-07-12
**Core Value:** Score entry and results ranking must work correctly and offline, on one device, during a live tournament at the range — everything else is secondary.

## v1 Requirements

Requirements for the v1.3 DFBV Target Faces milestone. Each maps to roadmap phases.

### Target Faces

- [ ] **TARGET-01**: `db.rounds` (rounds/passes config) gains a `rings` field (`10 | 5`). Existing records without it are treated as `10` (no migration write required, just a read-time default).
- [ ] **TARGET-02**: Runden-und-Passen's top-level radio group is relabeled "Vorlagen/Benutzerdefiniert" (was: preset/custom label).
- [ ] **TARGET-03**: Runden-und-Passen's preset (Vorlagen) list is replaced with exactly three presets: "WA 10 Passen à 3 Pfeile" (rings=10), "DFBV 6 Runden à 5 Pfeile" (rings=5), "WA 70" (rings=10). Each preset carries its own fixed `rings` value — no separate Auflagen control shown in preset mode.
- [ ] **TARGET-04**: In Benutzerdefiniert mode, the free-text distance field is replaced with an explicit "Auflagen" radio choice of 10 or 5 (not free-text/user-definable).
- [ ] **TARGET-05**: The score-entry dialog (ScorePicker) shows the value/color set matching the active tournament's rings setting: 10-ring unchanged (X/10/9 yellow, 8/7 red, 6/5 blue, 4/3 black, 2/1 white, M grey); 5-ring is X/5 white, 4/3 blue, 2/1 blue, M grey.
- [ ] **TARGET-06**: Keyboard score entry (digits/X/M) continues to work correctly for both rings settings (e.g. digit "5" must resolve unambiguously in 5-ring mode).
- [ ] **TARGET-07**: The results-list PDF's score-column header reads "X/10/9" for 10-ring tournaments (unchanged) and "X/5" for 5-ring tournaments.
- [ ] **TARGET-08**: Score values already entered under one rings setting remain valid/displayed correctly if inspected later (no retroactive re-validation needed — rings is a per-tournament setting, not changed mid-tournament in practice, but must not crash if a stored value is inspected against the current config).

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Target Faces

- Mixed target faces within a single tournament (e.g. different classes shooting different rings) — deferred; v1.3 is a single per-tournament rings setting.
- Additional non-WA/non-DFBV target-face standards — deferred until requested.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User-definable/custom ring counts (e.g. 6-ring, 3-ring) | Explicitly ruled out by the user — Auflagen is a fixed 10/5 choice, not a free-text setting |
| Per-class or per-round rings override within one tournament | Not requested; rings is a single tournament-wide setting, consistent with the existing single-config model |
| Migrating/rewriting existing stored `db.rounds` records to add `rings` | Read-time default (missing → 10) is sufficient; no write-migration needed |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TARGET-01 | Phase 8: Rings Configuration | Pending |
| TARGET-02 | Phase 8: Rings Configuration | Pending |
| TARGET-03 | Phase 8: Rings Configuration | Pending |
| TARGET-04 | Phase 8: Rings Configuration | Pending |
| TARGET-05 | Phase 9: Rings-Aware Score Entry & PDF Output | Pending |
| TARGET-06 | Phase 9: Rings-Aware Score Entry & PDF Output | Pending |
| TARGET-07 | Phase 9: Rings-Aware Score Entry & PDF Output | Pending |
| TARGET-08 | Phase 9: Rings-Aware Score Entry & PDF Output | Pending |

**Coverage:**
- v1 requirements: 8 total
- Mapped to phases: 8 (Phase 8: TARGET-01..04, Phase 9: TARGET-05..08)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-12*
*Last updated: 2026-07-12 after roadmap creation (Phases 8-9)*
