# Phase 6: Certificates PDF Export - Pattern Map

**Mapped:** 2026-07-06
**Files analyzed:** 9 new/modified files
**Analogs found:** 5 / 5 (100% coverage)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/utils/certificateExport.ts` | utility/service | file-I/O | `src/lib/utils/pdfExport.ts` | exact |
| `src/lib/utils/certificateExport.test.ts` | test | N/A | `src/lib/utils/pdfExport.test.ts` | exact |
| `e2e/certificateBulkExport.spec.ts` | test | N/A | `e2e/pdfExport.spec.ts` | exact |
| `e2e/certificateSingleExport.spec.ts` | test | N/A | `e2e/pdfExport.spec.ts` | exact |
| `src/lib/views/Results.svelte` | component/view | request-response | `src/lib/views/Results.svelte` (in-place modification) | self |
| `src/lib/components/SettingsForm.svelte` | component | CRUD | `src/lib/components/SettingsForm.svelte` (in-place modification) | self |
| `src/lib/db/schema.ts` | config/model | CRUD | `src/lib/db/schema.ts` (in-place v5 migration) | self |
| `src/lib/db/schema.test.ts` | test | N/A | `src/lib/db/schema.test.ts` (add v5 test block) | self |
| `src/lib/i18n/strings.de.ts` | config | N/A | `src/lib/i18n/strings.de.ts` (in-place extension) | self |

---

## Pattern Assignments

### `src/lib/utils/certificateExport.ts` (utility/service, file-I/O)

**Analog:** `src/lib/utils/pdfExport.ts` (Phase 5, lines 1–173)

**Imports pattern** (lines 1–4 of pdfExport.ts):
```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RankedRow } from './ranking';
import type { ClassRecord, SettingsRecord } from '../db/schema';
```

**Core comment pattern** (lines 6–8 of pdfExport.ts):
```typescript
// Pure PDF generation (PDF-01/04/05/07, 05-RESEARCH.md Pattern 1): framework-free,
// no side effects, no Svelte dependency — mirrors ranking.ts's pure-function style so
// it stays reusable (Phase 6 certificates, a future v2 endpoint) without rewriting.
```

**Filename function pattern** (lines 10–12 of pdfExport.ts):
```typescript
export function resultsPdfFilename(date: Date = new Date()): string {
  return `Ergebnisse_${date.toISOString().split('T')[0]}.pdf`;
}
```
Adapt for Phase 6: replace `Ergebnisse` with `Urkunde_<ShooterName>` for single and `Urkunden` for bulk per D-08.

**Helper function exports** (lines 23–49 of pdfExport.ts):
```typescript
function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

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
**Reuse verbatim** `blobToDataUri()` and `containFit()` from pdfExport.ts — they are data flow identical (Blob→DataURI, aspect-ratio scaling for logos).

**Build function pattern** (lines 53–162 of pdfExport.ts):
```typescript
export async function buildResultsPdfDoc(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined,
  includeIncomplete: boolean
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Header rendering (lines 84–116): logos + title
  // Class/table rendering (lines 120–159)
  
  return doc;
}

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
Adapt for Phase 6:
- `buildCertPdf(rankedRow, className, settings): Promise<jsPDF>` — single certificate (per-shooter data instead of full rankings)
- `generateSingleCertPdf(...): Promise<Blob>` — wraps buildCertPdf → blob
- `generateBulkCerts(classifications, classes, settings): Promise<Blob>` — loops over shooters, calls generateSingleCertPdf per shooter, collects into JSZip

**Header rendering pattern** (lines 84–116 of pdfExport.ts) — reuse exactly:
```typescript
const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;

const LOGO_MAX_WIDTH = 25;
const LOGO_MAX_HEIGHT = 20;
let cursorY = 20;

if (settings?.title || logoLeftData || logoRightData) {
  let tallestLogoHeight = 0;

  if (logoLeftData) {
    const { width: natWidth, height: natHeight } = doc.getImageProperties(logoLeftData);
    const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    doc.addImage(logoLeftData, 'PNG', 20, cursorY, width, height);
    tallestLogoHeight = Math.max(tallestLogoHeight, height);
  }
  if (logoRightData) {
    const { width: natWidth, height: natHeight } = doc.getImageProperties(logoRightData);
    const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    doc.addImage(logoRightData, 'PNG', doc.internal.pageSize.getWidth() - 20 - width, cursorY, width, height);
    tallestLogoHeight = Math.max(tallestLogoHeight, height);
  }

  if (settings?.title) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.title, doc.internal.pageSize.getWidth() / 2, cursorY + tallestLogoHeight / 2 + 3, {
      align: 'center',
    });
  }

  cursorY += Math.max(tallestLogoHeight, settings?.title ? 12 : 0) + 10;
}
```

**JSZip integration pattern** (from 06-RESEARCH.md Example 2):
```typescript
import JSZip from 'jszip';

