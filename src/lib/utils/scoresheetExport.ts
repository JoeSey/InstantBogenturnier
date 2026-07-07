import { jsPDF } from 'jspdf';
import { containFit } from './pdfExport';
import type { RoundConfig, SettingsRecord } from '../db/schema';

// Pure scoresheet PDF generation (Phase 7, SHEET-01 through SHEET-07): framework-free,
// no side effects, no Svelte/IndexedDB dependency — mirrors pdfExport.ts's and
// certificateExport.ts's builder/generator split so this module is directly
// unit-testable via Vitest without any DOM/Dexie involvement. Unlike the results-list
// and certificate PDFs, this is a BLANK grid (no shooter/score data) sized to the
// current rounds/passes/arrows config, printed A5 portrait for a single physical copy
// per export (the trainer prints multiple copies via their own printer's copy count).

export function scoresheetPdfFilename(date: Date = new Date()): string {
  return `Schießformular_${date.toISOString().split('T')[0]}.pdf`;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Scaled down proportionally from pdfExport.ts's 25mm/20mm A4 header logos to suit
// A5's smaller page (148x210mm vs A4's 210x297mm).
const LOGO_MAX_WIDTH = 18;
const LOGO_MAX_HEIGHT = 14;

const MARGIN = 15;

export async function buildScoresheetPdfDoc(
  roundsConfig: RoundConfig,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
  const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;

  let cursorY = MARGIN;

  // Header — reuses the Settings title + logo treatment (SHEET-07), scaled for A5.
  if (settings?.title || logoLeftData || logoRightData) {
    let tallestLogoHeight = 0;

    if (logoLeftData) {
      const { width: natWidth, height: natHeight } = doc.getImageProperties(logoLeftData);
      const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
      doc.addImage(logoLeftData, 'PNG', MARGIN, cursorY, width, height);
      tallestLogoHeight = Math.max(tallestLogoHeight, height);
    }
    if (logoRightData) {
      const { width: natWidth, height: natHeight } = doc.getImageProperties(logoRightData);
      const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
      doc.addImage(logoRightData, 'PNG', pageWidth - MARGIN - width, cursorY, width, height);
      tallestLogoHeight = Math.max(tallestLogoHeight, height);
    }

    if (settings?.title) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.title, pageWidth / 2, cursorY + tallestLogoHeight / 2 + 2, {
        align: 'center',
      });
    }

    cursorY += Math.max(tallestLogoHeight, settings?.title ? 8 : 0) + 6;
  }

  // Handwriting header fields (SHEET-03) — single column layout to avoid overflow on
  // A5's narrow 148mm width with the margins above.
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const fieldLabels = ['Name:', 'Klasse:', 'Schießplatz:', 'Schreiber:'];
  const fieldLabelWidth = 24;
  for (const label of fieldLabels) {
    doc.text(label, MARGIN, cursorY);
    doc.line(MARGIN + fieldLabelWidth, cursorY, pageWidth - MARGIN, cursorY);
    cursorY += 7;
  }

  cursorY += 4;

  // Footer signature lines (SHEET-06) — reserved from the bottom of the page so the
  // grid above never overlaps them.
  const FOOTER_HEIGHT = 20;
  const gridBottom = pageHeight - MARGIN - FOOTER_HEIGHT;
  const gridTop = cursorY;
  const availableHeight = gridBottom - gridTop;

  // Grid (SHEET-02) — numberOfRounds rounds, each with passesPerRound passes, each with
  // arrowsPerPasse arrow cells. Rows are round/pass labels down the left; when there are
  // many passes, lay multiple passes out per row (side-by-side) so the whole grid keeps
  // within the vertical budget computed above rather than overflowing to page 2.
  const { numberOfRounds, passesPerRound, arrowsPerPasse } = roundsConfig;
  const totalPasses = numberOfRounds * passesPerRound;

  const labelColWidth = 18;
  const availableWidth = pageWidth - 2 * MARGIN - labelColWidth;
  const minCellWidth = 6;
  const maxPassesPerRow = Math.max(1, Math.floor(availableWidth / (arrowsPerPasse * minCellWidth)));

  // Choose the number of passes-per-row (grouping) so total rows fit within the
  // available height, without exceeding what fits horizontally.
  let passesPerRow = Math.min(maxPassesPerRow, totalPasses);
  let totalGridRows = Math.ceil(totalPasses / passesPerRow);
  const minRowHeight = 5;
  while (passesPerRow < totalPasses && totalGridRows * minRowHeight > availableHeight) {
    passesPerRow += 1;
    totalGridRows = Math.ceil(totalPasses / passesPerRow);
  }

  const cellWidth = availableWidth / (passesPerRow * arrowsPerPasse);
  const rowHeight = Math.min(availableHeight / totalGridRows, 10);

  doc.setFontSize(7);
  let gridY = gridTop;
  let passIndexGlobal = 0;

  for (let round = 0; round < numberOfRounds; round++) {
    for (let pass = 0; pass < passesPerRound; pass++) {
      const rowInGroup = passIndexGlobal % passesPerRow;
      if (rowInGroup === 0) {
        gridY += round === 0 && pass === 0 ? 0 : rowHeight;
      }

      const rowX = MARGIN + labelColWidth + rowInGroup * arrowsPerPasse * cellWidth;

      if (rowInGroup === 0) {
        doc.text(`R${round + 1} P${pass + 1}`, MARGIN, gridY + rowHeight / 2 + 1);
      }

      for (let arrow = 0; arrow < arrowsPerPasse; arrow++) {
        doc.rect(rowX + arrow * cellWidth, gridY, cellWidth, rowHeight);
      }

      passIndexGlobal += 1;
    }
  }

  // Footer signature lines (SHEET-06).
  const footerY = pageHeight - MARGIN - 6;
  const sigWidth = (pageWidth - 2 * MARGIN - 10) / 2;
  doc.setFontSize(8);
  doc.line(MARGIN, footerY, MARGIN + sigWidth, footerY);
  doc.text('Unterschrift Schütze', MARGIN + sigWidth / 2, footerY + 4, { align: 'center' });

  doc.line(pageWidth - MARGIN - sigWidth, footerY, pageWidth - MARGIN, footerY);
  doc.text('Unterschrift Schreiber', pageWidth - MARGIN - sigWidth / 2, footerY + 4, {
    align: 'center',
  });

  return doc;
}

export async function generateScoresheetPdf(
  roundsConfig: RoundConfig,
  settings: Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob'> | undefined
): Promise<Blob> {
  const doc = await buildScoresheetPdfDoc(roundsConfig, settings);
  return doc.output('blob');
}
