---
phase: 05-pdf-export
verified: 2026-07-06T14:13:00Z
status: gaps_found
score: 4/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Trainer can click 'PDF exportieren' on the Results view and a PDF file downloads to their device — working for PNG and no logos, but FAILING silently for JPEG-uploaded logos."
    status: failed
    reason: "CR-01: pdfExport.ts hardcodes image format as 'PNG' (lines 74, 77) regardless of actual data URI MIME type. When a user uploads a JPEG logo via SettingsForm.svelte (which accepts image/png,image/jpeg), the downscaleImageBlob utility correctly preserves JPEG encoding in the returned data URI (data:image/jpeg;base64,...). But buildResultsPdfDoc passes this JPEG-encoded URI to jsPDF.addImage(..., 'PNG', ...) which attempts to parse JPEG data as PNG, causing parse failure. The error is caught by the generic try/catch in Results.svelte:70, surfacing only 'Speichern fehlgeschlagen' (generic error) with no indication that the JPEG logo is the cause. This code path is completely untested — pdfExport.test.ts only exercises the no-logo case (line 117)."
    artifacts:
      - path: "src/lib/utils/pdfExport.ts"
        issue: "Lines 74 and 77 hardcode format='PNG' when calling doc.addImage(). Should derive format from data URI MIME type: formatFromDataUri(dataUri) => dataUri.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'"
    missing:
      - "Unit test in pdfExport.test.ts covering JPEG-encoded logo blobs passed to generateResultsPdf()"
      - "Fix function formatFromDataUri() to detect JPEG vs PNG from data URI"
      - "Apply format detection to both logoLeftData and logoRightData rendering"
---

# Phase 5: PDF Export Verification Report

**Phase Goal:** As a Trainer/Kampfrichter, I want to export the tournament results as a PDF, so that I can archive, print, or manually share them after a tournament.

**Verified:** 2026-07-06T14:13:00Z
**Status:** gaps_found
**Mode:** MVP (user story verification)

## User Story Outcome Verification

**User Story:** "As a Trainer/Kampfrichter, I want to export the tournament results as a PDF, so that I can archive, print, or manually share them after a tournament."

**Outcome to verify:** Trainer can archive, print, or manually share tournament results as a PDF after a tournament.

| Step | Expected Behavior | Codebase Evidence | Status |
|------|-------------------|-------------------|--------|
| 1. Tournament completed | Trainer navigates to Results view | `src/lib/views/Results.svelte` renders the Ergebnisse page with results grid | ✓ |
| 2. Click export button | "PDF exportieren" button is visible and clickable | Button renders at line 168-176; `onclick={handleExport}` wired | ✓ |
| 3. PDF downloads | Browser initiates download with ISO-date filename | `handleExport()` creates blob, URL, anchor element, triggers click, revokes URL (lines 59-72) | ✓ CONDITIONAL |
| 4. PDF is valid and printable | Downloaded file is valid PDF, renders without corruption | `generateResultsPdf()` uses jsPDF + jspdf-autotable, confirmed by E2E test passing | ✓ FOR PNG LOGOS ONLY |
| 5. Share or archive | File can be sent, stored, printed | E2E confirms download succeeds offline; PDF format is universal | ✓ FOR PNG LOGOS ONLY |

**User Story Outcome Status:** PARTIALLY ACHIEVED — Works for PNG and no logos, but **FAILS SILENTLY for JPEG logos**, which the UI explicitly accepts.

## Goal Achievement Summary

**Phase Goal:** Export tournament results as PDF ✓ (achievable for PNG logos and no logos)
**Feature Scope:** Settings table + PDF export ✓ (both present)
**Offline Operation:** ✓ (verified via E2E offline test)
**User Flow Completeness:** ✗ (JPEG logos break the flow)

## Observable Truths

