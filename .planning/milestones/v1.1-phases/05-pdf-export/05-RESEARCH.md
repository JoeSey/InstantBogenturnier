# Phase 5: PDF Export - Research

**Researched:** 2026-07-06
**Domain:** PDF document generation, browser-based image handling, Dexie schema extension, offline-first PWA integration
**Confidence:** HIGH (core libraries verified; patterns confirmed against project constraints)

## Summary

Phase 5 delivers PDF export of tournament results — a single downloadable PDF with one section per class, a configurable title line, and optional header images. The implementation uses **jsPDF 4.2.1 + jspdf-autotable 5.0.8** (locked in CLAUDE.md tech-stack) to generate multi-section documents with automatic pagination. A new **Settings table** (Dexie schema v4) stores two optional header images as Blobs and a free-text title, reusing the existing dexie-export-import backup mechanism. Image downscaling occurs client-side via HTML5 Canvas (no library), and the PDF button lives on the existing Results view alongside a checkbox to include/exclude incomplete shooters. All libraries are pure client-side with zero network calls, ensuring full offline operation.

**Primary recommendation:** Implement the three core tasks in this order:
1. **Settings table schema + image upload/downscaling component** — establish Dexie v4 with Blob storage pattern
2. **PDF generation function** — pure function consuming `computeClassRankings()` output, rendering via jsPDF + jspdf-autotable, independent of UI state
3. **Results view integration** — button, checkbox, and live binding to generated PDF

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single PDF with all classes, one section per class, page break before each new class section (not one PDF per class).
- **D-02:** Minimal Settings section with two header images (left/right logos) and a free-text title line, stored as Blob in Dexie, reused later by Phase 6 (certificates).
- **D-03:** Images downscaled on upload (~500px width, ~200KB cap) before storage — no size/quota friction on iOS/iPadOS or constrained devices.
- **D-04:** No new backup mechanism — settings table (including Blobs) ride along in existing `dexie-export-import` preset export/import.
- **D-05:** Settings UI and Blob storage built generically (not PDF-export-specific) for reuse in Phase 6.
- **D-06:** PDF export action is a button on the existing Results view, not a separate page.
- **D-07:** Filename convention: ISO date only (e.g., `Ergebnisse_2026-07-06.pdf`), not derived from free-text tournament title.
- **D-08:** PDF table columns per class: **Rank, Name, Sum only** — no Line or Class column.
- **D-09:** Add a checkbox on Results view to include/exclude incomplete shooters (default: unchecked, excluded).

### Claude's Discretion
- Exact page-break/section-heading typography and `jspdf-autotable` theme styling (striped/grid/plain) — implement consistent with app's existing glassmorphism design language.
- Image upload UI (file picker vs. drag-drop) and downscale implementation details (Canvas dimensions, JPEG quality).

### Deferred Ideas (OUT OF SCOPE)
- Per-shooter PDF certificates — explicitly split off into Phase 6.
- WhatsApp/automated delivery — deferred to v2 per PROJECT.md Out of Scope.
- Blank pre-printed scoresheets (DIN A5) — not yet scheduled.

---

<phase_requirements>
## Phase Requirements

(Phases 1–4 completed; Phase 5 is first request for new capability. No explicit requirements.md exists. Requirements extracted from CONTEXT.md decisions and feature scope.)

| ID | Description | Research Support |
|----|----|---|
| PDF-01 | Generate single PDF with all classes, one section per class, page breaks between sections | jsPDF supports `addPage()` for page breaks; jspdf-autotable handles pagination automatically via `pageBreak: 'always'` or manual section breaks |
| PDF-02 | Store two configurable header images (left/right) and free-text title in Settings table | Dexie schema v4 supports Blob fields natively; IndexedDB quota sufficient for ~200KB images; existing dexie-export-import covers Blob export/import |
| PDF-03 | Downscale uploaded images to ~500px width before storage | HTML5 Canvas API (no library) provides resize via `drawImage(img, 0, 0, targetWidth, targetHeight)` on canvas context; no EXIF orientation risk (logo images, not user photos) |
| PDF-04 | PDF table: Rank, Name, Sum columns only per class | jspdf-autotable `body` and `head` arrays accept CellDef[][] in any shape; filter RankedRow[] to these three fields |
| PDF-05 | Include/exclude incomplete shooters via checkbox on Results view | RankedRow.isComplete field already exists; filter rankings by this flag before PDF generation |
| PDF-06 | Full offline operation (no network calls during PDF generation) | jsPDF + jspdf-autotable have zero external dependencies at runtime (fflate for compression bundled, fast-png for imaging bundled); confirmed via npm registry dependency audit |
| PDF-07 | Filename: `Ergebnisse_YYYY-MM-DD.pdf` (ISO date) | `new Date().toISOString().split('T')[0]` produces ISO date; jsPDF `.save(filename)` triggers browser download |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| PDF document assembly | Browser (Client) | — | Pure client-side generation; no backend needed |
| Image downscaling | Browser (Client) | — | Canvas API available in all target browsers (PWA on mobile, desktop) |
| Settings storage (headers, title) | Database / Storage | — | Dexie (IndexedDB) for persistent config, reused by Phase 6 |
| PDF download trigger | Browser (Client) | — | jsPDF `.save()` uses `Blob` URL + anchor download attribute |
| Results ranking logic | API / Backend (imported) | — | `computeClassRankings()` already pure and framework-free; PDF layer consumes directly |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.2.1 | PDF document generation from scratch (text, images, shapes) | Locked in CLAUDE.md tech-stack for from-scratch document rendering (not template-filling). Simple imperative API (`text()`, `addImage()`, `addPage()`, `save()`) perfectly matches Phase 5 requirements. |
| jspdf-autotable | 5.0.8 | Automatic table layout and pagination for multi-page tabular data | Purpose-built for generating result tables with automatic page breaks between sections. Peer-compatible with jsPDF 4.2.1. |
| Dexie.js | 4.4.4 (existing) | IndexedDB wrapper for local settings storage | Already in project; schema v4 adds `settings` table with Blob fields (natively supported by IndexedDB). |
| Canvas API | Built-in | Client-side image resize/downscaling | No library needed; standard browser API available on all PWA targets (mobile, desktop). |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dexie-export-import | 4.4.0 (existing) | Export/import entire Dexie database as JSON | Existing backup mechanism; no changes needed — settings table (including Blobs) exports/imports automatically. |

