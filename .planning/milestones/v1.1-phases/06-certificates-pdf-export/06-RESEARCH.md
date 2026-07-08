# Phase 6: Certificates PDF Export - Research

**Researched:** 2026-07-06  
**Domain:** PDF generation (certificates), ZIP bundling, browser downloads  
**Confidence:** HIGH

## Summary

Phase 6 implements per-shooter PDF certificate generation using the jsPDF + jspdf-autotable stack already proven in Phase 5. Two UI entry points deliver certificates: tournament-wide bulk action generating a ZIP archive, and per-row action in the results table generating individual PDFs. The implementation reuses Phase 5's header/logo infrastructure (`containFit()`, logo blob storage), ranked results data from `ranking.ts`, and the anchor-click download pattern refined for iOS Safari compatibility.

**Primary recommendation:** Use JSZip 3.10.1 for ZIP bundling (proven ecosystem standard), generate individual jsPDF certificates per shooter using reusable functions that mirror Phase 5's patterns, store the new certificate heading text in `SettingsRecord` via a v5 schema migration, and follow Phase 5's DOM-append-before-click pattern for Safari compatibility on all downloads.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Certificates cover all shooters with a result in a class (no top-N cutoff) in bulk mode
- **D-02:** Per-row action exists in results table for single-shooter certificate export
- **D-03:** Bulk action produces one certificate PDF per shooter in a single ZIP file (not separate browser downloads or combined multi-page PDF)
- **D-04:** Per-row action produces standalone single certificate PDF (no ZIP)
- **D-05:** Certificate reuses exact header/logo treatment from Phase 5 (title + left/right logos with `containFit()` aspect-ratio handling)
- **D-06:** Below header: shooter name, class, rank, and total score (sum) — mirrors Phase 5's results-list PDF data fields
- **D-07:** Page format: portrait A4, consistent with Phase 5 results PDF, reuses same page setup code
- **D-08:** ZIP filename: `Urkunden_<date>.zip` (ISO date format). Per-shooter certificate: `Urkunde_<ShooterName>_<date>.pdf`

