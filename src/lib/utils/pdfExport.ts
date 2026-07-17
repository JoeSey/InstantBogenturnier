import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RankedRow } from './ranking';
import type { ClassRecord, RoundConfig, SettingsRecord } from '../db/schema';
import { expandClassName } from './classNameGenerator';

// Pure PDF generation (PDF-01/04/05/07, 05-RESEARCH.md Pattern 1): framework-free,
// no side effects, no Svelte dependency — mirrors ranking.ts's pure-function style so
// it stays reusable (Phase 6 certificates, a future v2 endpoint) without rewriting.

export function resultsPdfFilename(date: Date = new Date()): string {
  return `Ergebnisse_${date.toISOString().split('T')[0]}.pdf`;
}

// Exported independently of generateResultsPdf so the include-incomplete filtering
// (PDF-05, D-09) and the exact 3-column shape (PDF-04) are unit-testable without
// invoking jsPDF/autoTable at all.
export function buildClassTableRows(
  rows: RankedRow[],
  includeIncomplete: boolean,
  numberOfRounds: number,
  rings: 10 | 5 = 10
): string[][] {
  return rows
    .filter((row) => includeIncomplete || row.isComplete)
    .map((row) => [
      row.rank.toString(),
      row.name,
      ...(numberOfRounds > 1 ? row.roundSums.map((s) => s.toString()) : []),
      rings === 5
        ? `${row.countX + row.count5}/${row.count4to1}/${row.countM}`
        : `${row.countX}/${row.count10}/${row.count9}`,
      row.sum.toString(),
    ]);
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
  settings: Pick<SettingsRecord, 'title' | 'logoLeftDataUri' | 'logoRightDataUri'> | undefined,
  includeIncomplete: boolean,
  roundsConfig?: Pick<RoundConfig, 'numberOfRounds' | 'rings'>
): Promise<jsPDF> {
  const numberOfRounds = roundsConfig?.numberOfRounds ?? 1;
  const rings = roundsConfig?.rings ?? 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // D-04 ordering — same alphabetical-by-name order as Results.svelte's
  // classesWithResults, so the PDF section order matches what the trainer sees on screen.
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const logoLeftData = settings?.logoLeftDataUri;
  const logoRightData = settings?.logoRightDataUri;

  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const BOTTOM_MARGIN = 20;
  const CLASS_GAP = 10; // vertical gap between two classes sharing the same page
  const ROW_HEIGHT_ESTIMATE = 7; // mm — fontSize 10 + jspdf-autotable's default cellPadding
  const MIN_ROWS_TO_KEEP_TOGETHER = 3; // avoid orphaning a heading with almost no table below it

  const LOGO_MAX_WIDTH = 25;
  const LOGO_MAX_HEIGHT = 20;

  let cursorY = 20;

  // Document-level header (title + logos) rendered once at the top of page 1 only —
  // not repeated per class. Title is bold and larger than the per-class headings so
  // it reads as the document's title, not another section heading.
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
      doc.addImage(
        logoRightData,
        'PNG',
        doc.internal.pageSize.getWidth() - 20 - width,
        cursorY,
        width,
        height
      );
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

  let isFirstClass = true;

  for (const cls of classesWithResults) {
    const rows = classifications.get(cls.id!) ?? [];
    const body = buildClassTableRows(rows, includeIncomplete, numberOfRounds, rings);

    // No unconditional page break between classes — result blocks share a page when
    // they fit. Only force a break when the estimated block height (heading + table
    // header + a few data rows) wouldn't fit in the remaining space, which would
    // otherwise tear the block apart mid-table.
    const estimatedHeaderHeight = 10 + 5;
    const estimatedTableHeight = (Math.min(body.length, MIN_ROWS_TO_KEEP_TOGETHER) + 1) * ROW_HEIGHT_ESTIMATE;
    const estimatedBlockHeight = estimatedHeaderHeight + estimatedTableHeight;

    if (!isFirstClass) {
      const remainingSpace = PAGE_HEIGHT - BOTTOM_MARGIN - cursorY;
      if (remainingSpace < estimatedBlockHeight) {
        doc.addPage();
        cursorY = 20;
      } else {
        cursorY += CLASS_GAP;
      }
    }
    isFirstClass = false;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(expandClassName(cls), 20, cursorY);

    const roundHeaders = numberOfRounds > 1
      ? Array.from({ length: numberOfRounds }, (_, i) => `Runde ${i + 1}`)
      : [];
    const head = ['Rang', 'Name', ...roundHeaders, rings === 5 ? 'X+5/4-1/M' : 'X/10/9', 'Gesamt'];
    const gesamtColumnIndex = head.length - 1;

    autoTable(doc, {
      head: [head],
      body,
      startY: cursorY + 5,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      theme: 'striped',
      styles: { fontSize: 10, halign: 'left' },
      headStyles: { fillColor: [100, 100, 100], textColor: 255, fontStyle: 'bold' },
      // Gesamt is always printed bold, in both header and body, per user spec.
      columnStyles: { [gesamtColumnIndex]: { fontStyle: 'bold' } },
    });

    // jspdf-autotable attaches this at runtime; not present in its type definitions.
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  return doc;
}

export async function generateResultsPdf(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings: Pick<SettingsRecord, 'title' | 'logoLeftDataUri' | 'logoRightDataUri'> | undefined,
  includeIncomplete: boolean,
  roundsConfig?: Pick<RoundConfig, 'numberOfRounds' | 'rings'>
): Promise<Blob> {
  const doc = await buildResultsPdfDoc(classifications, classes, settings, includeIncomplete, roundsConfig);
  return doc.output('blob');
}
