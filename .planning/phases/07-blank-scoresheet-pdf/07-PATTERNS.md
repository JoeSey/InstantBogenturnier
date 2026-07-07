# Phase 7: Blank-Scoresheet-PDF - Pattern Map

**Mapped:** 2026-07-07
**Files analyzed:** 5 new/modified files
**Analogs found:** 2/5 with exact matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/utils/scoresheetExport.ts` | utility | file-I/O | `src/lib/utils/pdfExport.ts` | exact |
| `src/lib/views/SetupRounds.svelte` | component | request-response | `src/lib/views/Results.svelte` | role-match |
| `src/lib/i18n/strings.de.ts` | config | configuration | `src/lib/i18n/strings.de.ts` (existing) | exact |
| `src/lib/utils/__tests__/scoresheetExport.test.ts` | test | CRUD/transform | `src/lib/utils/pdfExport.test.ts` | exact |
| `e2e/scoresheetExport.spec.ts` | test (e2e) | request-response | `e2e/pdfExport.spec.ts` | exact |

## Pattern Assignments

### `src/lib/utils/scoresheetExport.ts` (utility, file-I/O)

**Analog:** `src/lib/utils/pdfExport.ts` (lines 1–172)

**Imports pattern** (lines 1–4):
```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RankedRow } from './ranking';
import type { ClassRecord, SettingsRecord } from '../db/schema';
```

**For scoresheet export, adapt to:**
```typescript
import { jsPDF } from 'jspdf';
import type { RoundConfig, SettingsRecord } from '../db/schema';
// No autoTable needed — scoresheet is a blank grid, not a data table
```

**Filename export pattern** (lines 10–12):
```typescript
export function resultsPdfFilename(date: Date = new Date()): string {
  return `Ergebnisse_${date.toISOString().split('T')[0]}.pdf`;
}
```

**Scoresheet analog:**
```typescript
export function scoresheetPdfFilename(date: Date = new Date()): string {
  return `Schießformular_${date.toISOString().split('T')[0]}.pdf`;
}
```

**blobToDataUri helper** (lines 23–30):
```typescript
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
```

**containFit helper (reuse from pdfExport)** (lines 38–49):
```typescript
export function containFit(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) {
    return { width: maxWidth, height: maxHeight };
  }
  const ratio = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}
```

**Core PDF builder pattern** (lines 53–162):
```typescript
export async function buildResultsPdfDoc(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined,
  includeIncomplete: boolean
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  // ... header with title/logos (lines 84–116)
  // ... loop through data, render table (lines 118–159)
  return doc;
}
```

**Scoresheet builder pattern (A5 portrait, grid-only):**
```typescript
export async function buildScoresheetPdfDoc(
  roundsConfig: RoundConfig,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  // Render header (title + logos) — reuse lines 84–116 pattern
  // Render blank grid (rounds × passes × arrows-per-passe cells)
  // Render blank handwriting fields (Name, Klasse, Schießplatz, Schreiber)
  // Render blank signature lines (Unterschrift Schütze, Unterschrift Schreiber)
  return doc;
}
```

**Generator function pattern** (lines 164–172):
```typescript
export async function generateResultsPdf(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined,
  includeIncomplete: boolean
): Promise<Blob> {
  const doc = await buildResultsPdfDoc(classifications, classes, settings, includeIncomplete);
  return doc.output('blob');
}
```

**Scoresheet generator:**
```typescript
export async function generateScoresheetPdf(
  roundsConfig: RoundConfig,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined
): Promise<Blob> {
  const doc = await buildScoresheetPdfDoc(roundsConfig, settings);
  return doc.output('blob');
}
```

---

### `src/lib/views/SetupRounds.svelte` (component, request-response)

**Analog:** `src/lib/views/Results.svelte` (lines 60–84, lines 239–248)

**Export handler pattern** (Results.svelte, lines 60–84):
```typescript
async function handleExport() {
  errorFeedback = '';
  try {
    // Fetch settings directly (not via liveQuery + $derived)
    const settings = (await db.settings.get(1)) ?? { id: 1 as const };
    const blob = await generateResultsPdf(rankings, classesWithResults, settings, includeIncomplete);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultsPdfFilename();
    // WR-04: append before clicking for WebKit/iOS compatibility
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    errorFeedback = strings.resultsPdf.exportError;
  }
}
```

**Scoresheet handler pattern:**
```typescript
async function handleScoresheetExport() {
  errorFeedback = '';
  try {
    const roundsConfig = existingConfig ?? (await db.rounds.get(1));
    if (!roundsConfig) {
      errorFeedback = 'Runden/Passen nicht konfiguriert';
      return;
    }
    const settings = (await db.settings.get(1)) ?? { id: 1 as const };
    const blob = await generateScoresheetPdf(roundsConfig, settings);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scoresheetPdfFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    errorFeedback = strings.scoresheetExport.exportError;
  }
}
```

**Button pattern** (Results.svelte, lines 239–248):
```svelte
<div class="flex flex-col gap-2 md:flex-row">
  <button
    type="button"
    onclick={handleExport}
    disabled={classesWithResults.length === 0}
    class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
  >
    <FileDown size={20} />
    {strings.resultsPdf.exportButton}
  </button>