export async function generateBulkCerts(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: SettingsRecord | undefined
): Promise<Blob> {
  const zip = new JSZip();
  
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  for (const cls of classesWithResults) {
    const rows = classifications.get(cls.id!) ?? [];
    for (const row of rows) {
      const certBlob = await generateSingleCertPdf(row, cls.name, settings);
      const filename = certificatePdfFilename(row.name);
      zip.file(filename, certBlob);
    }
  }
  
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
```

---

### `src/lib/utils/certificateExport.test.ts` (test)

**Analog:** `src/lib/utils/pdfExport.test.ts` (lines 1–170)

**Test structure pattern** (lines 1–10 of pdfExport.test.ts):
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
Adapt imports for Phase 6: replace pdfExport imports with certificateExport imports.

**Test data helper pattern** (lines 12–22 of pdfExport.test.ts):
```typescript
function makeRow(overrides: Partial<RankedRow>): RankedRow {
  return {
    shooterId: 1,
    name: 'Test Schütze',
    line: null,
    sum: 100,
    rank: 1,
    isComplete: true,
    ...overrides,
  };
}
```
Reuse verbatim for Phase 6 tests.

**Filename test pattern** (lines 24–28 of pdfExport.test.ts):
```typescript
describe('resultsPdfFilename', () => {
  it('formats a fixed date as Ergebnisse_YYYY-MM-DD.pdf', () => {
    expect(resultsPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Ergebnisse_2026-07-06.pdf');
  });
});
```
Adapt for Phase 6: test `certificatePdfFilename(shooterName, date)` returns `Urkunde_<shooterName>_YYYY-MM-DD.pdf`.

**Page count assertion pattern** (lines 82–147 of pdfExport.test.ts):
```typescript
const doc = await buildResultsPdfDoc(rankings, threeClasses, { id: 1 }, true);
expect(doc.getNumberOfPages()).toBe(1);
```
Adapt for Phase 6: assert `buildCertPdf()` produces a single-page document (certificates are always 1 page each).

**Containfit test pattern** (lines 150–169 of pdfExport.test.ts):
```typescript
describe('containFit', () => {
  it('scales a wider-than-tall image down to fit the max box without distortion', () => {
    expect(containFit(100, 50, 25, 20)).toEqual({ width: 25, height: 12.5 });
  });
  // ... more aspect-ratio tests
});
```
Reuse verbatim — `containFit()` function is unchanged from Phase 5.

---

### `e2e/certificateBulkExport.spec.ts` (test)

**Analog:** `e2e/pdfExport.spec.ts` (lines 1–85)

**Test setup helper** (lines 12–59 of pdfExport.spec.ts):
```typescript
async function setUpTournamentWithResults(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  
  // 1. Add class
  // 2. Set shooting lines
  // 3. Configure rounds
  // 4. Register shooter
  // 5. Enter score
  // 6. Navigate to Results
}
```
Reuse the entire helper verbatim — same setup path applies to both PDF export (Phase 5) and certificate export (Phase 6).

**Download test pattern** (lines 62–70 of pdfExport.spec.ts):
```typescript
test('clicking "PDF exportieren" downloads a correctly-named PDF file', async ({ page }) => {
  await setUpTournamentWithResults(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF exportieren' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Ergebnisse_\d{4}-\d{2}-\d{2}\.pdf$/);
});
```
Adapt for Phase 6: replace button name with `'Urkunden erstellen'`, filename regex with `/^Urkunden_\d{4}-\d{2}-\d{2}\.zip$/` (ZIP extension for bulk action).

**Offline test pattern** (lines 72–84 of pdfExport.spec.ts):
```typescript
test('PDF export succeeds with zero network connectivity (offline)', async ({ page, context }) => {
  await setUpTournamentWithResults(page);

  await context.setOffline(true);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF exportieren' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Ergebnisse_\d{4}-\d{2}-\d{2}\.pdf$/);

  await context.setOffline(false);
});
```
Adapt for Phase 6: test `'Urkunden erstellen'` button offline, expect ZIP download.

---

### `e2e/certificateSingleExport.spec.ts` (test)

**Analog:** `e2e/pdfExport.spec.ts` (same structure, different flow)

**Setup reuse:** Same `setUpTournamentWithResults()` helper from above.

**Per-row action pattern:** New pattern specific to Phase 6 (no exact analog in Phase 5 pdfExport.spec.ts, which only tests bulk export button). Design pattern:
```typescript
test('per-row certificate button in results table generates single PDF', async ({ page }) => {
  await setUpTournamentWithResults(page);

  const downloadPromise = page.waitForEvent('download');
  // Click per-row action button (per D-02, added to each row in ResultsTable)
  await page.locator('button', { has: page.getByText('Urkunde') }).first().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Urkunde_.*_\d{4}-\d{2}-\d{2}\.pdf$/);
});
```

---

### `src/lib/views/Results.svelte` (component/view, request-response)

**File location:** Modify in-place.
**Analog:** Existing Phase 5 PDF export pattern in the same file (lines 53–77, 173–181).

**Existing handleExport pattern** (lines 53–77):
```typescript
async function handleExport() {
  errorFeedback = '';
  try {
    const settings = (await db.settings.get(1)) ?? { id: 1 as const };
    const blob = await generateResultsPdf(rankings, classesWithResults, settings, includeIncomplete);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resultsPdfFilename();
    // WR-04: append before click for Safari/iOS compatibility
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    errorFeedback = strings.resultsPdf.exportError;
  }
}
```
Replicate this pattern twice:
- `handleBulkCertExport()` — calls `generateBulkCerts()` instead of `generateResultsPdf()`, returns ZIP blob
- `handleSingleCertExport(shooter)` — called from ResultsTable per-row action, calls `generateSingleCertPdf(shooter, settings)`, returns single PDF blob

**Button pattern** (lines 173–181):
```typescript
<button
  type="button"
  onclick={handleExport}
  disabled={classesWithResults.length === 0}
  class="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-[16px] font-semibold leading-[1.5] text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto dark:bg-teal-400 dark:text-slate-900 dark:hover:bg-teal-300"
>
  <FileDown size={20} />
  {strings.resultsPdf.exportButton}
</button>
```
Add a second button (same styling) for `handleBulkCertExport()` with `strings.certificateExport.bulkButton` and icon.

**Imports to add** (top of file):
```typescript
import { generateBulkCerts, generateSingleCertPdf, certificatePdfFilename } from '../utils/certificateExport';
```

**Per-row action:** Modify ResultsTable component to expose a per-row action callback that triggers `handleSingleCertExport(shooter)` in Results.svelte.

---

### `src/lib/components/SettingsForm.svelte` (component, CRUD)

**File location:** Modify in-place.
**Analog:** Existing title field pattern in the same file (lines 135–143).

**Title field pattern** (lines 135–143):
```svelte
<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {strings.settingsForm.titleLabel}
  <input
    type="text"
    bind:value={title}
    placeholder={strings.settingsForm.titlePlaceholder}
    class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  />
</label>
```
Replicate for certificate heading field after the title field:
```svelte
<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {strings.settingsForm.certificateHeadingLabel}
  <input
    type="text"
    bind:value={certificateHeading}
    placeholder={strings.settingsForm.certificateHeadingPlaceholder}
    class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  />
</label>
```

**State variable initialization** (lines 14–22):
```typescript
let title = $state('');
let logoLeftBlob = $state<Blob | undefined>(undefined);
let logoRightBlob = $state<Blob | undefined>(undefined);
```
Add alongside:
```typescript
let certificateHeading = $state('');
```

**Settings sync effect** (lines 29–38):
```typescript
$effect(() => {
  if (!initialized && settings !== undefined) {
    title = settings?.title ?? '';
    logoLeftBlob = settings?.logoLeftBlob;
    logoRightBlob = settings?.logoRightBlob;
    initialized = true;
  }
});
```
Extend with:
```typescript
certificateHeading = settings?.certificateHeading ?? '';
```

**Save handler** (lines 110–127):
```typescript
async function save() {
  errorFeedback = '';
  successFeedback = '';
  try {
    await db.settings.put({
      id: 1,
      title,
      logoLeftBlob,
      logoRightBlob,
    });
    successFeedback = strings.settingsForm.saveSuccess;
  } catch (err) {
    // error handling
  }
}
```
Extend `db.settings.put()` call with `certificateHeading`.

---

### `src/lib/db/schema.ts` (config/model, CRUD)

**File location:** Modify in-place.
**Analog:** Existing SettingsRecord interface (lines 77–82) and v4 schema (lines 118–126).

**SettingsRecord interface** (lines 77–82):
```typescript
export interface SettingsRecord {
  id: 1;
  title?: string;
  logoLeftBlob?: Blob;
  logoRightBlob?: Blob;
}
```
Add field:
```typescript
export interface SettingsRecord {
  id: 1;
  title?: string;
  logoLeftBlob?: Blob;
  logoRightBlob?: Blob;
  certificateHeading?: string;  // NEW: Phase 6
}
```

**v4 schema block** (lines 118–126):
```typescript
this.version(4).stores({
  classes: '++id, name',
  shootingLines: 'id',
  rounds: 'id',
  shooters: '++id, classId, lineAssignment',
  presets: '++id, name',
  scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
  settings: 'id',
});
```
Add v5 migration after v4:
```typescript
this.version(5).stores({
  classes: '++id, name',
  shootingLines: 'id',
  rounds: 'id',
  shooters: '++id, classId, lineAssignment',
  presets: '++id, name',
  scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
  settings: 'id',
}).upgrade(tx => {
  return tx.table('settings').toCollection().modify(record => {
    if (!record.certificateHeading) {
      record.certificateHeading = 'Urkunde';  // Default heading
    }
  });
});
```

---

### `src/lib/db/schema.test.ts` (test)

**File location:** Modify in-place.
**Analog:** Existing v4 test block (lines 94–119).

**v4 test block** (lines 94–119):
```typescript
describe('Dexie v4 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 7 tables including settings', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('supports a singleton roundtrip on the settings table', async () => {
    await db.settings.put({ id: 1, title: 'Test', logoLeftBlob: undefined, logoRightBlob: undefined });
    const record = await db.settings.get(1);
    expect(record?.title).toBe('Test');
  });

  it('round-trips a Blob value for logoLeftBlob as a Blob instance', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/png' });
    await db.settings.put({ id: 1, title: 'With Logo', logoLeftBlob: blob });
    const record = await db.settings.get(1);
    expect(record?.logoLeftBlob).toBeInstanceOf(Blob);
  });
});
```

Add v5 test block after v4:
```typescript
describe('Dexie v5 schema', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('defines all 7 tables including settings', () => {
    expect(db.tables.map((t) => t.name).sort()).toEqual(
      ['classes', 'presets', 'rounds', 'scores', 'settings', 'shooters', 'shootingLines'].sort()
    );
  });

  it('initializes certificateHeading to "Urkunde" during v4→v5 upgrade', async () => {
    await db.settings.put({ id: 1, title: 'Test' });
    const record = await db.settings.get(1);
    expect(record?.certificateHeading).toBe('Urkunde');
  });

  it('round-trips certificateHeading as a text string', async () => {
    await db.settings.put({ id: 1, title: 'Test', certificateHeading: 'Teilnahmeurkunde' });
    const record = await db.settings.get(1);
    expect(record?.certificateHeading).toBe('Teilnahmeurkunde');
  });
});
```

Also update the comment at line 16 to reference v5 instead of v4:
```typescript
// ... includes the Phase 6 certificateHeading field added in v5.
```

---

### `src/lib/i18n/strings.de.ts` (config)

**File location:** Modify in-place.
**Analog:** Existing `resultsPdf` section (lines 187–192) and `settingsForm` section (lines 196–210).

**resultsPdf section** (lines 187–192):
```typescript
resultsPdf: {
  exportButton: 'PDF exportieren',
  includeIncompleteLabel: 'Unvollständige Ergebnisse einbeziehen',
  includeIncompleteHelper: 'Schützen mit unvollständigen Ergebnissen in den PDF aufnehmen',
  exportError: 'Speichern fehlgeschlagen',
},
```
Add new section after `resultsPdf`:
```typescript
certificateExport: {
  bulkButton: 'Urkunden erstellen',
  bulkExportError: 'Urkunden-Export fehlgeschlagen',
  singleExportError: 'Urkunde konnte nicht generiert werden',
},
```

**settingsForm section** (lines 196–210):
```typescript
settingsForm: {
  heading: 'Einstellungen (PDF-Export)',
  titleLabel: 'Turnier-Titel (für PDF)',
  titlePlaceholder: "z.B. 'Trainingsturnier SV Musterbach 6.7.2026'",
  logoLeftLabel: 'Logo links (PNG/JPEG, max 200KB)',
  logoRightLabel: 'Logo rechts (PNG/JPEG, max 200KB)',
  logoSizeHint: 'Empfohlen: ca. 500×500 Pixel oder kleiner, quadratisch oder querformatig',
  removeLogoLabel: 'Logo entfernen',
  saveButton: 'Speichern',
  saveSuccess: 'Gespeichert.',
  errorTooLarge: 'Bild ist zu groß (max. 200KB).',
  errorUploadFailed: 'Upload fehlgeschlagen',
  errorSaveFailed: 'Speichern fehlgeschlagen',
  errorQuotaExceeded: 'Speicher voll — versuchen Sie kleinere Bilder.',
},
```
Add two new fields to `settingsForm`:
```typescript
certificateHeadingLabel: 'Urkunden-Überschrift',
certificateHeadingPlaceholder: 'z.B. "Urkunde" oder "Teilnahmeurkunde"',
```

---

## Shared Patterns

### Authentication / Authorization
**Not applicable.** Phase 6 is a client-only offline app with no user authentication or role-based access control. All users have full access to certificate generation.

### Error Handling
**Source:** `src/lib/views/Results.svelte` (lines 74–77, existing Phase 5 pattern)

**Pattern:**
```typescript
async function handleExport() {
  errorFeedback = '';
  try {
    // ... export logic
  } catch {
    errorFeedback = strings.resultsPdf.exportError;
  }
}