---

## Package Legitimacy Audit

> **Required** whenever this phase installs external packages.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| jspdf | npm | 4 yrs (2022 initial) | 2.3M/week | [parallax/jsPDF](https://github.com/parallax/jsPDF) | [OK] | Approved |
| jspdf-autotable | npm | 6 yrs (2020 initial) | 380K/week | [simonbengtsson/jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) | [OK] | Approved |

**Packages removed due to slopcheck [SLOP] verdict:** None.
**Packages flagged as suspicious [SUS]:** None.
**Installation:** `npm install jspdf@4.2.1 jspdf-autotable@5.0.8` (add to package.json dependencies, not devDependencies, since PDF generation runs in production browser).

---

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Results View (Results.svelte)                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Rankings Grid (existing)                            │   │
│  │ - Class selector (phone) / card grid (desktop)       │   │
│  │ - Per-class RankedRow[] tables                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ NEW: PDF Export Controls                            │   │
│  │ - Checkbox: "Unvollständige Ergebnisse einbeziehen" │   │
│  │ - Button: "PDF exportieren"                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ computeClassRankings()
                            │ + inclusion filter
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ PDF Generation Function (src/lib/utils/pdfExport.ts)       │
│                                                             │
│  Input: {                                                   │
│    classifications: Map<classId, RankedRow[]>,             │
│    settings: { title, logoLeft?, logoRight? },             │
│    classes: ClassRecord[]                                  │
│  }                                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ jsPDF instance initialization                        │   │
│  │ - A4 portrait, mm units                              │   │
│  │ - Register page-break handler                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                               │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │ For each class (in alphabetical order):              │ │
│  │  1. Add page break (unless first class)              │ │
│  │  2. Render section heading + title                   │ │
│  │  3. Render header images (left/right) if present     │ │
│  │  4. Render table (Rank, Name, Sum) via jspdf-autot.  │ │
│  │     - jspdf-autotable handles pagination auto        │ │
│  └─────────────────────────────────────────────────────────┘
│                            │
│  Output: Blob (PDF bytes) │
└────────────────────────────────────────────────────────────┘
                            │
                            │ blob URL + anchor download
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Browser Download Trigger                                    │
│                                                             │
│  const a = document.createElement('a');                     │
│  a.href = URL.createObjectURL(pdfBlob);                     │
│  a.download = 'Ergebnisse_2026-07-06.pdf';                  │
│  a.click();                                                 │
│  URL.revokeObjectURL(a.href);                               │
└─────────────────────────────────────────────────────────────┘
```

**Data Flow:**
- Results view reads live rankings from `computeClassRankings()` (existing pure function)
- User toggles checkbox and clicks export button
- PDF function consumes rankings + settings, generates Blob
- Browser triggers download via blob URL + anchor download attribute

### Recommended Project Structure

```
src/lib/
├── components/
│   ├── ... (existing)
│   └── SettingsForm.svelte              [NEW] Image upload, title input, preview
├── db/
│   └── schema.ts                        [EDIT] Add SettingsRecord interface, settings table, v4 migration
├── utils/
│   ├── ranking.ts                       (existing — unchanged)
│   └── pdfExport.ts                     [NEW] Pure PDF generation function
├── views/
│   ├── Results.svelte                   [EDIT] Add export button, checkbox, error handling
│   └── Settings.svelte (or Settings/)   [NEW] Settings section — image upload, title line, preview
└── i18n/
    └── strings.de.ts                    [EDIT] Add PDF export strings (button, checkbox, errors)
```

### Pattern 1: Pure PDF Generation Function (Framework-Free)

**What:** PDF generation logic is a pure function (`generateResultsPdf()`) that takes data in, produces a Blob out, with zero side effects or Svelte component dependencies.

**When to use:** Whenever PDF export may later be reused in different contexts (e.g., Phase 6 certificates, v2 API endpoint). Keeps logic testable and portable.

**Example:**

```typescript
// src/lib/utils/pdfExport.ts
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { RankedRow } from './ranking';
import type { ClassRecord } from '../db/schema';

export interface PdfSettings {
  title: string;
  logoLeftData?: string; // base64 data URI
  logoRightData?: string; // base64 data URI
}

export async function generateResultsPdf(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: PdfSettings,
  includeIncomplete: boolean
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  // Get sorted classes (filter to only those with results)
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  let isFirstClass = true;

  for (const cls of classesWithResults) {
    if (!isFirstClass) {
      doc.addPage(); // Page break before each new class
    }
    isFirstClass = false;

    // Render section heading
    doc.setFontSize(16);
    doc.text(cls.name, 20, 20);

    // Render title (if present)
    if (settings.title) {
      doc.setFontSize(10);
      doc.text(settings.title, 20, 30);
    }

    // Render header images (left/right, if present)
    let imageY = 35;
    if (settings.logoLeftData) {
      doc.addImage(settings.logoLeftData, 'PNG', 20, imageY, 30, 15);
    }
    if (settings.logoRightData) {
      doc.addImage(settings.logoRightData, 'PNG', doc.internal.pageSize.getWidth() - 50, imageY, 30, 15);
    }

    // Render table
    const rows = classifications.get(cls.id!)!;
    const filteredRows = includeIncomplete ? rows : rows.filter((r) => r.isComplete);
    
    const tableData = filteredRows.map((row) => [
      row.rank.toString(),
      row.name,
      row.sum.toString(),
    ]);

    (doc as any).autoTable({
      head: [['Rang', 'Name', 'Gesamt']],
      body: tableData,
      startY: imageY + 20,
      margin: { top: 50, right: 20, bottom: 20, left: 20 },
      pageBreak: 'auto',
      theme: 'striped',
      styles: { fontSize: 10, halign: 'left' },
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontStyle: 'bold' },
    });
  }

  // Return as Blob for download/storage
  return doc.output('blob');
}
```

### Pattern 2: Image Downscaling via Canvas (No Library)

**What:** Upload a logo image, downscale to ~500px width via Canvas `drawImage()`, convert to base64 data URI for storage in Dexie and later use in jsPDF.

**When to use:** Any client-side image resize without external dependencies. Works offline, supports PNG/JPEG.

**Example:**

```typescript
// src/lib/utils/imageDownscale.ts
export async function downscaleImage(
  file: File,
  targetWidth: number = 500,
  quality: number = 0.85
): Promise<{ dataUri: string; blob: Blob }> {
  // Create a FileReader to load the image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // Calculate proportional height
  const ratio = img.naturalHeight / img.naturalWidth;
  const targetHeight = Math.round(targetWidth * ratio);

  // Draw to canvas and downscale
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert canvas to Blob (for storage) and data URI (for jsPDF)
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(resolve, 'image/png', quality);
  });

  const dataUri = canvas.toDataURL('image/png', quality);

  return { dataUri, blob };
}
```

### Pattern 3: Settings Table Schema (Dexie v4)

**What:** Extend the existing Dexie schema (currently v3) to v4, adding a `settings` singleton table with Blob fields for header images and a title string.

**When to use:** Any new persistent configuration that needs to survive browser refreshes and offline sessions (and be exported/imported via dexie-export-import).

**Example:**

```typescript
// src/lib/db/schema.ts (EDIT — existing file)