</div>
```

**Scoresheet button pattern (add to SetupRounds.svelte):**
```svelte
<button
  type="button"
  onclick={handleScoresheetExport}
  disabled={!existingConfig}
  class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
>
  <FileDown size={20} />
  {strings.scoresheetExport.downloadButton}
</button>
```

**Location in SetupRounds.svelte:** Add button after the `resolvedConfig` summary line (around line 180–200, near the save button).

**Import statement needed:**
```typescript
import { FileDown } from '@lucide/svelte';
import { generateScoresheetPdf, scoresheetPdfFilename } from '../utils/scoresheetExport';
```

---

### `src/lib/i18n/strings.de.ts` (config, configuration)

**Analog:** `src/lib/i18n/strings.de.ts` (entire file, existing structure)

**Append new section** (after line 222, before final closing brace):
```typescript
  // Phase 7 Plan 01 section — blank scoresheet PDF export control and button
  // (SHEET-01 through SHEET-07). Appended per user copywriting specification.
  scoresheetExport: {
    downloadButton: 'Schießformular (PDF) drucken',
    exportError: 'Schießformular konnte nicht generiert werden',
  },
```

**Full string key structure pattern:**
```typescript
scoresheetExport: {
  downloadButton: 'Schießformular (PDF) drucken',
  exportError: 'Schießformular konnte nicht generiert werden',
}
```

Follows the same pattern as existing sections: lowercase property names, German user-facing text, error string with replaceable `{key}` placeholders where needed.

---

### `src/lib/utils/__tests__/scoresheetExport.test.ts` (test, CRUD/transform)

**Analog:** `src/lib/utils/pdfExport.test.ts` (entire file)

**Test file structure** (pdfExport.test.ts, lines 1–10):
```typescript
import { describe, expect, it } from 'vitest';
import {
  buildClassTableRows,
  buildResultsPdfDoc,
  containFit,
  generateResultsPdf,
  resultsPdfFilename,
} from './pdfExport';
import type { RankedRow } from './ranking';
import type { ClassRecord } from '../db/schema';
```

**Scoresheet test imports:**
```typescript
import { describe, expect, it } from 'vitest';
import {
  buildScoresheetPdfDoc,
  generateScoresheetPdf,
  scoresheetPdfFilename,
} from './scoresheetExport';
import type { RoundConfig, SettingsRecord } from '../db/schema';
```

**Filename test pattern** (pdfExport.test.ts, lines 24–28):
```typescript
describe('resultsPdfFilename', () => {
  it('formats a fixed date as Ergebnisse_YYYY-MM-DD.pdf', () => {
    expect(resultsPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Ergebnisse_2026-07-06.pdf');
  });
});
```

**Scoresheet filename test:**
```typescript
describe('scoresheetPdfFilename', () => {
  it('formats a fixed date as Schießformular_YYYY-MM-DD.pdf', () => {
    expect(scoresheetPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Schießformular_2026-07-06.pdf');
  });
});
```

**PDF generation test pattern** (pdfExport.test.ts, lines 57–87):
```typescript
describe('generateResultsPdf', () => {
  const classes: ClassRecord[] = [
    { id: 1, name: 'RCV-U14' },
    { id: 2, name: 'RCV-U18' },
  ];

  it('produces a Blob with type application/pdf and non-zero size', async () => {
    const blob = await generateResultsPdf(makeRankings(), classes, { id: 1 }, false);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('works with no settings (no title, no logos)', async () => {
    const blob = await generateResultsPdf(makeRankings(), classes, undefined, false);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});
```

**Scoresheet PDF generation test:**
```typescript
describe('generateScoresheetPdf', () => {
  const mockRoundsConfig: RoundConfig = {
    id: 1,
    numberOfRounds: 1,
    passesPerRound: 10,
    arrowsPerPasse: 3,
    distance: '18m',
  };

  it('produces a Blob with type application/pdf and non-zero size', async () => {
    const blob = await generateScoresheetPdf(mockRoundsConfig, undefined);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('produces a single-page A5 portrait document', async () => {
    const doc = await buildScoresheetPdfDoc(mockRoundsConfig, undefined);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('works with no settings (no title, no logos)', async () => {
    const blob = await generateScoresheetPdf(mockRoundsConfig, undefined);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('includes configured grid dimensions (rounds × passes × arrows)', async () => {
    const config: RoundConfig = {
      id: 1,
      numberOfRounds: 2,
      passesPerRound: 5,
      arrowsPerPasse: 4,
      distance: '25m',
    };
    const doc = await buildScoresheetPdfDoc(config, undefined);
    const output = doc.output();
    // Grid should fit within a single A5 page (210×148mm)
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });
});
```

**containFit reuse:** The `containFit` test already exists in pdfExport.test.ts; no duplication needed in scoresheetExport.test.ts (it's tested once where defined).

---

### `e2e/scoresheetExport.spec.ts` (test (e2e), request-response)

**Analog:** `e2e/pdfExport.spec.ts` (entire file)

**E2E test structure** (pdfExport.spec.ts, lines 1–85):
```typescript
import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build — mirrors pdfExport.spec.ts pattern.
// Each test gets a fresh browser context, so IndexedDB storage starts empty per test.

async function setUpTournamentWithConfig(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Add a class
  // 2. Set shooting lines
  // 3. Configure rounds/passes (via preset or custom)
  // 4. (No registration/scoring needed for blank scoresheet)
  // 5. Navigate to Einrichtung setup view
}

test.describe('Blank scoresheet PDF export (SHEET-01)', () => {
  test('clicking "Schießformular drucken" downloads a correctly-named PDF', async ({ page }) => {
    await setUpTournamentWithConfig(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('scoresheet export succeeds with zero network connectivity (offline)', async ({ page, context }) => {
    await setUpTournamentWithConfig(page);

    await context.setOffline(true);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);

    await context.setOffline(false);
  });

  test('scoresheet grid dimensions match the configured rounds/passes/arrows', async ({ page }) => {
    // Set up with custom config: 2 rounds × 5 passes × 4 arrows
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const roundsSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Runden und Passen' }),
    });
    await roundsSection.getByText('Benutzerdefiniert').click();
    await roundsSection.getByLabel('Runden').fill('2');
    await roundsSection.getByLabel('Passen pro Runde').fill('5');
    await roundsSection.getByLabel('Pfeile pro Passe').fill('4');
    await roundsSection.getByLabel('Pfeile pro Passe').blur();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
```

---

## Shared Patterns

### Header Rendering (Title + Logos)
**Source:** `src/lib/utils/pdfExport.ts` (lines 84–116)

**Apply to:** `src/lib/utils/scoresheetExport.ts` (`buildScoresheetPdfDoc` function)

Both the results PDF and blank scoresheet PDF reuse the same Settings title + logo infrastructure. Copy the header-rendering block verbatim from pdfExport.ts:
- `blobToDataUri()` helper (lines 23–30)
- `containFit()` logo-scaling helper (lines 38–49)
- Header rendering logic (lines 84–116)

### Image Handling (PNG Normalization)
**Source:** `src/lib/utils/imageDownscale.ts` (referenced in CLAUDE.md)

**Apply to:** `scoresheetExport.ts` if custom header images are used

Since Phase 5/6 already normalize all logo uploads to PNG at downscale time, scoresheet export receives `logoLeftBlob` and `logoRightBlob` as already-PNG Blob instances. No format-detection code needed; just use `doc.addImage(..., 'PNG', ...)` as pdfExport.ts does (line 90, 98).

### Download Trigger Pattern (DOM Append/Remove)
**Source:** `src/lib/views/Results.svelte` (lines 72–80)

**Apply to:** `src/lib/views/SetupRounds.svelte` `handleScoresheetExport()` function

The WR-04 workaround (append to DOM before click, remove after) is essential for iOS Safari compatibility. Replicate exactly:
```typescript
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
```

### Error Handling Pattern
**Source:** `src/lib/views/Results.svelte` (lines 60–84)

**Apply to:** `src/lib/views/SetupRounds.svelte` `handleScoresheetExport()`

```typescript
errorFeedback = '';
try {
  // ... operation
} catch {
  errorFeedback = strings.scoresheetExport.exportError;
}
```

---

## No Analog Found

None. All new files have exact analogs in the existing codebase:
- PDF generation follows pdfExport.ts / certificateExport.ts patterns (both utilities)
- UI integration follows Results.svelte pattern (component export buttons)
- i18n strings follow existing strings.de.ts structure
- Unit tests follow pdfExport.test.ts pattern (Vitest)
- E2E tests follow pdfExport.spec.ts pattern (Playwright)

---

## Metadata

**Analog search scope:** `src/lib/utils/`, `src/lib/views/`, `src/lib/i18n/`, `e2e/`

**Files scanned:** 15+

**Pattern extraction date:** 2026-07-07

**Key patterns identified:**
1. All PDF exports use jsPDF + a builder-generator split (testable `buildXxxPdfDoc()` + `generateXxxPdf()`)
2. Header infrastructure (title + logos) is reusable across all PDF exports via `blobToDataUri()` + `containFit()`
3. UI export buttons follow a uniform error-handling + download pattern with iOS Safari compatibility
4. i18n strings are namespace-scoped by feature (e.g., `scoresheetExport.downloadButton`)
5. Unit tests are pure function tests; e2e tests drive the full UI flow including offline mode