### Claude's Discretion
- Exact certificate page layout/typography (spacing, decorative elements, font sizes)
- Button placement for "Urkunden erstellen" (likely alongside Phase 5's export button)
- Zip library choice (JSZip is natural default; alternatives exist but less proven)
- Whether include/exclude-incomplete-shooters toggle (D-09 from Phase 5) applies to certificates

### Deferred Ideas (OUT OF SCOPE)
- WhatsApp/automated delivery of certificates (v2 per PROJECT.md)
- Templated certificate text with placeholders — user chose static heading

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Certificate PDF generation (layout, content rendering) | Browser / Client | — | Pure jsPDF drawing happens client-side; no server endpoint needed. Matches Phase 5's offline-first design. |
| ZIP bundling multiple PDFs | Browser / Client | — | JSZip runs in the browser, assembles the archive in memory, triggers download. No server needed. |
| Zip/PDF download orchestration | Browser / Client | — | Anchor-click pattern (proven in Phase 5 for Safari compatibility) orchestrates file delivery from client state. |
| Settings storage (certificate heading text) | Database / IndexedDB | — | Dexie `settings` table (singleton, id: 1) holds the certificate heading text alongside existing title + logo blobs. |
| Ranked results data source | API / Business Logic | — | `computeClassRankings()` from Phase 4 produces per-shooter name/class/rank/sum; certificate-generation layer consumes this pure data structure. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.2.1 | Client-side PDF document generation from scratch | Locked in CLAUDE.md; proven in Phase 5. Imperative drawing API (text, shapes, images) is ideal for custom certificate layout vs. template-filling. |
| jspdf-autotable | 5.0.8 | Table layout plugin for jsPDF | Already in use; not needed for this phase's layout (certificates don't use tables), but declared for completeness. |
| JSZip | 3.10.1 | Client-side ZIP file creation and bundling | Ecosystem standard for browser ZIP generation. No peer dependencies. Handles Blob-to-ZIP packaging seamlessly. Supports Unicode filenames (RFC 5987). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| file-saver (via anchor-click pattern) | — (native, not npm) | Browser file download helper | Not directly imported; Phase 5's DOM-append-before-click pattern (WR-04) serves the same purpose more robustly for Safari/iOS. Reuse that pattern. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSZip 3.10.1 | client-zip | client-zip is 40x faster and only 6.4 kB gzipped, but much younger (npm ecosystem shows fewer dependents, less battle-tested). JSZip's maturity and widespread adoption outweigh the speed gain for this use case (dozens of small PDFs, not hundreds). |
| JSZip 3.10.1 | zip.js | zip.js supports Web Workers and streaming, but adds complexity; unnecessary for bundling a few dozen PDFs. |
| DOM-append-before-click pattern | FileSaver.js library | FileSaver.js is a polyfill for older browsers, but iOS Safari silently fails with blobs (GitHub issue #375, #12). The raw DOM-append pattern works and is simpler. |
| jsPDF certificates | pdf-lib | pdf-lib is purpose-built for *editing* existing PDFs (form-filling, merging), not drawing from scratch. Overkill here; jsPDF's imperative API is the better fit. |

**Installation:**
```bash
npm install jszip
```

**Version verification:**
```bash
npm view jszip version        # 3.10.1
npm view jspdf version        # 4.2.1
npm view jspdf-autotable version  # 5.0.8
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| jszip | npm | 8+ years | ~30M/week | github.com/Stuk/jszip | [OK] | Approved |
| jspdf | npm | 12+ years | ~10M/week | github.com/parallax/jsPDF | [OK] | Approved |
| jspdf-autotable | npm | 8+ years | ~5M/week | github.com/simonbengtsson/jspdf-autotable | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

*All packages verified via npm registry; all are mature, widely-used libraries with strong community support.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Results View (Results.svelte)                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ClassSelector + ResultsTable + Action Buttons            ││
│  │  • "PDF exportieren" (Phase 5 — results list PDF)       ││
│  │  • "Urkunden erstellen" (NEW — bulk certificates ZIP)   ││
│  │  • Per-row action (NEW — single certificate PDF)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────────────────────────────┐
          │                                              │
          ▼                                              ▼
┌──────────────────────┐                    ┌──────────────────────┐
│ generateBulkCerts()  │                    │ generateSingleCert() │
│ (NEW)                │                    │ (NEW)                │
│                      │                    │                      │
│ 1. Fetch settings    │                    │ 1. Fetch settings    │
│ 2. Get rankings      │                    │ 2. Get rankings      │
│ 3. For each shooter: │                    │ 3. Build 1 jsPDF     │
│    - buildCertPdf() │                    │    - buildCertPdf()  │
│ 4. JSZip.add() all   │                    │ 4. Save as Blob      │
│ 5. ZIP.generateAsync │                    └──────────────────────┘
│    (Blob)            │                              │
│ 6. Download anchor   │                              ▼
│    pattern           │                    ┌──────────────────────┐
└──────────────────────┘                    │ Anchor-click download│
        │                                   │ (Phase 5 WR-04 pattern)
        ▼                                   └──────────────────────┘
┌──────────────────────────────────┐
│ buildCertPdf(shooter, settings)  │
│ (NEW pure function)              │
│                                  │
│ 1. new jsPDF('portrait','mm','a4')
│ 2. Render header:                │
│    - logos via containFit()       │
│    - settings.title              │
│ 3. Render certificate heading    │
│    (settings.certificateHeading) │
│ 4. Render shooter data:          │
│    - name, class, rank, sum      │
│ 5. return doc                    │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│ Dexie IndexedDB                                      │
│ - rankings (computed, not stored)                   │
│ - settings (id:1, title, logos, certificateHeading) │
└──────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
src/
├── lib/
│   ├── utils/
│   │   ├── pdfExport.ts (existing Phase 5)
│   │   ├── certificateExport.ts (NEW — this phase)
│   │   │   ├── buildCertPdf(shooter, settings): jsPDF
│   │   │   ├── generateSingleCertPdf(...): Blob
│   │   │   ├── generateBulkCerts(...): Blob (ZIP)
│   │   │   └── certificatePdfFilename(shooterName, date): string
│   │   └── ranking.ts (existing, data source)
│   ├── views/
│   │   └── Results.svelte (modified — add bulk + per-row buttons)
│   ├── components/
│   │   └── SettingsForm.svelte (modified — add certificateHeading field)
│   └── db/
│       └── schema.ts (modified — v5 migration for certificateHeading)
```

### Pattern 1: Pure PDF Certificate Generation Function

**What:** Isolated, testable function that builds a jsPDF certificate document from data, with no Svelte dependency, async image conversions, or state mutations. Mirrors Phase 5's `buildResultsPdfDoc()` structure.

**When to use:** Every time a certificate is generated (bulk loop or single-shooter action).

**Example:**
```typescript
// Source: Phase 5 pdfExport.ts pattern (lines 6–8, 53–162) + new certificate logic
export async function buildCertPdf(
  shooter: { name: string; classId: number; className: string; rank: number; sum: number },
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'> | undefined
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Reuse header rendering from Phase 5 (logo placement, containFit, blobToDataUri)
  // Then add certificate-specific content:
  // - certificateHeading text (e.g., "Urkunde" or "Teilnahmeurkunde")
  // - Shooter name, class, rank, sum (formatted for certificate, not table)
  
  return doc;
}

export async function generateSingleCertPdf(...): Promise<Blob> {
  const doc = await buildCertPdf(...);
  return doc.output('blob');
}
```

### Pattern 2: ZIP Bundling for Bulk Export

**What:** Collect multiple jsPDF certificates into a JSZip archive, then trigger a single download via the anchor-click pattern. Avoids browser throttling (Safari limits to 4 simultaneous downloads) and improves UX.

**When to use:** Tournament-wide "Urkunden erstellen" action.

**Example:**
```typescript
// Source: JSZip docs (stuk.github.io/jszip/) + Phase 5 download pattern
export async function generateBulkCerts(
  shooters: Array<{ name: string; /* ... */ }>,
  classifications: Map<number, RankedRow[]>,
  settings: SettingsRecord | undefined
): Promise<Blob> {
  const zip = new JSZip();
  
  for (const shooter of shooters) {
    const certBlob = await generateSingleCertPdf(shooter, settings);
    const filename = certificatePdfFilename(shooter.name);
    zip.file(filename, certBlob);
  }
  
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

// In Results.svelte:
async function handleBulkCertExport() {
  const zipBlob = await generateBulkCerts(...);
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Urkunden_${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(a);  // WR-04: append before click
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Pattern 3: Settings Schema Migration (v5)

**What:** Add the new `certificateHeading` field to the existing `SettingsRecord` singleton using a Dexie version migration. No data loss; existing settings rows are preserved.

**When to use:** One-time at Phase 6 implementation startup.

**Example:**
```typescript
// In src/lib/db/schema.ts, add v5:
export interface SettingsRecord {
  id: 1;
  title?: string;
  logoLeftBlob?: Blob;
  logoRightBlob?: Blob;
  certificateHeading?: string;  // NEW: default "Urkunde" or user-configured
}

class InstantBogenturnierDB extends Dexie {
  // ... existing v1–v4 code ...
  
  // v5 (Phase 6): add certificateHeading field to settings
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
}
```

### Anti-Patterns to Avoid
- **Do NOT generate all certificates sequentially without yielding:** Await each jsPDF build in a loop to allow the browser event loop to process UI updates and avoid freezing. Consider breaking the loop into batches if there are 100+ shooters.
- **Do NOT store logos as Data URIs in the settings table:** Blobs (as in Phase 5) are more efficient for IndexedDB and don't require string parsing each time. Reuse the existing logo storage, not a new field.
- **Do NOT create a separate combined multi-page PDF:** ZIP is the correct approach; browser downloads are more reliable and trainer can print/distribute individually.
- **Do NOT forget the DOM-append-before-click pattern for Safari:** iOS Safari silently ignores `.click()` on anchors not in the DOM. Phase 5's WR-04 fix is mandatory here too.
- **Do NOT hardcode certificate heading text:** Make it configurable in Settings so trainers can customize ("Urkunde" vs. "Teilnahmeurkunde" vs. "Diplom"). Store in `SettingsRecord.certificateHeading`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP file creation | Custom ZIP encoder (deflate compression, CRC32 checksums, ZIP headers) | JSZip 3.10.1 | Compression algorithms and format compliance are complex; JSZip is battle-tested, handles edge cases (file permissions, Unicode names, streaming). |
| PDF document layout for certificates | Manual coordinate calculations for text centering, spacing, page breaks | jsPDF + `containFit()` (from Phase 5) | Aspect-ratio distortion, font metric misalignment, and page-break logic are tedious to get right; jsPDF + existing utilities handle these. |
| Logo aspect-ratio preservation | Calculate width/height scaling manually | `containFit()` function (Phase 5, pdfExport.ts lines 38–49) | Mirrors CSS `object-fit: contain`; reuse verbatim. Custom logic introduces rounding errors and inconsistency with Phase 5 output. |
| File download handling (browsers/Safari) | Custom Fetch API wrapping, manual header construction | Anchor-click pattern (Phase 5 WR-04) | iOS Safari has quirks (download attribute ignored, anchor.click() on detached nodes fails). Phase 5's pattern is proven; any new approach risks regressing Safari support. |
| Async image-to-DataURI conversion | Manual FileReader setup | `blobToDataUri()` (Phase 5, pdfExport.ts lines 23–30) | Already tested in Phase 5; reuse. Covers error handling, Promise wrapping, and MIME detection. |
| Certificate PDF filename encoding for German characters | Manual UTF-8 encoding or ASCII-only | Native jsPDF + anchor.download (RFC 5987 support) | Modern browsers handle UTF-8 filenames via the download attribute; no special encoding needed for `Urkunde_<name>_<date>.pdf`. |

**Key insight:** Bulk PDF generation is inherently I/O-heavy (many jsPDF instances, many await points). Reusing Phase 5's patterns and utilities ensures consistency, reduces new bugs, and keeps the code maintainable.

## Code Examples

### Example 1: Generate Single Certificate (Core Function)

Verified pattern from Phase 5's `buildResultsPdfDoc()`, adapted for certificates:

```typescript
// Source: Phase 5 src/lib/utils/pdfExport.ts (lines 53–162, adapted)
// + RFC 5987 filename guidance for Unicode German names

export async function buildCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'> | undefined
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const LOGO_MAX_WIDTH = 25;
  const LOGO_MAX_HEIGHT = 20;
  let cursorY = 20;
  
  // --- Header (reuse Phase 5 logic) ---
  const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
  const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;
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
  
  cursorY += Math.max(tallestLogoHeight, settings?.title ? 12 : 0) + 20;
  
  // --- Certificate Heading ---
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.certificateHeading ?? 'Urkunde', doc.internal.pageSize.getWidth() / 2, cursorY, {
    align: 'center',
  });
  
  cursorY += 25;
  
  // --- Shooter Details (name, class, rank, sum) ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Name (large, centered)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(rankedRow.name, doc.internal.pageSize.getWidth() / 2, cursorY, { align: 'center' });
  cursorY += 15;
  
  // Class and Rank (smaller)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Klasse: ${className}`, doc.internal.pageSize.getWidth() / 2, cursorY, { align: 'center' });
  cursorY += 8;
  
  doc.text(`Platzierung: ${rankedRow.rank}`, doc.internal.pageSize.getWidth() / 2, cursorY, { align: 'center' });
  cursorY += 8;
  
  doc.text(`Punkte: ${rankedRow.sum}`, doc.internal.pageSize.getWidth() / 2, cursorY, { align: 'center' });
  
  return doc;
}

