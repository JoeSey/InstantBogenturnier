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
  // A5's narrow 148mm width with the margins above. One sheet per round is the real
  // tournament convention (the trainer prints this same A5 template once per round,
  // not once for the whole tournament), so a blank "Runde:" field lets the
  // scorekeeper mark which round this physical copy is for. Omitted when there's
  // only one round — nothing to disambiguate, and the field would just be an
  // extra unnecessary write-in step every time.
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const fieldLabels =
    roundsConfig.numberOfRounds === 1
      ? ['Name:', 'Klasse:', 'Schießplatz:', 'Schreiber:']
      : ['Name:', 'Klasse:', 'Schießplatz:', 'Schreiber:', 'Runde:'];
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

  // Grid (SHEET-02) — one row per passe/end for a SINGLE round (real tournament
  // scoresheets are per-round, per-archer; the trainer prints this same sheet once
  // per round, distinguished by the handwritten "Runde:" field above). Four columns:
  // Passe (pre-filled 1..passesPerRound so the archer doesn't have to number rows
  // themselves), Ringe (blank — archer writes each arrow's ring count by hand),
  // Summe Zeile (blank — end total), Summe gesamt (blank running total). The first
  // row's Summe-gesamt cell is struck through: the running total after end 1 is
  // identical to that end's own total, so a separate write-in there is redundant.
  const { passesPerRound } = roundsConfig;

  const columns = [
    { label: 'Passe', width: 0.16 },
    { label: 'Ringe', width: 0.4 },
    { label: 'Summe Zeile', width: 0.22 },
    { label: 'Summe gesamt', width: 0.22 },
  ];
  const availableWidth = pageWidth - 2 * MARGIN;
  const colWidths = columns.map((c) => c.width * availableWidth);
  const colX: number[] = [];
  {
    let x = MARGIN;
    for (const w of colWidths) {
      colX.push(x);
      x += w;
    }
  }

  const headerRowHeight = 6;
  const rowHeight = Math.min((availableHeight - headerRowHeight) / passesPerRound, 10);

  let gridY = gridTop;

  // Header row.
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  columns.forEach((col, i) => {
    doc.rect(colX[i], gridY, colWidths[i], headerRowHeight);
    doc.text(col.label, colX[i] + colWidths[i] / 2, gridY + headerRowHeight / 2 + 1.5, {
      align: 'center',
    });
  });
  gridY += headerRowHeight;

  // Data rows.
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  for (let pass = 0; pass < passesPerRound; pass++) {
    columns.forEach((_, i) => doc.rect(colX[i], gridY, colWidths[i], rowHeight));

    doc.text(String(pass + 1), colX[0] + colWidths[0] / 2, gridY + rowHeight / 2 + 1.5, {
      align: 'center',
    });

    if (pass === 0) {
      const cellX = colX[3];
      const cellW = colWidths[3];
      doc.line(cellX, gridY, cellX + cellW, gridY + rowHeight);
      doc.line(cellX, gridY + rowHeight, cellX + cellW, gridY);
    }

    gridY += rowHeight;
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