### Plan 01: Settings Data Layer

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer can enter free-text tournament title + upload two PNG/JPEG header logo images that persist across page reloads | ✓ VERIFIED | `SettingsForm.svelte` renders title input (line 90), two file inputs accepting image/png,image/jpeg (line 102), preview imgs (lines 107, 120); `liveQuery(() => db.settings.get(1))` + `$derived` pattern loads persisted record; E2E test confirms reload persistence |
| 2 | Uploaded images are downscaled client-side to ~500px width, ~200KB cap | ✓ VERIFIED | `downscaleImageBlob(file, maxWidth=500, maxHeight=500, quality=0.85)` in `imageDownscale.ts`; returns `{ blob, dataUri }`; Canvas `drawImage` scales proportionally; `canvas.toBlob()` encodes at 0.85 quality; unit tests confirm size cap (test line 72: `expect(blob.size).toBeLessThanOrEqual(200*1024)`) |
| 3 | Settings survive preset export/delete/import round trip | ✓ VERIFIED | E2E test `settingsUpload.spec.ts` line 54-85 exercises full round trip: save settings → export preset → delete → import → verify settings still present |

**Plan 01 Score:** 3/3 ✓

### Plan 02: PDF Export Vertical Slice

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Trainer can click "PDF exportieren" and a PDF downloads | ✗ FAILED (for JPEG) ✓ (for PNG/none) | Button wired and E2E confirms download for PNG case, but **CR-01: hardcoded PNG format breaks JPEG logos** (see gaps section) |
| 2 | PDF has one section per class, page breaks between, with Rank/Name/Gesamt columns only | ✓ VERIFIED | `buildResultsPdfDoc()` loops classes in alphabetical order (line 44-46), calls `doc.addPage()` before each except first (line 55), calls `autoTable()` with `head: [['Rang', 'Name', 'Gesamt']]` and `body: buildClassTableRows()` (line 88-96); unit test confirms 3 classes → 3 pages (test line 98) |
| 3 | Unchecked checkbox excludes incomplete shooters; checked includes them | ✓ VERIFIED | `let includeIncomplete = $state(false)` (Results.svelte line 57); checkbox at line 152-166 binds to this; `buildClassTableRows(rows, includeIncomplete)` filters by `row.isComplete` (pdfExport.ts line 19); unit test confirms filtering (pdfExport.test.ts line 30-41) |
| 4 | Filename is `Ergebnisse_YYYY-MM-DD.pdf` with ISO date | ✓ VERIFIED | `resultsPdfFilename(date)` returns `` `Ergebnisse_${date.toISOString().split('T')[0]}.pdf` `` (line 11); unit test confirms (line 20: `expect(resultsPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Ergebnisse_2026-07-06.pdf')`) |
| 5 | PDF generation makes zero network requests (fully offline) | ✓ VERIFIED | E2E test `pdfExport.spec.ts` line 72-84 sets `context.setOffline(true)` before export and confirms download succeeds; jsPDF + jspdf-autotable have no external network calls per RESEARCH.md package audit |

**Plan 02 Score:** 4/5 ✓ (1 FAILED for JPEG case)

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | SettingsRecord interface + settings table in Dexie v4 | ✓ VERIFIED | Lines 77-82 define SettingsRecord; line 92 declares `settings` table; line 125 adds to v4 schema |
| `src/lib/utils/imageDownscale.ts` | downscaleImageBlob() utility | ✓ VERIFIED | Lines 15-72 implement Canvas-based resize with MIME type preservation; exported at line 15 |
| `src/lib/components/SettingsForm.svelte` | Title input + two logo uploads, wired to db.settings | ✓ VERIFIED | Lines 90-95 title input; lines 100-108 left logo input + preview; lines 113-121 right logo input + preview; save handler (lines 65-80) calls `db.settings.put()` |
| `src/lib/views/Setup.svelte` | SettingsForm nested into right-hand column | ✓ VERIFIED (not reviewed, assumed correct from E2E pass) | E2E test confirms Settings section renders and is functional |
| `src/lib/utils/pdfExport.ts` | generateResultsPdf() + buildResultsPdfDoc() + buildClassTableRows() + resultsPdfFilename() | ✗ PARTIALLY VERIFIED | All functions exist and are wired correctly EXCEPT lines 74, 77 hardcode PNG format regardless of actual logo MIME type |
| `src/lib/views/Results.svelte` | PDF export button + include-incomplete checkbox | ✓ VERIFIED | Lines 54-72 implement handleExport(); lines 151-177 render checkbox and button in GlassCard |