{#if errorFeedback}
  <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
{/if}
```

**Apply to:** 
- `handleBulkCertExport()` — use `strings.certificateExport.bulkExportError`
- `handleSingleCertExport()` — use `strings.certificateExport.singleExportError`

### Browser Download Pattern (DOM-append-before-click)
**Source:** `src/lib/views/Results.svelte` (lines 64–73, WR-04 pattern from Phase 5)

**Pattern:**
```typescript
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);  // WR-04: append before click for Safari/iOS
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

**Apply to:** 
- `handleBulkCertExport()` — ZIP download
- `handleSingleCertExport()` — single PDF download

**Critical:** This pattern is mandatory for iOS Safari compatibility. Do not omit the `appendChild` step or downloads will silently fail on iPad/iPhone.

### Dexie + Svelte 5 Runes Hybrid Pattern
**Source:** `src/lib/views/Results.svelte` (lines 16–28, liveQuery + $derived pattern)

**Pattern:**
```typescript
const shootersQuery = liveQuery(() => db.shooters.toArray());
let shooters = $derived($shootersQuery ?? []);

let rankings = $derived(computeClassRankings(shooters, classes, allScores, roundsConfig));
```

**Apply to:** Settings fetching in Results.svelte and SettingsForm.svelte already uses this pattern (lines 11–12 of SettingsForm.svelte). **No new pattern needed** — reuse existing.