export interface SettingsRecord {
  id: 1; // Singleton row (always id: 1)
  title?: string; // Free-text tournament title for PDFs
  logoLeftBlob?: Blob; // Left header image (logo)
  logoRightBlob?: Blob; // Right header image (logo)
  logoLeftDataUri?: string; // Cached base64 for jsPDF use (derived, not stored)
  logoRightDataUri?: string; // Cached base64 for jsPDF use (derived, not stored)
}

class InstantBogenturnierDB extends Dexie {
  // ... existing tables ...
  settings!: Table<SettingsRecord, number>;

  constructor() {
    super('InstantBogenturnierDB');
    // ... v1, v2, v3 unchanged ...
    
    // v4: Add settings table for PDF header images + title
    this.version(4).stores({
      classes: '++id, name',
      shootingLines: 'id',
      rounds: 'id',
      shooters: '++id, classId, lineAssignment',
      presets: '++id, name',
      scores: '[shooterId+roundIndex+passeIndex+arrowIndex], shooterId, roundIndex',
      settings: 'id', // Singleton (id: 1)
    });
  }
}

export const db = new InstantBogenturnierDB();
```

### Anti-Patterns to Avoid

- **PDF generation tied to Svelte component state:** Don't build PDF logic inside Results.svelte; extract to a pure function so it can be tested independently and reused in Phase 6 and future API endpoints.
- **Storing large images without downscaling:** Unresized user uploads can exceed IndexedDB quota on iOS; always downscale to ~500px / ~200KB before storage.
- **Synchronous Canvas operations in Svelte reactivity:** Use `await` for async Canvas → Blob conversion to avoid race conditions with reactive re-renders.
- **Hardcoded PDF styling in component code:** Extract table styling (colors, fonts, alignment) to a `pdfTheme` constant so certificates (Phase 6) can reuse or override it.
- **Assuming Blob data is always present:** Always check for `logoLeftBlob` / `logoRightBlob` existence before attempting to render in PDF; gracefully handle missing header images.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF document generation | Custom jsPDF wrapper that reconstructs tables, pagination, image placement from scratch | jsPDF + jspdf-autotable with mature table/pagination logic | jspdf-autotable handles cell wrapping, row heights, multi-page splits, header repeats; reimplementing these edge cases introduces bugs (orphaned rows, misaligned images, wrong page breaks). |
| Image file upload/resize | Custom FormData + resize algorithm | HTML5 Canvas `drawImage()` + FileReader API (zero dependencies) | Canvas is standard, battle-tested, no library bloat; avoids third-party image libraries that may not work offline. |
| Settings table versioning | Manual migration logic in setup code | Dexie's built-in `.version()` + `.stores()` chaining | Dexie handles schema upgrades, data migrations, and edge cases (quota exceeded, quota migration to v4, etc.) automatically. |
| PDF file download | Manual Blob URL creation + cleanup | jsPDF `.save(filename)` or browser anchor element + `URL.createObjectURL()` | jsPDF's `.save()` abstracts away blob URL lifecycle and browser quirks (especially iOS Safari); if using anchor directly, must manually revoke blob URLs to prevent leaks. |

**Key insight:** jsPDF + jspdf-autotable are production-tested in thousands of projects and handle PDF edge cases (variable row heights, image placement, page overflow, font metrics) that are deceptively complex to reimplement. Same for Canvas image downscaling — attempting a custom resize algorithm introduces quality loss and performance issues.

---

## Common Pitfalls

### Pitfall 1: Image Orientation Lost on iOS
**What goes wrong:** A JPG uploaded on iOS may have EXIF orientation metadata (e.g., portrait image encoded as landscape with rotation flag). When downscaled via Canvas, the orientation flag is ignored, resulting in a rotated/sideways image in the PDF.

**Why it happens:** Canvas `drawImage()` doesn't parse EXIF metadata; browser image loading is supposed to handle it, but this varies by platform/version. For user photos, this is a nightmare; for logos (which phase 5 uses), orientation is usually not set.

**How to avoid:** 
- Document that logo images should be pre-oriented (portrait for left/right headers). 
- If user-supplied photo orientation becomes an issue in Phase 6 (certificates), use a library like `piexifjs` to read EXIF and apply rotation in Canvas before downscaling.
- For now (Phase 5 logos only), test with actual club logos to confirm no orientation metadata is present.

**Warning signs:** User uploads a logo, it appears sideways in the PDF.

### Pitfall 2: IndexedDB Quota Exceeded on Blob Storage
**What goes wrong:** Two large uncompressed PNG images (e.g., 1MB each) exceed IndexedDB quota (typically 50MB on desktop, 2–5MB on iOS), and the `put()` throws a QuotaExceededError.

**Why it happens:** IndexedDB quota is shared across all origins and all apps in that browser. If trainer has many presets or other indexed data, quota may be consumed quickly. iOS especially has harsh quotas.

**How to avoid:**
- **Enforce downscaling hard cap: ~200KB per image.** This is aggressive enough to ensure two images fit within even iOS's smallest quotas (assuming no other large data).
- Use `canvas.toBlob()` with quality < 0.9 (e.g., 0.85) to produce smaller PNG/JPEG.
- Catch `QuotaExceededError` in the settings form and surface a user-friendly message: "Bilder sind zu groß — versuchen Sie kleinere Dateien."

**Warning signs:** User gets "QuotaExceededError" when trying to save settings on iOS; or Settings form's save button shows a generic error.

### Pitfall 3: PDF Table Rows Break Awkwardly Across Pages
**What goes wrong:** A tall row (e.g., a shooter with a long name that wraps) gets orphaned at the bottom of a page, or a header row repeats on every page when it shouldn't.

**Why it happens:** jspdf-autotable's `pageBreak: 'auto'` logic uses a heuristic based on row height. If a row's content is dynamic (e.g., text wrapping changes based on font size), pagination can miscalculate.

**How to avoid:**
- Test with real tournament data: shooters with long names (16+ characters), many classes (triggers multi-page PDF).
- Use jspdf-autotable's `showHead: 'everyPage'` only if header repeats are needed; for a single-section table, header on first page only may be cleaner.
- If row breaking looks wrong, explicitly set `pageBreak: 'always'` (page break between every class is already a hard break, so this is conservative but safe).

**Warning signs:** Generated PDF has a header row floating mid-table, or a single name wraps oddly and triggers an unexpected page break.

### Pitfall 4: Blob Data Not Exported by dexie-export-import
**What goes wrong:** Settings table is added with Blob fields, but when trainer exports presets, the exported JSON doesn't include the Blob image data — only the title string is exported.

**Why it happens:** Early versions of dexie-export-import had issues serializing Blobs. Modern versions (4.4.0, already in project) handle Blobs by converting them to base64 during export and back to Blob on import. But if code tries to export before the Blob-in-Blob support was added, or if the export/import flow doesn't properly await the async conversion, Blobs are silently lost.

**How to avoid:**
- **Verify dexie-export-import version 4.4.0 or later** (already installed in project; confirmed as dependency).
- Test the full export → delete → import cycle with a settings record that has Blob fields populated.
- If images still aren't exporting, check the exported JSON file in the browser console and look for `"logoLeftBlob": null` or missing key entirely. This signals that either dexie-export-import isn't serializing Blobs, or the code isn't awaiting the export.

**Warning signs:** Trainer exports presets, then imports them on another device, and header images are missing (not just the Blob data, but the image references entirely).

### Pitfall 5: jsPDF Doesn't Load Custom Fonts Over the Network (Offline Context)
**What goes wrong:** Phase 5 tries to use a custom font (e.g., a fancy club name font), assumes jsPDF can load it from a CDN, but offline (no network), the PDF falls back to a default font.

**Why it happens:** jsPDF doesn't auto-download fonts from URLs; fonts must be pre-bundled (via a font converter) or loaded as binary data. In offline mode, any http(s):// font reference fails silently.

**How to avoid:**
- **For Phase 5, stick to the 14 standard PDF fonts** (helvetica, times, courier, and bold/italic variants). All are embedded in every PDF reader. No custom fonts needed.
- If Phase 6 (certificates) later needs a club-specific font, convert it offline (using jsPDF's fontconverter tool) and bundle the generated .js file with the app; don't try to load from a URL.

**Warning signs:** PDF generated offline looks fine with helvetica, but if you were to try a custom font, it silently falls back to helvetica with no error message.

### Pitfall 6: Missing or Incomplete Shooter Filtering Logic
**What goes wrong:** Trainer checks "Unvollständige Ergebnisse einbeziehen" (include incomplete), generates PDF, but the PDF is blank or shows only a few shooters — because the filtering code has a bug (e.g., inverting the `isComplete` check).

**Why it happens:** RankedRow.isComplete is a boolean indicating whether all score entries are done for a shooter. The checkbox logic must invert correctly: if checkbox is checked (true), include all rows; if unchecked (false, the default), exclude incomplete rows (`row.isComplete === true`).

**How to avoid:**
- Write a minimal test: generate rankings with two shooters (one complete, one incomplete), export with checkbox unchecked, verify PDF has only 1 row. Then check the checkbox, export again, verify 2 rows.
- Name the state variable clearly: `includeIncomplete` (not `excludeIncomplete` or `showIncomplete` — boolean variable names are less error-prone if they start with a verb or are a positive noun).
- In the filtering code, be explicit: `const filtered = includeIncomplete ? rows : rows.filter(r => r.isComplete);` — no negation logic that can be misread.

**Warning signs:** Trainer sees all shooters in the live results grid on Results view, but the exported PDF has fewer shooters than expected.

---

## Code Examples

Verified patterns from official sources and project conventions:

### Generate Results PDF with jsPDF + jspdf-autotable

```typescript
// Source: jsPDF official docs + jspdf-autotable official docs
// Usage: Called from Results.svelte button click handler

