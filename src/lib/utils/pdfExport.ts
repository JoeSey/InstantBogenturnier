import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RankedRow } from './ranking';
import type { ClassRecord, SettingsRecord } from '../db/schema';

// Pure PDF generation (PDF-01/04/05/07, 05-RESEARCH.md Pattern 1): framework-free,
// no side effects, no Svelte dependency — mirrors ranking.ts's pure-function style so
// it stays reusable (Phase 6 certificates, a future v2 endpoint) without rewriting.

export function resultsPdfFilename(date: Date = new Date()): string {
  return `Ergebnisse_${date.toISOString().split('T')[0]}.pdf`;
}

// Exported independently of generateResultsPdf so the include-incomplete filtering
// (PDF-05, D-09) and the exact 3-column shape (PDF-04) are unit-testable without
// invoking jsPDF/autoTable at all.
export function buildClassTableRows(rows: RankedRow[], includeIncomplete: boolean): string[][] {
  return rows
    .filter((row) => includeIncomplete || row.isComplete)
    .map((row) => [row.rank.toString(), row.name, row.sum.toString()]);
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 05-03 gap closure (WR-02): downscaleImageBlob() preserves the source logo's aspect
// ratio, but the PDF previously drew every logo into a hard-coded 25x20mm (1.25:1)
// box, stretching/squashing any logo whose aspect ratio differs. containFit() scales
// the natural width/height down to fit within the box without distortion — mirroring
// CSS `object-fit: contain` — so non-1.25:1 logos (square crests, wide banners) render
// at the correct proportions instead of being stretched.
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

// Exported separately from generateResultsPdf so tests can assert on
// doc.getNumberOfPages() directly, without round-tripping through a Blob.
export async function buildResultsPdfDoc(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined,
  includeIncomplete: boolean
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // D-04 ordering — same alphabetical-by-name order as Results.svelte's
  // classesWithResults, so the PDF section order matches what the trainer sees on screen.
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
  const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;

  let isFirstClass = true;

  for (const cls of classesWithResults) {
    if (!isFirstClass) {
      doc.addPage(); // D-01: page break before every class except the first
    }
    isFirstClass = false;

    let cursorY = 20;

    if (settings?.title) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.title, 20, cursorY);
      cursorY += 10;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(cls.name, 20, cursorY);

    const LOGO_MAX_WIDTH = 25;
    const LOGO_MAX_HEIGHT = 20;

    let imageY = cursorY + 5;
    let tallestLogoHeight = 0;

    if (logoLeftData) {
      const { width: natWidth, height: natHeight } = doc.getImageProperties(logoLeftData);
      const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
      doc.addImage(logoLeftData, 'PNG', 20, imageY, width, height);
      tallestLogoHeight = Math.max(tallestLogoHeight, height);
    }
    if (logoRightData) {
      const { width: natWidth, height: natHeight } = doc.getImageProperties(logoRightData);
      const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
      doc.addImage(
        logoRightData,
        'PNG',
        doc.internal.pageSize.getWidth() - 20 - width,
        imageY,
        width,
        height
      );
      tallestLogoHeight = Math.max(tallestLogoHeight, height);
    }
    if (logoLeftData || logoRightData) {
      imageY += tallestLogoHeight;
    } else {
      imageY = cursorY + 5;
    }

    const rows = classifications.get(cls.id!) ?? [];
    const body = buildClassTableRows(rows, includeIncomplete);

    autoTable(doc, {
      head: [['Rang', 'Name', 'Gesamt']],
      body,
      startY: imageY + 5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      theme: 'striped',
      styles: { fontSize: 10, halign: 'left' },
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontStyle: 'bold' },
    });
  }

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
