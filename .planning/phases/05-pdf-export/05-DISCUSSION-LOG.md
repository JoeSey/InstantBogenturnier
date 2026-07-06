# Phase 5: PDF Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 5-pdf-export
**Areas discussed:** PDF structure & pagination, Header images & branding config, Trigger & filename, Content scope per class

---

## PDF structure & pagination

| Option | Description | Selected |
|--------|-------------|----------|
| Single PDF, all classes | One document, one section per class with a page break before each new class | ✓ |
| Separate PDF per class | One download per class | |

**User's choice:** Single PDF, all classes.
**Notes:** Simplest to hand out/archive as one file; maps onto jspdf-autotable's pagination.

---

## Header images & branding config

| Option | Description | Selected |
|--------|-------------|----------|
| Add a minimal Settings section now | Upload/store two images (Blob in Dexie) — delivers the full v1.5 header-image requirement in this phase | ✓ |
| Defer to certificates phase | Ship result-list PDF without logos now, add config later | |

**User's choice:** Add Settings now.
**Notes:** User first asked a feasibility question — whether Blob-in-Dexie storage for images is safe across platforms (iPadOS/iOS/Android/Desktop), given size constraints. Answered: feasible everywhere (logos are tens–hundreds of KB, far under any platform's IndexedDB quota); the only real risk is iOS Safari's documented ~7-day inactivity eviction (already known, see CLAUDE.md), mitigated by the existing `dexie-export-import` backup mechanism. Recommended downscaling images on upload (~500px width, ~200KB cap) for speed/safety. User then confirmed: add Settings now, with two images plus a free-text title line (e.g. "Trainingsturnier SV Musterbach 6.7.2026"), and also requested a checkbox to include/exclude incomplete results in the export (folded into the Content Scope area below).

---

## Trigger & filename

| Option | Description | Selected |
|--------|-------------|----------|
| Button on Results view + auto date filename | 'PDF exportieren' button on Results page; filename `Ergebnisse_2026-07-06.pdf` | ✓ |
| Button on Results view + title-derived filename | Same placement, filename derived from tournament title | |

**User's choice:** Auto date filename.
**Notes:** None.

---

## Content scope per class

| Option | Description | Selected |
|--------|-------------|----------|
| Rank, Name, Sum only — default: exclude incomplete | Slimmer columns; checkbox unchecked by default | ✓ |
| Same columns as ResultsTable (rank, name, line, sum) — default: exclude incomplete | Mirrors on-screen table | |

**User's choice:** Rank, Name, Sum only; incomplete-shooters checkbox defaults unchecked (excluded).
**Notes:** Checkbox request originated during the Header images discussion and was resolved here as part of content scope.

---

## Claude's Discretion

- Exact page-break/section-heading typography and `jspdf-autotable` table styling.
- Settings section layout/copy for header images and title line.
- Image upload UI mechanism (file picker vs. drag-drop) and downscale implementation approach.

## Deferred Ideas

- Per-shooter PDF certificates — split into new Phase 6 via SPIDR (Interfaces axis) during `/gsd-mvp-phase`.
- WhatsApp/automated certificate delivery — deferred to v2 (per PROJECT.md).
- Blank pre-printed scoresheets (DIN A5) — mentioned in original SPECS.md v1.5 scope, not yet scheduled as its own phase.