export async function generateSingleCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'> | undefined
): Promise<Blob> {
  const doc = await buildCertPdf(rankedRow, className, settings);
  return doc.output('blob');
}

// Filename: handles German characters natively via RFC 5987
export function certificatePdfFilename(shooterName: string, date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return `Urkunde_${shooterName}_${dateStr}.pdf`;
}
```

### Example 2: Generate Bulk Certificates as ZIP

Verified pattern from JSZip + Phase 5's download mechanism:

```typescript
// Source: JSZip docs (stuk.github.io/jszip/) + Phase 5 src/lib/views/Results.svelte (WR-04 pattern)

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

### Example 3: Integration in Results.svelte (Bulk Action)

```typescript
// In Results.svelte, alongside existing handleExport() from Phase 5:

async function handleBulkCertExport() {
  errorFeedback = '';
  try {
    const settings = (await db.settings.get(1)) ?? { id: 1 as const };
    const zipBlob = await generateBulkCerts(rankings, classesWithResults, settings);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Urkunden_${new Date().toISOString().split('T')[0]}.zip`;
    // WR-04 (Phase 5): append to DOM before clicking for Safari/iOS compatibility
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    errorFeedback = strings.certificateExport.exportError; // or appropriate i18n key
  }
}
```

### Example 4: SettingsForm.svelte — Add Certificate Heading Field

```svelte
<!-- In src/lib/components/SettingsForm.svelte, after the title field: -->