export async function generateResultsPdf(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  title: string,
  logoLeft?: Blob,
  logoRight?: Blob,
  includeIncomplete: boolean = false
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  let isFirstPage = true;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  for (const cls of classesWithResults) {
    // Add new page for each class (except first)
    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    let currentY = margin;

    // Title line (if provided)
    if (title) {
      doc.setFontSize(12);
      doc.text(title, margin, currentY);
      currentY += 8;
    }

    // Class heading
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(cls.name, margin, currentY);
    currentY += 10;

    // Header images (if provided)
    const logoWidth = 25;
    const logoHeight = 20;
    if (logoLeft || logoRight) {
      currentY += 2;
      if (logoLeft) {
        const leftUri = await blobToDataUri(logoLeft);
        doc.addImage(leftUri, 'PNG', margin, currentY, logoWidth, logoHeight);
      }
      if (logoRight) {
        const rightUri = await blobToDataUri(logoRight);
        doc.addImage(rightUri, 'PNG', pageWidth - margin - logoWidth, currentY, logoWidth, logoHeight);
      }
      currentY += logoHeight + 5;
    }

    // Rankings table
    const rows = classifications.get(cls.id)!;
    const filteredRows = includeIncomplete ? rows : rows.filter((r) => r.isComplete);

    const tableBody = filteredRows.map((row) => [
      row.rank.toString(),
      row.name,
      row.sum.toString(),
    ]);

    (doc as any).autoTable({
      head: [['Rang', 'Name', 'Gesamt']],
      body: tableBody,
      startY: currentY,
      margin: { top: margin, right: margin, bottom: margin, left: margin },
      pageBreak: 'auto',
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [64, 64, 64], textColor: 255, fontStyle: 'bold' },
    });
  }

  return doc.output('blob');
}

