# Phase 6: Certificates PDF Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-06
**Phase:** 6-certificates-pdf-export
**Areas discussed:** Recipients, Content, Output shape, Delivery, Trigger scope, Cert text, Filenames, Layout

---

## Recipients

| Option | Description | Selected |
|--------|-------------|----------|
| All shooters in a class | Every shooter with a result in the selected class gets a certificate, regardless of rank | ✓ |
| Top N per class (configurable) | Trainer picks a cutoff at export time | |
| Trainer selects individually | Checkbox list of shooters to include | |

**User's choice:** All shooters in a class
**Notes:** No threshold configuration needed for the bulk action; per-shooter selectivity is instead handled by the separate per-row action (see Trigger scope below).

---

## Content

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: name, class, rank, sum, title/logos | Reuses Phase 5 header exactly, no extra config | |
| Minimal + certificate-specific text | Same, plus a free-text line configurable in Settings | ✓ |

**User's choice:** Minimal + certificate-specific text
**Notes:** A results-list title isn't quite right wording for a personal certificate; a separate static heading field is needed.

---

## Output shape

| Option | Description | Selected |
|--------|-------------|----------|
| Single multi-page PDF (one certificate per page) | One download, simplest | |
| One PDF file per shooter (zipped or separate downloads) | Needed for individual sharing later | ✓ |

**User's choice:** One PDF file per shooter
**Notes:** Follow-up needed on zip vs separate downloads (see Delivery below).

---

## Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Zip into one download | Requires JSZip, avoids browser download-blocking for many files | ✓ |
| Separate browser downloads per shooter | No new library, but browsers throttle/block many rapid downloads | |

**User's choice:** Zip into one download

---

## Trigger scope

| Option | Description | Selected |
|--------|-------------|----------|
| Per-class "Urkunden erstellen" button | Generates certificates for one class at a time | |
| Per-shooter button in the results table | One action per row | |

**User's choice:** Mix of both, reshaped by the user
**Notes:** User rejected per-class scoping and instead specified: a tournament-wide "Urkunden erstellen" button that bundles ALL shooters (all classes) into one zip, PLUS a per-row button in the results table for generating/reprinting a single shooter's certificate (e.g. to quickly hand out just the top 3 without running the full batch).

---

## Cert text

| Option | Description | Selected |
|--------|-------------|----------|
| Static heading text, new Settings field | One free-text field, same for every certificate | ✓ |
| Templated sentence with placeholders | Settings field supports {name}/{rank}/{class} placeholders | |

**User's choice:** Static heading text, new Settings field

---

## Filenames

| Option | Description | Selected |
|--------|-------------|----------|
| Date-based, mirrors Phase 5 | `Urkunden_2026-07-06.zip` / `Urkunde_<ShooterName>_2026-07-06.pdf` | ✓ |
| Other convention | — | |

**User's choice:** Date-based, mirrors Phase 5

---

## Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Portrait A4, consistent with results PDF | Reuses existing jsPDF page setup/header code | ✓ |
| Landscape A4 | More traditional certificate look, needs new layout code | |

**User's choice:** Portrait A4, consistent with results PDF

---

## Claude's Discretion

- Exact certificate page layout/typography beyond the fixed header treatment.
- Placement of the "Urkunden erstellen" bulk button in the Results view.
- Zip library choice (JSZip assumed as default).
- Whether the Phase 5 include/exclude-incomplete-shooters toggle also applies to certificate generation.

## Deferred Ideas

- WhatsApp/automated delivery of certificates — deferred to v2 (per PROJECT.md).
- Templated certificate text with placeholders — user chose static heading instead; could revisit later.