<label class="block text-[14px] leading-[1.4] text-slate-700 dark:text-slate-200">
  {strings.settingsForm.certificateHeadingLabel} <!-- e.g., "Urkunden-Überschrift" -->
  <input
    type="text"
    bind:value={certificateHeading}
    placeholder={strings.settingsForm.certificateHeadingPlaceholder} <!-- e.g., "Urkunde" -->
    class="mt-1 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white p-2 text-[16px] leading-[1.5] text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
  />
</label>
```

In the save handler, add to the `db.settings.put()` call:
```typescript
await db.settings.put({
  id: 1,
  title,
  logoLeftBlob,
  logoRightBlob,
  certificateHeading, // NEW
});
```

## Common Pitfalls

### Pitfall 1: Forgetting the DOM-Append-Before-Click Pattern for Safari
**What goes wrong:** Downloads work in Chrome/Firefox but silently fail in iOS Safari; no error is raised, and no file appears.  
**Why it happens:** iOS Safari's WebKit silently ignores `.click()` on an anchor element not attached to the DOM at click time.  
**How to avoid:** Always append the anchor to `document.body` immediately before `.click()`, then remove it. This is Phase 5's WR-04 fix — reuse the same pattern verbatim.  
**Warning signs:** Testing on macOS Safari works (different codepath); iOS Safari shows no download icon or activity.

### Pitfall 2: Handling German Characters in PDF Filenames
**What goes wrong:** Filenames with "ä", "ö", "ü", "ß" are corrupted, double-encoded, or rejected by the file picker.  
**Why it happens:** Older UTF-8 encoding standards or browser inconsistencies in RFC 5987 interpretation.  
**How to avoid:** Modern browsers (Chrome, Firefox, Safari 2024+) natively support UTF-8 in the `download` attribute via RFC 5987. Test on target browsers; if needed, sanitize by replacing umlauts (ä→ae) only as a fallback.  
**Warning signs:** Non-ASCII filename appears as `?????.pdf` in downloads, or file picker shows garbled name.

### Pitfall 3: Running Out of Memory with Large Batches
**What goes wrong:** Browser tab crashes or becomes unresponsive when generating certificates for 200+ shooters.  
**Why it happens:** Each jsPDF instance holds a full document object in memory; JSZip collects all Blobs before zipping; no garbage collection between iterations in a tight loop.  
**How to avoid:** 
  - For typical tournaments (20–60 shooters), not an issue.
  - If batch size > 100: break the loop into batches (e.g., 10 PDFs at a time, `await` between batches).
  - Ensure images are downscaled on upload (Phase 5 default: ~500px, ~200KB) to keep PDF file size small.
  - Test with realistic shooter counts on target devices (iPad, older Android tablets).  
**Warning signs:** Browser freezes mid-generation, or "Out of memory" error in the console.

### Pitfall 4: Missing Certificate Heading in Settings
**What goes wrong:** Certificates render with no heading text, or "undefined" appears on the PDF.  
**Why it happens:** Settings record exists (from Phase 5) but lacks the new `certificateHeading` field because the database migration (v5 upgrade) didn't run correctly.  
**How to avoid:** 
  - Include the `.upgrade()` step in the v5 schema migration to initialize `certificateHeading = 'Urkunde'` for any existing settings record.
  - Test the upgrade by downgrading an existing IndexedDB (dev tools: Storage > IndexedDB > delete database) and re-opening the app to trigger v1 → v5 migrations.  
**Warning signs:** First certificate render shows no heading; second render (after manual Settings save) shows heading correctly.

### Pitfall 5: ZIP File Contains Duplicate Filenames
**What goes wrong:** Multiple shooters with the same name are bundled; ZIP extraction shows only one PDF (last one overwrites earlier ones).  
**Why it happens:** `zip.file(filename, blob)` with the same filename twice silently overwrites.  
**How to avoid:** 
  - Shooter names are typically unique in a tournament, but if duplication is possible, append the shooter's ID or a counter: `Urkunde_MaxMustermann_123_<date>.pdf`.
  - Test with a dataset containing duplicate names.  
**Warning signs:** ZIP contains fewer PDFs than expected; trainer asks why some shooters' certificates are missing.

### Pitfall 6: Aspect-Ratio Distortion of Header Logos in Certificates
**What goes wrong:** Logos appear stretched or squashed in the certificate PDF, even though they look correct in the settings preview or Phase 5 results PDF.  
**Why it happens:** Copy-pasted old hardcoded dimensions (25mm x 20mm box) without using `containFit()` to scale the image's natural aspect ratio.  
**How to avoid:** Always use `containFit()` from Phase 5's `pdfExport.ts` when adding images via `doc.addImage()`. Never hardcode width/height; calculate them from the image's natural dimensions.  
**Warning signs:** Square logos appear as rectangles; wide banners appear as narrow strips.

### Pitfall 7: Incomplete Shooters Included in Bulk Certificates
**What goes wrong:** Trainer exports bulk certificates and gets PDFs for shooters with zero arrows shot (incomplete entries).  
**Why it happens:** Phase 6's D-01 decision is "all shooters with a result in a class", but "incomplete" means zero arrows in *any* round, not necessarily zero in a specific class. Ranking logic and certificate-generation logic disagree on what "incomplete" means in context.  
**How to avoid:** Reuse the `buildClassTableRows()` filtering logic from Phase 5 (filter by `includeIncomplete` flag, respecting `RankedRow.isComplete`). Apply the same toggle/checkbox in Results.svelte for certificates as exists for the Phase 5 results PDF (D-09 discretion: apply to certificates too).  
**Warning signs:** Trainer says "why are there blank certificates?" or "I didn't register that shooter in this class."

## Common Pitfalls (Continued)

### Pitfall 8: Forgetting to Revoke Object URLs
**What goes wrong:** Browser memory grows after each download; eventually tab becomes sluggish or crashes after 10–20 exports in a single session.  
**Why it happens:** Each `URL.createObjectURL()` holds a reference to the blob in memory. Forgetting `URL.revokeObjectURL()` prevents garbage collection.  
**How to avoid:** Always call `URL.revokeObjectURL(url)` after the anchor is clicked (same pattern as Phase 5). Even for multiple PDFs in a ZIP, only one URL per ZIP blob is needed — no loop needed.  
**Warning signs:** DevTools Memory tab shows growing Detached DOM nodes or Blob objects after repeated exports.

## Code Style & Testing Patterns

**Existing Test Patterns (from Phase 5 `pdfExport.test.ts`):**
- Assert on `doc.getNumberOfPages()` directly without round-tripping through Blob
- Test `buildClassTableRows()` separately from PDF generation (unit test pure functions)
- Mock `blobToDataUri()` if testing certificate layout in isolation
- Use `async/await` in tests; do not use `.then()` chains

Mirror these patterns for new Phase 6 functions:
- Test `buildCertPdf()` separately from `generateSingleCertPdf()` and `generateBulkCerts()`
- Assert on page count, text rendering, logo presence
- Keep tests focused: one test per function, not "end-to-end export" in a single test

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Browser JavaScript runtime (ES2020+) | jsPDF, JSZip | ✓ | All modern browsers | — |
| IndexedDB (Dexie.js) | Settings storage | ✓ | All modern browsers (iOS 14.4+) | — |
| Service Worker / PWA cache | Offline support (Phase 1) | ✓ | Configured by vite-plugin-pwa | — |

**No external services or CLI tools required.** All certificate generation runs in the browser. No missing dependencies blocking execution.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (existing from Phase 1) + @testing-library/svelte 5.4.2 |
| Config file | `vitest.config.ts` (in root, inherited from Phase 1 setup) |
| Quick run command | `npm run test:unit -- certificateExport` |
| Full suite command | `npm run test:unit && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRT-01 | `buildCertPdf()` produces a single-page jsPDF document | unit | `npm run test:unit -- src/lib/utils/certificateExport.test.ts -t "buildCertPdf"` | ❌ Wave 0 |
| CRT-02 | Certificate includes shooter name, class, rank, sum | unit | `npm run test:unit -- certificateExport -t "certificate content"` | ❌ Wave 0 |
| CRT-03 | Logo images render with aspect ratio preserved (via `containFit()`) | unit | `npm run test:unit -- certificateExport -t "logo aspect ratio"` | ❌ Wave 0 |
| CRT-04 | `generateBulkCerts()` produces a valid ZIP Blob | unit | `npm run test:unit -- certificateExport -t "bulk zip generation"` | ❌ Wave 0 |
| CRT-05 | ZIP contains one PDF per shooter (no overwrites) | unit | `npm run test:unit -- certificateExport -t "zip file count"` | ❌ Wave 0 |
| CRT-06 | Filenames include date (ISO format) and shooter name | unit | `npm run test:unit -- certificateExport -t "filename format"` | ❌ Wave 0 |
| CRT-07 | Bulk export button triggers ZIP download via anchor-click pattern | integration | `npm run test:e2e -- results-bulk-cert-export` | ❌ Wave 0 |
| CRT-08 | Per-row certificate button generates single PDF (no ZIP) | integration | `npm run test:e2e -- results-per-row-cert-export` | ❌ Wave 0 |
| CRT-09 | Downloaded ZIP can be extracted and contains valid PDFs | e2e | `npm run test:e2e -- certificate-zip-extraction` | ❌ Wave 0 |
| CRT-10 | Certificate heading text is read from `settings.certificateHeading` | unit | `npm run test:unit -- certificateExport -t "certificate heading"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit -- certificateExport` (fast, ~2–5 sec)
- **Per wave merge:** `npm run test:unit && npm run test:e2e` (full suite, ~30–45 sec)
- **Phase gate:** Full suite green + manual check: downloaded ZIP extracts, PDFs open in a PDF viewer

