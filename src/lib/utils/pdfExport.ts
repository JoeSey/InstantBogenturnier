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

    let imageY = cursorY + 5;
    if (logoLeftData) {
      doc.addImage(logoLeftData, 'PNG', 20, imageY, 25, 20);
    }
    if (logoRightData) {
      doc.addImage(logoRightData, 'PNG', doc.internal.pageSize.getWidth() - 50, imageY, 25, 20);
    }
    if (logoLeftData || logoRightData) {
      imageY += 20;
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