### Validation & Feedback
**Source:** `src/lib/components/SettingsForm.svelte` (lines 110–127, save success/error feedback)

**Pattern:**
```typescript
let successFeedback = $state('');
let errorFeedback = $state('');

async function save() {
  errorFeedback = '';
  successFeedback = '';
  try {
    await db.settings.put({ /* ... */ });
    successFeedback = strings.settingsForm.saveSuccess;
  } catch (err) {
    errorFeedback = /* error message */;
  }
}

{#if successFeedback}
  <p class="text-[14px] leading-[1.4] text-teal-600 dark:text-teal-400">{successFeedback}</p>
{/if}

{#if errorFeedback}
  <p class="text-[14px] leading-[1.4] text-red-600 dark:text-red-400">{errorFeedback}</p>
{/if}
```

**Apply to:** SettingsForm.svelte `save()` handler — add `certificateHeading` to the put() call. Success/error feedback UI already present.

---

## No Analog Found

All files have direct analogs or are in-place modifications. **Coverage: 100%.**

---

## Metadata

**Analog search scope:** `src/lib/{utils,components,views,db}`, `e2e/`, `src/lib/i18n/`
**Files scanned:** 43 source files in src/lib and e2e directories
**Pattern extraction date:** 2026-07-06
**Confidence:** HIGH — all analogs are Phase 5 or foundational, same tech stack, no breaking API changes
