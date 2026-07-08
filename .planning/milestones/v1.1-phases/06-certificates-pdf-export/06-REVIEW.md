---
phase: 06-certificates-pdf-export
reviewed: 2026-07-06T12:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - e2e/certificateBulkExport.spec.ts
  - e2e/certificateSingleExport.spec.ts
  - src/lib/components/ResultsTable.svelte
  - src/lib/components/ResultsTable.test.ts
  - src/lib/components/SettingsForm.svelte
  - src/lib/db/schema.test.ts
  - src/lib/db/schema.ts
  - src/lib/i18n/strings.de.ts
  - src/lib/utils/certificateExport.test.ts
  - src/lib/utils/certificateExport.ts
  - src/lib/views/Results.svelte
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-07-06
**Depth:** standard
**Files Reviewed:** 11
**Status:** Issues Found

## Summary

This phase implements per-shooter PDF certificate export (bulk ZIP and single PDF) as a logical extension of the Phase 5 PDF export infrastructure. The implementation is well-structured, reuses existing code patterns (pure functions, proper error handling), and is extensively tested with e2e verification. However, two issues were found: an incomplete test assertion for component headers and a misleading code pattern that could result in an empty fallback value under certain conditions. All issues are correctable and none pose security or data integrity risks.

## Warnings

### WR-01: Incomplete Column Header Test Coverage

**File:** `src/lib/components/ResultsTable.test.ts:21-28`

**Issue:** The test at line 21 is titled "renders all 4 column headers" but the `ResultsTable` component actually renders 5 column headers: Rang, Name, Schießplatz, Gesamt, and **Urkunde** (Certificate). The test only checks for the first 4 headers (lines 24-27) and completely omits the Certificate column header check.

Looking at `ResultsTable.svelte` lines 31-52, all 5 headers are clearly rendered:
1. `strings.results.columnRank` (Rang)
2. `strings.results.columnName` (Name)
3. `strings.results.columnLine` (Schießplatz)
4. `strings.results.columnTotal` (Gesamt)
5. `strings.results.columnCertificate` (Urkunde) — **not tested**

This creates a blind spot: if the Certificate column is ever accidentally removed or renamed, the test suite would not catch it.

**Fix:**
```typescript
it('renders all 5 column headers with the exact German copy', () => {
  render(ResultsTable, { props: { rows: [], oncertexport: () => {} } });

  expect(screen.getByText(strings.results.columnRank)).not.toBeNull();
  expect(screen.getByText(strings.results.columnName)).not.toBeNull();
  expect(screen.getByText(strings.results.columnLine)).not.toBeNull();
  expect(screen.getByText(strings.results.columnTotal)).not.toBeNull();
  expect(screen.getByText(strings.results.columnCertificate)).not.toBeNull(); // Add this line
});
```

---

### WR-02: Misleading Fallback Pattern for Class Name Lookup

**File:** `src/lib/views/Results.svelte:193`

**Issue:** The single certificate export callback uses a fallback that could result in an empty string:

```typescript
classesWithResults.find((c) => c.id === selectedClassId)?.name ?? ''
```

While the application's data model ensures this should not happen in practice (the row is rendered from the selected class, so the class must exist), this pattern is misleading because:

1. It suggests the lookup can fail and an empty class name is an acceptable fallback
2. If rendered in a certificate PDF, an empty class name creates a confusing user experience (the "Klasse:" line would read "Klasse: " with no value)
3. Future refactoring might break this assumption without being caught

The code should explicitly assert the invariant or add a defensive error check.

**Fix:**
```typescript
// Option A: Use non-null assertion (asserts the invariant is maintained)
const selectedClass = classesWithResults.find((c) => c.id === selectedClassId);
if (!selectedClass) {
  // This should never happen; if it does, log the bug
  console.error(`Class ${selectedClassId} not found in classesWithResults`);
  return;
}
handleSingleCertExport(row, selectedClass.name)

// Option B: Keep the fallback but make it explicit with a comment
const className = classesWithResults.find((c) => c.id === selectedClassId)?.name 
  ?? 'Unbekannte Klasse'; // Fallback in case of data model inconsistency
handleSingleCertExport(row, className)
```