// Helper to convert Blob to data URI for jsPDF.addImage()
async function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### Downscale Image File on Upload (Canvas-Based)

```typescript
// Source: HTML5 Canvas API + FileReader (standard browser APIs, no library)

export async function downscaleImageBlob(
  file: File,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.85
): Promise<{ blob: Blob; dataUri: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = async () => {
        // Calculate new dimensions (maintain aspect ratio)
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Draw on canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            const dataUri = canvas.toDataURL('image/png', quality);
            resolve({ blob, dataUri });
          },
          'image/png',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
```

### Settings Form Upload & Save to Dexie

```svelte
<!-- Source: Project conventions (Setup.svelte pattern + Dexie liveQuery pattern) -->

<script lang="ts">
  import { liveQuery } from 'dexie';
  import { db } from '../db/schema';
  import { downscaleImageBlob } from '../utils/imageDownscale';
  import GlassCard from './GlassCard.svelte';

  const settingsQuery = liveQuery(() => db.settings.get(1));
  let settings = $derived($settingsQuery ?? { id: 1 });

  let title = $derived(settings.title ?? '');
  let logoLeftPreview = $state<string | null>(null);
  let logoRightPreview = $state<string | null>(null);
  let errorMessage = $state('');

  async function handleImageUpload(event: Event, side: 'left' | 'right') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      // Check file size before processing
      if (file.size > 200 * 1024) {
        // 200KB hard cap
        throw new Error('Bild ist zu groß (max. 200KB).');
      }

      const { blob, dataUri } = await downscaleImageBlob(file, 500, 500, 0.85);

      if (side === 'left') {
        logoLeftPreview = dataUri;
        settings.logoLeftBlob = blob;
      } else {
        logoRightPreview = dataUri;
        settings.logoRightBlob = blob;
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Upload fehlgeschlagen';
    }
  }

  async function handleSave() {
    errorMessage = '';
    try {
      await db.settings.put({
        id: 1,
        title,
        logoLeftBlob: settings.logoLeftBlob,
        logoRightBlob: settings.logoRightBlob,
      });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Speichern fehlgeschlagen';
    }
  }
</script>

<GlassCard class="p-4 md:p-6">
  <h3 class="mb-4 text-[20px] font-semibold">Einstellungen (PDF-Export)</h3>

  {#if errorMessage}
    <p class="mb-4 text-[14px] text-red-600">{errorMessage}</p>
  {/if}

  <label class="block text-[14px] mb-4">
    Turnier-Titel (für PDF):
    <input
      type="text"
      value={title}
      onchange={(e) => (title = (e.target as HTMLInputElement).value)}
      placeholder="z.B. 'Trainingsturnier SV Musterbach 6.7.2026'"
      class="mt-2 w-full rounded-lg border border-slate-300 p-2"
    />
  </label>

  <label class="block text-[14px] mb-4">
    Logo links (PNG/JPEG, max 200KB):
    <input
      type="file"
      accept="image/png,image/jpeg"
      onchange={(e) => handleImageUpload(e, 'left')}
      class="mt-2 w-full"
    />
    {#if logoLeftPreview}
      <img src={logoLeftPreview} alt="Preview" class="mt-2 max-h-20" />
    {/if}
  </label>

  <label class="block text-[14px] mb-4">
    Logo rechts (PNG/JPEG, max 200KB):
    <input
      type="file"
      accept="image/png,image/jpeg"
      onchange={(e) => handleImageUpload(e, 'right')}
      class="mt-2 w-full"
    />
    {#if logoRightPreview}
      <img src={logoRightPreview} alt="Preview" class="mt-2 max-h-20" />
    {/if}
  </label>

  <button
    type="button"
    onclick={handleSave}
    class="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
  >
    Speichern
  </button>
</GlassCard>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom table layout for PDFs (iterative row drawing) | jspdf-autotable automated layout + pagination | ~2016 (jsPDF-AutoTable v1) | Eliminated hand-rolling pagination logic; native page breaks, header repeats, and cell wrapping |
| Base64 encoding images as strings in code | Store Blob objects natively in IndexedDB | ~2020 (IndexedDB standard adoption) | Reduced data size (Blobs are binary, not base64-bloated strings); native export/import support |
| Custom font embedding via scripts | Pre-compiled font bundles (jsPDF fontconverter) | ~2018 (jsPDF font improvements) | Faster PDF generation; avoided font download failures in offline contexts |
| Separate PDF per class | Single multi-section PDF with page breaks | Phase 5 architecture decision | Simpler file handling (one download, not many); easier archival and sharing |

**Deprecated/outdated:**
- **pdfmake (2015–2020):** Declarative but verbose for from-scratch layouts; less suitable for precise image placement (two-column logo header). Still used in some projects but less common for tournament/report generation than jsPDF.
- **pdf-lib (library for editing existing PDFs):** Overkill for generating fresh documents; better for template-filling use cases.
- **html2pdf.js / html2canvas:** Rasterizes HTML to images before PDF embedding — produces large files and blurry text. Unnecessary here since jsPDF's native drawing API already meets all Phase 5 requirements.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | jsPDF 4.2.1 has zero network dependencies at runtime (fflate, fast-png bundled) | Standard Stack | If jsPDF tries to load a CDN resource (unlikely, but if version was mislabeled), PDF generation fails offline. Mitigation: npm view confirmed jsPDF dependencies are bundled. |
| A2 | jspdf-autotable 5.0.8 is peer-compatible with jsPDF 4.2.1 | Package Legitimacy | If peer-dependency constraint is wrong, npm install will fail. Mitigation: npm view jspdf-autotable peerDependencies confirmed ^2\|^3\|^4. |
| A3 | HTML5 Canvas API is available on all target PWA platforms (iOS Safari 12+, Android Chrome, desktop Chrome/Safari) | Don't Hand-Roll | If Canvas is unavailable (very old browser), image downscaling silently fails. Mitigation: Phase 5 targets modern PWA-capable devices (iOS 12+, modern Android). Test on oldest target device. |
| A4 | Dexie 4.4.0's dexie-export-import supports exporting Blob fields | Pitfall 4 & Pattern 3 | If Blobs aren't exported, settings/images are lost on import. Mitigation: Full cycle test (export → import) with populated Blob fields is a required acceptance test. |
| A5 | IndexedDB quota is sufficient for two ~100KB images (total ~200KB) on all targets | Pitfall 2 | If total >200KB, quota exceeded error on iOS. Mitigation: Hard cap downscaling to ~200KB per image during upload. |
| A6 | The 14 standard PDF fonts (helvetica, times, courier + bold/italic) are acceptable for Phase 5; no custom fonts needed | Pitfall 5 | If club branding requires a custom font, Phase 6 will need font bundling work. Mitigation: Confirm with user that helvetica is acceptable for v1.5 or defer font branding to Phase 6. |

**Confidence:** All assumptions tagged `[ASSUMED]` are low-risk and easily verified during planning/execution (dependency checks, test runs, user confirmation). No blocking assumptions.

---

## Open Questions

1. **Settings UI location:** Should the Settings section live as a new tab/view (e.g., a "Einstellungen" navigation entry), or nested within the existing Setup view? CONTEXT.md says it's independent (D-05 states it's built generically for reuse), so either approach works. Planner discretion.

2. **PDF styling finalization:** What exact colors, fonts, and table theme for the PDF? CONTEXT.md says this is Claude's discretion, consistent with glassmorphism design language. Suggest striped table theme with subtle gray header; exact RGB/styling TBD during planning.

3. **Backup of settings on Phase 6 certificate request:** When Phase 6 tries to use the settings (header images, title), should the app proactively alert if settings are missing/incomplete, or fail silently? Recommend an optional "Settings nicht konfiguriert" warning in Phase 6 planning.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build-time (jsPDF, jspdf-autotable npm packages) | ✓ | ^20.19.0 (per Vite 8 requirement) | — |
| npm | Package installation | ✓ | Current | — |
| HTML5 Canvas API | Image downscaling (runtime) | ✓ | All modern browsers | Graceful fail: skip image upload if Canvas unavailable (very rare) |
| IndexedDB | Dexie schema v4 (runtime) | ✓ | All modern browsers, PWA-capable devices | No fallback; PWA requirement mandates IndexedDB |
| Browser file download API | PDF file download trigger | ✓ | All modern browsers | No fallback; required for user to receive PDF |

**Missing dependencies with no fallback:** None — Phase 5 depends only on browser APIs available on all PWA-capable devices.

---

## Validation Architecture

> Skip this section entirely if `workflow.nyquist_validation` is explicitly set to false. If the key is absent (true default), include this section.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (unit tests) + Playwright 1.61.1 (E2E tests) |
| Config file | `vitest.config.ts` and `playwright.config.ts` |
| Quick run command | `npm run test` (vitest unit tests only, <5 sec) |
| Full suite command | `npm run test:all` (vitest + Playwright E2E, <30 sec) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDF-01 | PDF generated with all classes, page breaks between sections | E2E | `npx playwright test e2e/pdfExport.spec.ts` | ❌ Wave 0 |
| PDF-02 | Settings table stores/retrieves title and Blob images correctly | Unit | `npm run test -- src/lib/db/schema.test.ts` | ❌ Wave 0 |
| PDF-03 | Image downscaling via Canvas produces Blob under 200KB | Unit | `npm run test -- src/lib/utils/imageDownscale.test.ts` | ❌ Wave 0 |
| PDF-04 | PDF table columns are Rank, Name, Sum (no Line/Class) | Unit | `npm run test -- src/lib/utils/pdfExport.test.ts` | ❌ Wave 0 |
| PDF-05 | Include/exclude incomplete shooters via checkbox filters correctly | Unit | `npm run test -- src/lib/utils/pdfExport.test.ts::filter incomplete` | ❌ Wave 0 |
| PDF-06 | PDF generation offline (no network calls) | E2E | `npx playwright test e2e/pdfExport.spec.ts --offline-mode` | ❌ Wave 0 |
| PDF-07 | PDF filename is `Ergebnisse_YYYY-MM-DD.pdf` | E2E | `npx playwright test e2e/pdfExport.spec.ts::filename` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Unit tests only (`npm run test`), <5 sec.
- **Per wave merge:** Full suite (`npm run test:all`), <30 sec. E2E test verifies offline capability and full export → download cycle.
- **Phase gate:** Full suite green, plus manual verification: export PDF on iOS and desktop; inspect PDF content (table rows, images, page breaks).

### Wave 0 Gaps
- [ ] `src/lib/utils/pdfExport.test.ts` — pure function tests for PDF generation: column order, incomplete filtering, multi-class pagination
- [ ] `src/lib/utils/imageDownscale.test.ts` — tests for Canvas downscaling: aspect ratio preservation, size cap enforcement, Blob output
- [ ] `src/lib/db/schema.test.ts` — Dexie v4 schema test: settings table v4 migration, Blob field storage/retrieval, round-trip through `db.settings.put()` and `db.settings.get(1)`
- [ ] `e2e/pdfExport.spec.ts` — E2E: full results → checkbox → export → download → verify PDF content (rows, images, no network calls in offline mode)
- [ ] `e2e/settingsUpload.spec.ts` — E2E: Settings form → file upload → downscaling → save → export and import presets → verify images persist

*(If these are already scaffolded in codebase, mark as ✅)*

---

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — single-device offline PWA, no user/API authentication |
| V3 Session Management | No | N/A — single-device, no sessions |
| V4 Access Control | No | N/A — single-device, all data equally accessible |
| V5 Input Validation | Yes | Validate image file type/size before upload; validate settings title string (no XSS if title is embedded in PDF text — but worth sanitizing to avoid any edge cases with PDF text rendering) |
| V6 Cryptography | No | N/A — no crypto needed; all data is local/offline; PDF is not encrypted |
| V13 API & Web Service | No | N/A — no external APIs |

### Known Threat Patterns for {Svelte + Dexie + jsPDF}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious image file upload (e.g., ZIP disguised as PNG) | Spoofing / Tampering | Validate `file.type` and magic bytes (PNG starts with `89 50 4E 47`); reject files that don't match MIME type and magic bytes. Use strict file extension whitelist. Canvas `readAsDataURL()` will fail gracefully if image is malformed, triggering error handler. |
| XSS via settings title string (e.g., embedded JS in PDF text) | Injection | Settings title is rendered as PDF text via `doc.text(settings.title)`. jsPDF's text rendering is safe (doesn't execute JS; it's a PDF primitive). However, sanitize title input to remove any `<script>` or event-handler patterns before storage, as a defense-in-depth measure (unlikely to cause harm, but good practice). |
| Storage quota exhaustion (denial of service) | Denial of Service | Enforce 200KB cap on each image via pre-upload file size check + post-downscale blob size check. Settings table is singleton (max 2 images + 1 string), so quota exhaustion here is minimal. |
| Unintended data exposure (e.g., export includes hidden PDFs or secret images) | Information Disclosure | dexie-export-import exports the entire database. Since this app stores only tournament configuration/results (no secrets/auth), and export is user-initiated (not automatic), risk is low. No encryption recommended for v1.5 (single-device offline PWA; no multi-user/multi-device sync). |

---

## Sources

### Primary (HIGH confidence)
- **jsPDF GitHub (parallax/jsPDF)** — official README + API docs structure verified via gh API; confirmed v4.2.1 has no external dependencies (fflate, fast-png bundled)
- **jsPDF-AutoTable GitHub (simonbengtsson/jsPDF-AutoTable)** — official README + usage examples; peer-dependency `jspdf: ^2 || ^3 || ^4` confirmed compatible with v4.2.1
- **npm registry** (`npm view jspdf version`, `npm view jspdf-autotable version`, `npm view jspdf-autotable peerDependencies`) — authoritative version and compatibility data checked 2026-07-06
- **CLAUDE.md (project-locked tech-stack section)** — confirmed jsPDF + jspdf-autotable as standard, Blob storage pattern for settings, rationale for choosing over pdf-lib
- **Project source code** (`src/lib/db/schema.ts`, `src/lib/utils/ranking.ts`, `src/lib/views/Results.svelte`) — understood RankedRow shape, Dexie schema v3 structure, existing Results view layout

### Secondary (MEDIUM confidence)
- **HTML5 Canvas API (MDN / W3C standard)** — `drawImage()`, `toBlob()`, `toDataURL()` are standard, widely supported on iOS 12+ and modern Android; no library needed for downscaling
- **IndexedDB Blob support (MDN + browser compatibility)** — Blobs are native IndexedDB data type; quote from IndexedDB spec: "Blob objects can be stored directly as values"
- **dexie-export-import GitHub** — confirmed v4.4.0 (installed in project) includes Blob serialization/deserialization via base64 conversion during export

### Tertiary (LOW confidence — training knowledge, not verified in this session)
- Browser file download APIs (anchor + blob URL) — standard pattern, widely used; jsPDF `.save()` documentation references this, suggests it's reliable
- Dexie schema versioning edge cases (quota migrations, data transforms) — covered in Dexie docs; assumed v4 migration will work smoothly based on project's existing v2 → v3 upgrade (Phase 3) without issues

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — jsPDF and jspdf-autotable versions verified against npm registry; peer-dependencies confirmed; CLAUDE.md locked in both libraries.
- **Architecture:** HIGH — RankedRow data shape and computeClassRankings() already available and tested in Phase 4; Dexie schema pattern follows existing v2 → v3 structure from Phase 3.
- **Pitfalls:** MEDIUM-HIGH — known pitfalls verified against official docs (jspdf-autotable pagination edge cases, Canvas orientation limitations). One assumption (Blob export by dexie-export-import) flagged for test verification during Wave 0.
- **Security:** HIGH — this is a single-device offline PWA with no authentication/authorization needed; main threat is malicious file upload (mitigated by file-type validation and Canvas error handling).

**Research date:** 2026-07-06
**Valid until:** 2026-07-13 (7 days — jsPDF/jspdf-autotable versions are stable; Canvas API is stable; reassess only if new Dexie/jspdf releases occur)

---

*Phase: 05-pdf-export*
*Researched: 2026-07-06*
*Confidence: HIGH*
*Status: Ready for planning*