## Key Links Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `SettingsForm.svelte` | `db.settings` | `liveQuery(() => db.settings.get(1))` + `db.settings.put()` | ✓ WIRED | Line 10 loads record, lines 68-73 save record |
| `SettingsForm.svelte` | `imageDownscale.ts` | `downscaleImageBlob(file)` on file input change | ✓ WIRED | Line 4 imports, line 52 calls on `handleLogoChange()` |
| `Results.svelte` | `pdfExport.ts` | `generateResultsPdf(rankings, classesWithResults, settings, includeIncomplete)` | ✓ WIRED | Line 7 imports, line 62 calls in `handleExport()` |
| `Results.svelte` | `db.settings` | `liveQuery(() => db.settings.get(1))` | ✓ WIRED | Line 54-55 loads settings via liveQuery, passed to generateResultsPdf |
| `pdfExport.ts` | `jspdf` / `jspdf-autotable` | `new jsPDF()`, `autoTable(doc, {...})` | ✓ WIRED | Lines 1-2 import, line 40 instantiate jsPDF, line 88 call autoTable |
| `pdfExport.ts` | Logo data URI rendering | `doc.addImage(logoLeftData, 'PNG', ...)` | ✗ BROKEN FOR JPEG | Lines 74, 77 hardcode format; should detect from data URI |

## Data-Flow Trace (Level 4)

| Component | Data Variable | Source | Data Flows | Status | Issue |
|-----------|---------------|--------|-----------|--------|-------|
| SettingsForm | `logoLeftBlob` | File input → downscaleImageBlob() → result.blob | Yes, real Blob from Canvas | ✓ FLOWING | — |
| SettingsForm | `logoLeftPreview` | downscaleImageBlob() → result.dataUri | Yes, real data URI | ✓ FLOWING | — |
| Results | `settings` | `liveQuery(() => db.settings.get(1))` | Yes, real record from Dexie | ✓ FLOWING | — |
| pdfExport | `logoLeftData` | settings?.logoLeftBlob → blobToDataUri() → FileReader.readAsDataURL | Yes, real JPEG or PNG data URI | ✓ FLOWING | **CR-01: Format hardcoded, not detected** |
| pdfExport | PDF output | jsPDF instance → doc.output('blob') | Yes, real PDF Blob | ✓ FLOWING | **CR-01: Corrupted for JPEG input** |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| PDF export works with PNG logos | `npm run test:e2e -- e2e/pdfExport.spec.ts` | Both tests pass (filename format + offline) | ✓ PASS |
| Settings upload persists | `npm run test:e2e -- e2e/settingsUpload.spec.ts` | Pass (upload → save → reload → import round trip) | ✓ PASS |
| Unit tests for PDF generation | `npm run test -- src/lib/utils/pdfExport.test.ts` | 8/8 tests pass | ✓ PASS |
| Unit tests for image downscale | `npm run test -- src/lib/utils/imageDownscale.test.ts` | 3/3 tests pass | ✓ PASS |

## Probe Execution

No explicit probes defined in PLAN frontmatter. E2E tests serve as acceptance probes per Task verification sections.

## Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| PDF-01 | 02 | Generate single PDF with all classes, one section per class, page breaks between sections | ✓ VERIFIED | `buildResultsPdfDoc()` implements per-class sections with `doc.addPage()` call before each class except first |
| PDF-02 | 01 | Store two configurable header images (left/right) and free-text title in Settings table | ✓ VERIFIED | `SettingsRecord` has `logoLeftBlob`, `logoRightBlob`, `title`; Dexie table stores and retrieves these fields |
| PDF-03 | 01 | Downscale uploaded images to ~500px width before storage | ✓ VERIFIED | `downscaleImageBlob(file, maxWidth=500, maxHeight=500, 0.85)` in imageDownscale.ts; unit tests confirm aspect ratio preserved |
| PDF-04 | 02 | PDF table: Rank, Name, Sum columns only per class | ✓ VERIFIED | `buildClassTableRows()` maps to exactly 3 columns; autoTable renders with `head: [['Rang', 'Name', 'Gesamt']]` |
| PDF-05 | 02 | Include/exclude incomplete shooters via checkbox | ✓ VERIFIED | `buildClassTableRows(rows, includeIncomplete)` filters by `isComplete` flag; checkbox on Results view binds to state |
| PDF-06 | 02 | Full offline operation (no network calls during PDF generation) | ✓ VERIFIED | E2E test with `context.setOffline(true)` confirms export succeeds; jsPDF + jspdf-autotable bundle all dependencies |
| PDF-07 | 02 | Filename: `Ergebnisse_YYYY-MM-DD.pdf` | ✓ VERIFIED | `resultsPdfFilename()` returns ISO date format; E2E filename regex confirms |

**Coverage:** 6/7 requirements VERIFIED, 1 PARTIALLY FAILED

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact | Remediation |
|------|------|---------|----------|--------|-------------|
| `src/lib/utils/pdfExport.ts` | 74, 77 | Hard-coded `'PNG'` format in `doc.addImage()` calls | 🛑 CRITICAL | JPEG logos cause silent PDF generation failure | Implement format detection from data URI MIME type; add unit test with JPEG Blob |
| `src/lib/components/SettingsForm.svelte` | 44-49 | Pre-flight size check only, no post-downscale cap | ⚠️ WARNING | Downscaled blob could exceed 200KB cap if low-compression image | Add size check after downscaleImageBlob resolves; reject if still over cap |
| `src/lib/utils/imageDownscale.ts` | 21-23, component 100-118 | File input `accept="image/png,image/jpeg"` but validation accepts any `image/*` | ℹ️ INFO | SVG/WebP uploads silently re-encode to PNG/JPEG, diverging from UI copy | Tighten validation to `['image/png', 'image/jpeg'].includes(file.type)` |
| `src/lib/utils/imageDownscale.ts` | 36-39 | No guard for zero-sized images (width/height = 0) | ℹ️ INFO | Malformed images that decode with 0 dimensions cause NaN ratio | Guard: `if (!img.width \|\| !img.height) reject(new Error(...))` |
| `src/lib/components/SettingsForm.svelte` | 30-31 | Object URLs created but never revoked | ⚠️ WARNING | Resource leak accumulating over session as old previews are replaced | Track object URL; revoke before creating new one; revoke on component teardown |
| `src/lib/views/Results.svelte` | 63-68 | Anchor element created but not appended to DOM before click | ⚠️ WARNING (Safari) | Some WebKit/iOS Safari versions silently fail on non-DOM-appended anchors | Append anchor to `document.body` before click, remove afterward |
| `e2e/settingsUpload.spec.ts` | 38-42 | Fixed 300ms `waitForTimeout()` instead of confirming write | ⚠️ WARNING | Classic CI flakiness source — write may take >300ms under load | Wait for observable UI signal (e.g. toHaveValue) or confirm data persisted |

## Human Verification Required

### 1. JPEG Logo Export Behavior (CAN'T AUTOMATE — CONFIRMS CR-01)

**Test:** Upload a real JPEG logo image (not PNG) via Settings form, then click "PDF exportieren"
**Expected:** PDF downloads successfully and renders the logo image
**Why human:** Need to verify actual jsPDF behavior with real JPEG data; programmatic unit test with mocked Canvas can't fully simulate browser/jsPDF interaction
**Current state:** Code path is untested; expected to fail based on CR-01 analysis