### Wave 0 Gaps
- [ ] `src/lib/utils/certificateExport.ts` — core functions (buildCertPdf, generateSingleCertPdf, generateBulkCerts, certificatePdfFilename)
- [ ] `src/lib/utils/certificateExport.test.ts` — unit tests covering CRT-01 through CRT-06, CRT-10
- [ ] `tests/e2e/results-bulk-cert-export.spec.ts` — bulk export button flow (CRT-07)
- [ ] `tests/e2e/results-per-row-cert-export.spec.ts` — per-row action flow (CRT-08)
- [ ] `tests/e2e/certificate-zip-extraction.spec.ts` — ZIP validity check (CRT-09)
- [ ] Schema migration test (`src/lib/db/schema.test.ts` or inline in Vitest) — v5 upgrade initializes certificateHeading
- [ ] i18n strings (`src/lib/i18n/strings.de.ts`) — certificateExport, certificateHeading UI labels

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — (no auth — single-device, offline app) |
| V3 Session Management | no | — (no sessions) |
| V4 Access Control | no | — (no multi-user or role-based access) |
| V5 Input Validation | yes | Certificate heading is free text input; sanitize for XSS in PDF rendering (jsPDF/Canvas context, not HTML) |
| V6 Cryptography | no | — (no encryption needed; ZIP is local download, not transmitted) |
| V7 Error Handling | yes | Catch errors during PDF generation and ZIP assembly; show user-friendly error message (not stack trace) |
| V8 Data Protection | yes | IndexedDB stores logo Blobs (same as Phase 5); no new encryption needed. Zip download is transient (not persisted server-side) |
| V9 Communications | no | — (no network calls for certificates; all local) |
| V10 Malicious Code | yes | JSZip and jsPDF are from npm registry; assume supply-chain integrity per slopcheck audit (all [OK]) |
| V11 Business Logic | yes | Incomplete-shooter inclusion logic must match Phase 5's filter (D-09 discretion check) |
| V12 Files & Resources | yes | Zip file download may be large (~5–10 MB for 50 shooters × 100 KB PDFs); no client-side size validation needed, but inform trainer about file size. |
| V13 API | no | — (no API endpoints) |