---

## Info

### IN-01: Code Duplication in Download Handlers

**File:** `src/lib/views/Results.svelte:60-125`

**Issue:** Three download handler functions (`handleExport`, `handleBulkCertExport`, `handleSingleCertExport`) share a common pattern:
1. Fetch settings from database
2. Generate a blob
3. Create a temporary anchor element
4. Append to DOM, click, remove from DOM
5. Revoke the object URL

Lines 71–80, 93–100, and 114–121 contain nearly identical DOM manipulation sequences. This repetition makes the code harder to maintain and more prone to drift.

**Note:** The WR-04 comment (line 75–76) correctly identifies that the append-before-click pattern is necessary for WebKit/iOS Safari compatibility. A shared helper should preserve this requirement.

**Fix (optional):**
```typescript
async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  // WR-04: some WebKit/iOS Safari versions silently ignore .click() on an anchor
  // that was never attached to the DOM — append before clicking, then clean up.
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Then each handler becomes:
async function handleExport() {
  errorFeedback = '';
  try {
    const settings = (await db.settings.get(1)) ?? { id: 1 as const };
    const blob = await generateResultsPdf(rankings, classesWithResults, settings, includeIncomplete);
    await downloadBlob(blob, resultsPdfFilename());
  } catch {
    errorFeedback = strings.resultsPdf.exportError;
  }
}
```

---

## Detailed Findings

### Positive Observations

- **Error handling:** All async operations have try-catch blocks with user-facing feedback. QuotaExceededError is specifically handled in the settings form (line 126).
- **Type safety:** SettingsRecord fields used in PDF generation are properly typed with `Pick<>` to select only required fields.
- **Pure functions:** certificateExport.ts and ranking.ts functions are side-effect-free and reusable, as intended.
- **Blob handling:** FileReader usage in `blobToDataUri()` is correct with proper error delegation.
- **Database schema:** The v5 upgrade correctly adds `certificateHeading` with a safe default ('Urkunde') for pre-v5 records.
- **Test coverage:** E2E tests verify both bulk and single export, including offline functionality.
- **Logo scaling:** Reuse of `containFit()` from Phase 5 maintains consistent image aspect-ratio handling across result PDFs and certificates.

### TypeScript / Type Safety

- SettingsRecord interface correctly marks optional fields as optional (lines 78–83 in schema.ts)
- Pick types are used correctly in certificateExport.ts to limit settings exposure to required fields only
- RankedRow interface is consistently used across ranking.ts and certificateExport.ts

### Error Handling & Edge Cases

- **Offline capability verified:** E2e tests confirm bulk export works with `context.setOffline(true)`
- **Empty class fallback:** Covered above as WR-02
- **No top-N cutoff:** certificateExport.ts line 114 correctly includes all shooters per D-01 requirement
- **Blob realm compatibility:** Lines 96–103 in certificateExport.test.ts correctly work around jsdom Blob realm mismatch by using Uint8Array instead of passing Blob directly to JSZip

### Internationalization

- German strings are complete and consistent (strings.de.ts lines 216–222)
- All UI text (button labels, error messages, aria-labels) map to defined string keys
- No missing translations or hardcoded English text

### Security & Validation

- File input accept attribute restricts to PNG/JPEG (SettingsForm.svelte line 164)
- Image size enforcement: Pre-flight check (line 68) + post-downscaling check (line 78) to prevent oversized logo blobs
- PDF text rendering: jsPDF properly handles text content; no XSS risk from shooter names/class names
- No hardcoded API keys, credentials, or secrets in any file

---

_Reviewed: 2026-07-06_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
