---
phase: 07-blank-scoresheet-pdf
reviewed: 2026-07-07T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/lib/utils/scoresheetExport.ts
  - src/lib/utils/scoresheetExport.test.ts
  - src/lib/views/SetupRounds.svelte
  - src/lib/i18n/strings.de.ts
  - e2e/scoresheetExport.spec.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-07-07
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The Phase 7 blank scoresheet PDF export implementation is fundamentally sound. The core functionality—generating a single-page A5 PDF with a configurable grid for score entry—is well-structured with proper separation of concerns (pure functions in `scoresheetExport.ts`, component integration in `SetupRounds.svelte`), comprehensive error handling, and solid test coverage including offline scenarios. No security vulnerabilities or critical logic errors were detected.

Two minor issues were found: one missing HTML constraint on a number input that conflicts with server-side validation logic, and one unvalidated text field that accepts arbitrary strings. Both are low-risk given the current architecture (trainer-controlled input, no user-facing output impact), but should be addressed for consistency and robustness.

## Warnings

### WR-01: Missing HTML5 max constraint on rounds input

**File:** `src/lib/views/SetupRounds.svelte:204-212`

**Issue:** The "Runden" (rounds count) number input lacks the `max="20"` HTML5 attribute, creating a mismatch between the visual UI hint and the JavaScript validation logic. The validation function `isValidResolvedConfig()` enforces `numberOfRounds <= 20` (line 101), but users can attempt to enter values up to `Number.MAX_SAFE_INTEGER` in the input field. While the validation will reject invalid saves, the lack of HTML5 constraint:
- Allows form submission attempts with out-of-range values
- Provides inconsistent UX compared to the adjacent "Passen pro Runde" (line 219: `max="30"`) and "Pfeile pro Passe" (line 232: `max="20"`) inputs
- Reduces first-line defense against accidental invalid input

**Fix:**
```html
<input
  type="number"
  min="1"
  max="20"
  step="1"
  bind:value={customRounds}
  ...
/>
```

---

## Info

### IN-01: Unvalidated custom distance text field

**File:** `src/lib/views/SetupRounds.svelte:240-248`

**Issue:** The custom distance field is a text input with no format validation. While the field is optional and trainer-controlled (not exposed to user input), it accepts arbitrary strings like "foo" or emoji characters. The distance value is stored as-is in `RoundConfig.distance` and used for display in:
- Scoresheet PDF header (rendered via jsPDF text)
- Results view summary line (line 254)
- Future certificate/results exports

**Impact:** Low. Since this is trainer-entered and only used for display, arbitrary strings don't cause data loss or crashes. However, if used for PDF header images or certificate positioning in future phases, untrusted distance strings could cause rendering issues.

**Suggestion:** Add optional validation (e.g., regex pattern `^\d+m$` for "18m", "25m" format) or document that distance is freeform text. Current behavior is acceptable if intentional.

---

## Structural Analysis

### Code Quality Observations

**Strengths:**

1. **Pure function design**: `buildScoresheetPdfDoc()` and `generateScoresheetPdf()` are side-effect-free and fully unit-testable, following the module's stated design principle (lines 5-11).

2. **Proper async/await chain**: Blob-to-DataURI conversion (`blobToDataUri()`) correctly wraps FileReader in a Promise with error handling; all async calls properly await.

3. **Grid layout algorithm**: The dynamic pass-per-row packing (lines 110–116) intelligently trades off horizontal cell width to fit the grid vertically on a single A5 page. The loop correctly respects bounds (`passesPerRow < totalPasses`) to avoid infinite loops.

4. **Input validation**: SetupRounds validates numeric fields before persisting (lines 97–109), guarding against NaN from emptied inputs—a known edge case documented inline (WR-03 comment, lines 93–95).

5. **Download mechanism**: Standard blob-to-file download pattern (lines 129–136) correctly manages URL lifecycle: create → append → click → cleanup → revoke. Matches established pattern in Results.svelte.

6. **Offline-first design**: No network calls; all PDF generation and settings access use IndexedDB. E2E test confirms offline operation (lines 30–45).

7. **Error isolation**: All user-facing operations (`handleScoresheetExport`) are wrapped in try-catch with generic fallback messaging to prevent silent failures.

**Consistency Notes:**

- Grid cell width calculation (`cellWidth = availableWidth / (passesPerRow * arrowsPerPasse)`) can result in cells narrower than the initial `minCellWidth = 6` guide when many passes are packed per row. This is a design trade-off (prefer single-page output over minimum cell width) and is not configurable. Unlikely to manifest in typical tournaments (10–20 passes) but could produce small cells in edge cases (30+ passes on A5).

- Custom distance field stores user strings directly without format hints or autocomplete. E.g., "Trainingsplatz 1" or "18" would both persist unchanged. This is flexible but unguided.

### Test Coverage

**Unit tests** (`scoresheetExport.test.ts`) cover:
- Filename generation with date formatting ✓
- PDF generation produces valid Blob with correct MIME type ✓
- Single-page output for small, medium, and large round configs ✓

**E2E tests** (`scoresheetExport.spec.ts`) cover:
- Download fires with correct filename format ✓
- Offline operation (zero network connectivity) ✓
- Custom configuration changes are respected ✓

**Gap:** PDF content validation (grid structure, label positions, cell dimensions) is not tested. Would require PDF parsing, which is complex for E2E. Current approach is pragmatic.

### Internationalization

New strings added to `strings.de.ts` (lines 224–227):
- `downloadButton: 'Schießformular (PDF) drucken'` — matches UI button (SetupRounds.svelte line 264)
- `exportError: 'Schießformular konnte nicht generiert werden'` — matches catch handler (line 138)

All references resolved correctly. German grammar and terminology verified against existing module conventions.

### Security

- **No injection vectors**: PDF content is generated via jsPDF drawing API (text, rect, image), not HTML templating or concatenation. User-supplied data (title, distance, logos) are passed as data, not code.
- **No XSS**: No `innerHTML`, `dangerouslySetInnerHTML`, or eval usage.
- **No credential leaks**: Logo Blobs are sourced from IndexedDB (trainer-uploaded images), not hardcoded or fetched from external URLs.
- **File download safety**: Temporary URL created, used, and revoked correctly; no persistent URLs or CSRF vector.

---

## Detailed Findings Reference

| ID | File | Line | Severity | Category | Description |
|---|---|---|---|---|---|
| WR-01 | SetupRounds.svelte | 204 | WARNING | HTML Constraint | Missing `max="20"` attribute |
| IN-01 | SetupRounds.svelte | 240 | INFO | Input Validation | Unvalidated text field |

---

_Reviewed: 2026-07-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