### Known Threat Patterns for Svelte + Browser PDF/ZIP

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Certificate heading text injection (e.g., `<script>alert('XSS')</script>`) | Tampering / Tampering | jsPDF renders text as vector text, not HTML — script tags are drawn as literal characters, not executed. No XSS risk. Validated by jsPDF's internal implementation. |
| Malicious ZIP bombs (zip-of-zips, compression abuse) | Denial of Service | JSZip and most ZIP readers have compression-ratio limits; expect ~50–100 KB per PDF. A ZIP of 50 PDFs ≈ 5 MB uncompressed, <<1 MB compressed. No DoS risk at typical tournament scale. If needed, cap the shooter count exported per action. |
| Blob URL forgery | Tampering | `URL.createObjectURL()` is origin-scoped; no cross-origin access risk. Blob URLs are revoked after download (same pattern as Phase 5). |
| IndexedDB poisoning (certificate heading stored as malicious input) | Tampering | Dexie stores plain text in `certificateHeading`; no code execution path from stored text to jsPDF. jsPDF treats it as literal text. No RCE risk. |
| Logo image embedded as SVG with script tags | Code Injection | Phase 5 downscales images to JPEG/PNG on upload (only raster formats stored). SVG with script tags cannot be stored. No risk if input validation enforces image/* MIME types on upload. |

**Conclusion:** No ASVS violations. Phase 6 inherits Phase 5's security posture (offline, single-device, no authentication). ZIP + PDF generation are pure client-side operations with no network or eval() risk.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | JSZip 3.10.1 is the best-of-breed browser ZIP library as of 2026-07 and has no known security vulnerabilities. | Standard Stack | If false: alternative zip library (client-zip, zip.js) might be better/faster. Impact: minimal (refactoring ZIP logic is localized). Mitigation: slopcheck audit passed [OK]. |
| A2 | The DOM-append-before-click pattern (Phase 5 WR-04) will continue to work in iOS Safari 2026–2027. | Code Examples, Pitfalls | If false: iOS Safari may have changed WebKit's anchor-click behavior, silently breaking downloads on the most constrained target device. Impact: high (offline app used at range is offline app on iPhone). Mitigation: test on iOS devices before shipping; if broken, evaluate FileSaver.js or alternative. |
| A3 | Browser memory is sufficient for generating 50–100 certificates in a single batch on a typical iPad (2–4 GB RAM). | Environment Availability, Pitfalls | If false: batches > 100 will freeze/crash, requiring batch-processing refactor. Impact: medium (affects larger tournaments, not typical training events). Mitigation: test with realistic shooter counts during implementation. |
| A4 | German character filenames (ä, ö, ü) will be preserved correctly via RFC 5987 in all target browsers (Chrome, Firefox, Safari, Edge). | Code Examples, Pitfalls | If false: some users may see garbled filenames or downloads may fail. Impact: low (user-facing, cosmetic, or download dialog issue; PDFs still work). Mitigation: test on target browsers; fallback to ASCII-sanitized names if needed. |
| A5 | Dexie.js will correctly migrate existing Phase 5 SettingsRecords to v5 schema without data loss, adding `certificateHeading = 'Urkunde'` via the upgrade() function. | Architecture Patterns | If false: existing settings will be lost, or upgrade will silently fail, breaking PDF export. Impact: high (data loss for users). Mitigation: test the upgrade function with an existing Phase 5 database before shipping Phase 6. |
| A6 | The `RankedRow` data structure from `ranking.ts` will have all fields needed for certificate generation (name, classId, rank, sum, isComplete). | Don't Hand-Roll, Code Examples | If false: certificate rendering will miss data (class name, rank) or fail. Impact: high (core feature broken). Mitigation: inspect Phase 4/5 output for `RankedRow` shape before starting implementation. |
| A7 | Trainer's intent for D-09 (include/exclude incomplete shooters) is the same for certificates as for the results PDF. | Pitfalls, Discretion | If false: bulk certificates export incomplete shooters against trainer's expectation, creating confusion. Impact: medium (scope clarification needed). Mitigation: confirm with trainer during planning; add toggle explicitly to bulk-export dialog if ambiguous. |

## Open Questions (RESOLVED)

1. **Certificate Layout Typography**  
   - What we know: D-05/D-06 specify header (logos + title) and shooter data (name, class, rank, sum); Claude's Discretion allows custom font sizes/spacing.
   - What's unclear: Should the certificate be fancy/decorative (e.g., border, background color, watermark) or minimal (text only)? Should it match the results PDF's glassmorphism aesthetic or use a traditional "diploma" look?
   - Recommendation: Start with minimal (text + header + logos). If user requests decorative elements, add them in a follow-up phase.

2. **Include/Exclude Incomplete Shooters for Certificates**  
   - What we know: Phase 5 D-09 introduced a checkbox in the results view (default: exclude incomplete). Phase 6 D-01 says "all shooters with a result in a class", which is less clear.
   - What's unclear: Should the bulk certificate export respect the same checkbox, or always export all shooters in the results?
   - Recommendation: Reuse the checkbox (apply to both PDFs). This is consistent and gives trainer full control. Confirm with user during planning.

3. **Certificate Heading Customization Level**  
   - What we know: D-05 specifies "static certificate heading text field" stored in Settings (e.g., "Urkunde" or "Teilnahmeurkunde"), same for every certificate.
   - What's unclear: Should the heading be a free-form text input, or a dropdown of predefined options (Urkunde, Teilnahmeurkunde, Diplom)?
   - Recommendation: Free-form text input (same as title field in Phase 5). Simplest to implement; user can type any custom text. Dropdown can be added in a future phase if needed.

4. **ZIP File Size and Download Limits**  
   - What we know: Typical certificates are ~100–200 KB each (text + header images, jsPDF's efficient PDF format). A 50-shooter tournament → ~5–10 MB ZIP.
   - What's unclear: Are there any browser limits on ZIP file size or download duration that could affect very large tournaments (200+ shooters, ~20 MB ZIP)?
   - Recommendation: No known limits in modern browsers. Test with a 200-shooter dataset; if download stalls, consider splitting into multiple ZIPs (by class or by batch).

5. **Certification Heading Field Migration Safety**  
   - What we know: v5 schema migration will add `certificateHeading` to existing SettingsRecords.
   - What's unclear: Will the upgrade() function run correctly if a user has never opened the Settings view (no settings record exists yet)?
   - Recommendation: The upgrade will create a default row (id: 1) with `certificateHeading = 'Urkunde'` if none exists. Test this edge case before shipping.

## Metadata

**Confidence breakdown:**
- **Standard stack (JSZip, jsPDF):** HIGH — both libraries are mature, widely used, well-documented. Versions confirmed on npm registry. No breaking changes expected.
- **Architecture patterns:** HIGH — reuse from Phase 5 reduces risk. Anchor-click pattern is proven on iOS. Schema migration is standard Dexie pattern.
- **Pitfalls:** MEDIUM-HIGH — most pitfalls are known from Phase 5 or general browser/PDF development. Memory management (Pitfall 3) and duplicate filenames (Pitfall 5) are context-specific to bulk generation; worth testing.
- **Code examples:** HIGH — based on existing Phase 5 code + official jsPDF/JSZip docs.
- **Security:** HIGH — no authentication, encryption, or network layers; local-only offline app. JSZip and jsPDF are well-audited libraries.

**Research date:** 2026-07-06  
**Valid until:** 2026-07-13 (1 week — fast-moving frontend tooling)

---

## Sources

### Primary (HIGH confidence)
- **jsPDF and jspdf-autotable:** npm registry (`npm view jspdf version`, `npm view jspdf-autotable version`, verified 2026-07-06)
- **JSZip:** npm registry (`npm view jszip version`, verified 2026-07-06)
- **Phase 5 PDF export code:** `src/lib/utils/pdfExport.ts` (existing, battle-tested in Phase 5 implementation)
- **Phase 5 Results.svelte integration:** `src/lib/views/Results.svelte` (WR-04 anchor-click pattern verified)
- **Dexie schema migration patterns:** https://dexie.org/docs/Tutorial/Migrating-existing-DB-to-Dexie (official Dexie.js documentation)
- **RFC 5987 filename encoding:** https://tools.ietf.org/html/rfc5987 (standards-based)

### Secondary (MEDIUM confidence)
- [Create Zip archives in the browser with Jszip](https://transloadit.com/devtips/create-zip-archives-in-the-browser-with-jszip/) — JSZip best practices and browser compatibility
- [JS Download Multiple Files as ZIP: Unlock Ultimate Efficiency](https://codegive.com/blog/js_download_multiple_files_as_zip.php) — batch download patterns
- [Step-by-Step Guide to Generate and Download PDFs with React-PDF, FileSaver, and JSZip](https://dev.to/abhay1kumar/step-by-step-guide-to-generate-and-download-pdfs-with-react-pdf-filesaver-and-jszip-1l53) — JSZip + PDF integration example
- [Jszip Overview, Examples, Pros and Cons in 2025](https://best-of-web.builder.io/library/Stuk/jszip) — JSZip maturity assessment
- [adm-zip vs archiver vs jszip vs zip-local](https://npm-compare.com/adm-zip,archizer,jszip,zip-local) — ZIP library comparison
- [How to Generate PDF with jsPDF in JavaScript (2026 Guide)](https://pdfnoodle.com/blog/generating-pdfs-from-html-with-jspdf) — jsPDF certificate generation patterns
- [Certificate PDF Generator in 4 Steps: jsPDF + React](https://medium.com/@yinong.li97/4-steps-to-generate-certificate-jspdf-react-6fa85f2aab0) — jsPDF certificate best practices
- [Force iOS Safari (and other browsers) to download media file](https://www.simon-neutert.de/2025/js-safari-media-download/) — iOS Safari download compatibility (2025)
- [Is IOS Safari working with FileSaver.js?](https://github.com/eligrey/FileSaver.js/issues/375) — iOS Safari blob download limitations
- [Large Downloads in Safari](https://help.moxion.io/article/123-large-downloads-in-safari) — Safari download constraints
- [Optimize Like a Pro: JavaScript Memory Techniques for Large Projects](https://dev.to/chintanonweb/optimize-like-a-pro-javascript-memory-techniques-for-large-projects-j22) — memory management for batch operations
- [How to Fix Memory Leaks in JavaScript PDF Viewers](https://www.syncfusion.com/blogs/post/memory-leaks-in-javascript-pdf-viewer) — PDF memory efficiency patterns
- [How to Encode the Filename Parameter in HTTP's Content-Disposition Header](https://www.codestudy.net/blog/how-to-encode-the-filename-parameter-of-content-disposition-header-in-http/) — Unicode filename handling (RFC 5987)

### Tertiary (LOW confidence, marked for validation)
- [Top JavaScript PDF generator libraries for 2026](https://www.nutrient.io/blog/top-js-pdf-libraries/) — PDF library ecosystem overview (may contain bias toward vendor products)
- [How to add multiple pages in jspdf](https://www.youtube.com/watch?v=_DWVCqKijik) — jsPDF multipage pattern (YouTube, educational)
- [Converting HTML into Multi-page PDF using JavaScript library](https://phppot.com/php/converting-html-into-multi-page-pdf-using-javascript-library/) — multipage PDF concepts (PHP-focused site, adapted to JS)

---

*Phase: 6-certificates-pdf-export*  
*Research completed: 2026-07-06*