### 2. PDF Visual Quality (CAN'T AUTOMATE)

**Test:** Open the downloaded PDF in a PDF viewer (Preview/Adobe/browser) and visually inspect
**Expected:** 
- Clean, readable table with Rank/Name/Gesamt columns
- Section headings per class
- Logo images (if configured) render without distortion
- No page-break artifacts or text corruption

**Why human:** Visual rendering quality, logo aspect ratio correctness, and PDF formatting correctness require human inspection

### 3. Safari/iOS Download Behavior (CAN'T AUTOMATE WITHOUT DEVICE)

**Test:** Download PDF on Safari/iOS and verify file arrives in Files app / Downloads
**Expected:** Download completes and file is accessible for sharing
**Why human:** iOS WebKit browser behavior differs from Chromium; Playwright can't test iOS behavior
**Current risk:** WR-04 notes that anchor download without DOM append may fail on Safari

## Gaps Summary

### Critical Blocker: CR-01 — JPEG Logo Format Not Detected

**Root cause:** `pdfExport.ts` lines 74 and 77 hard-code format as `'PNG'` when calling `jsPDF.addImage()`, but the logo data URI may be JPEG if a user uploaded a JPEG image in the Settings form.

**Why it's a blocker:**
1. The feature explicitly accepts `image/jpeg` uploads (SettingsForm.svelte line 102)
2. The image downscaling utility correctly preserves JPEG encoding (imageDownscale.ts line 51)
3. But PDF export breaks for any JPEG logo, silently failing with generic error message
4. No test coverage catches this (pdfExport.test.ts only tests no-logo case)
5. Users won't know why their PDF export failed

**Fix:**
```typescript
function formatFromDataUri(dataUri: string): 'PNG' | 'JPEG' {
  return dataUri.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
}

// In buildResultsPdfDoc, replace lines 74 and 77:
if (logoLeftData) {
  doc.addImage(logoLeftData, formatFromDataUri(logoLeftData), 20, imageY, 25, 20);
}
if (logoRightData) {
  const format = formatFromDataUri(logoRightData);
  doc.addImage(logoRightData, format, doc.internal.pageSize.getWidth() - 50, imageY, 25, 20);
}
```

**Test to add:**
```typescript
it('renders JPEG-encoded logo blobs without throwing', async () => {
  const jpegDataUri = 'data:image/jpeg;base64,/9j/...'; // Real JPEG bytes
  const jpegBlob = await (await fetch('data:image/jpeg;base64,...')).blob();
  
  const doc = await buildResultsPdfDoc(
    makeRankings(),
    classes,
    { id: 1, title: 'Test', logoLeftBlob: jpegBlob },
    false
  );
  
  expect(doc.getNumberOfPages()).toBe(2);
  expect(() => doc.output('blob')).not.toThrow();
});
```

---

## Summary

**Must-haves verified:** 4 out of 5 (80%)
**Critical blockers:** 1 (CR-01 — JPEG logo format)
**Warnings:** 6 (post-downscale size cap, logo aspect ratio, object URL leaks, Safari download, flaky timeout, image type validation)
**Info items:** 2 (zero-dimension images, file type acceptance mismatch)

**Status determination:**
- All observable truths verified EXCEPT for JPEG logo path
- All artifacts present and substantive
- All key links wired correctly
- JPEG logo path breaks silently (CR-01) — this is a **BLOCKER**
- User story outcome "can archive, print, or manually share PDF" is **INCOMPLETE** for JPEG logos

**Recommendation:** This phase goal is NOT fully achieved. The CR-01 critical issue must be fixed before the phase can be considered verified. The fix is straightforward (format detection from data URI), but must be accompanied by a unit test covering JPEG blobs.

---

_Verified: 2026-07-06T14:13:00Z_
_Verifier: Claude (gsd-verifier)_
_Depth: goal-backward_
