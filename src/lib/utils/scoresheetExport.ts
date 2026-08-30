import { jsPDF } from 'jspdf';
import { containFit } from './pdfExport';
import { resolveRuleset, defaultRoundRuleset, type ResolvedRuleset } from './threeDScoring';
import type { RoundConfig, SettingsRecord } from '../db/schema';

// Pure scoresheet PDF generation (Phase 7, SHEET-01 through SHEET-07): framework-free,
// no side effects, no Svelte/IndexedDB dependency — mirrors pdfExport.ts's and
// certificateExport.ts's builder/generator split so this module is directly
// unit-testable via Vitest without any DOM/Dexie involvement. Unlike the results-list
// and certificate PDFs, this is a BLANK grid (no shooter/score data) sized to the
// current rounds/passes/arrows config, printed A5 portrait for a single physical copy
// per export (the trainer prints multiple copies via their own printer's copy count).
//
// v2 (3D milestone): when `scoringMode === '3d'` the sheet is a per-station outcome
// card instead — one A5 page per leg, each with that leg's point-table legend.

type SheetSettings = Pick<SettingsRecord, 'title' | 'logoLeftDataUri' | 'logoRightDataUri'> | undefined;

export function scoresheetPdfFilename(date: Date = new Date()): string {
  return `Schießformular_${date.toISOString().split('T')[0]}.pdf`;
}

// Scaled down proportionally from pdfExport.ts's 25mm/20mm A4 header logos to suit
// A5's smaller page (148x210mm vs A4's 210x297mm).
const LOGO_MAX_WIDTH = 18;
const LOGO_MAX_HEIGHT = 14;

const MARGIN = 15;

// Settings title + logo treatment (SHEET-07), scaled for A5. Returns the y-cursor
// just below the header. Shared by the ring and 3D sheets.
function drawSheetHeader(doc: jsPDF, settings: SheetSettings, pageWidth: number): number {
  let cursorY = MARGIN;
  const logoLeftData = settings?.logoLeftDataUri;
  const logoRightData = settings?.logoRightDataUri;
  if (!settings?.title && !logoLeftData && !logoRightData) return cursorY;

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
    doc.text(settings.title, pageWidth / 2, cursorY + tallestLogoHeight / 2 + 2, { align: 'center' });
  }
  return cursorY + Math.max(tallestLogoHeight, settings?.title ? 8 : 0) + 6;
}

// Footer signature lines (SHEET-06) — reserved from the bottom of the page.
function drawSheetFooter(doc: jsPDF, pageWidth: number, pageHeight: number): void {
  const footerY = pageHeight - MARGIN - 6;
  const sigWidth = (pageWidth - 2 * MARGIN - 10) / 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.line(MARGIN, footerY, MARGIN + sigWidth, footerY);
  doc.text('Unterschrift Schütze', MARGIN + sigWidth / 2, footerY + 4, { align: 'center' });
  doc.line(pageWidth - MARGIN - sigWidth, footerY, pageWidth - MARGIN, footerY);
  doc.text('Unterschrift Schreiber', pageWidth - MARGIN - sigWidth / 2, footerY + 4, {
    align: 'center',
  });
}

export async function buildScoresheetPdfDoc(
  roundsConfig: RoundConfig,
  settings: SheetSettings
): Promise<jsPDF> {
  if (roundsConfig.scoringMode === '3d') {
    return buildThreeDScoresheetDoc(roundsConfig, settings);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let cursorY = drawSheetHeader(doc, settings, pageWidth);

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
      ? ['Schütze:', 'Bogenklasse:', 'Scheibe Nr.:', 'Schreiber:']
      : ['Schütze:', 'Bogenklasse:', 'Scheibe Nr.:', 'Schreiber:', 'Runde:'];
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
  // per round, distinguished by the handwritten "Runde:" field above). Four column
  // groups: Passe (pre-filled 1..passesPerRound so the archer doesn't have to number
  // rows themselves), "Ringe Pfeil Nr." (split into one sub-column per arrow, numbered
  // 1..arrowsPerPasse, so each arrow's ring count gets its own blank cell instead of
  // one ambiguous wide cell), Summe Zeile (blank — end total), Summe gesamt (blank
  // running total). The first row's Summe-gesamt cell is struck through: the running
  // total after end 1 is identical to that end's own total, so a separate write-in
  // there is redundant.
  const { passesPerRound, arrowsPerPasse } = roundsConfig;

  const passeColWidth = 0.16;
  const ringeGroupWidth = 0.4;
  const summeZeileWidth = 0.22;
  const summeGesamtWidth = 0.22;
  const availableWidth = pageWidth - 2 * MARGIN;

  const passeX = MARGIN;
  const passeW = passeColWidth * availableWidth;
  const ringeX = passeX + passeW;
  const ringeW = ringeGroupWidth * availableWidth;
  const summeZeileX = ringeX + ringeW;
  const summeZeileW = summeZeileWidth * availableWidth;
  const summeGesamtX = summeZeileX + summeZeileW;
  const summeGesamtW = summeGesamtWidth * availableWidth;

  const arrowColWidth = ringeW / arrowsPerPasse;

  // Two-row header: an outer group label ("Ringe Pfeil Nr.") spanning the full Ringe
  // width, with a sub-header row underneath numbering each arrow column. The other
  // three column headers (Passe/Summe Zeile/Summe gesamt) span both header rows as a
  // single merged cell so they read as one column, not two stacked ones.
  const groupHeaderHeight = 6;
  const subHeaderHeight = 5;
  const totalHeaderHeight = groupHeaderHeight + subHeaderHeight;
  const rowHeight = Math.min((availableHeight - totalHeaderHeight) / passesPerRound, 10);

  let gridY = gridTop;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  // Passe / Summe Zeile / Summe gesamt — merged cells spanning both header rows.
  doc.rect(passeX, gridY, passeW, totalHeaderHeight);
  doc.text('Passe', passeX + passeW / 2, gridY + totalHeaderHeight / 2 + 1.5, { align: 'center' });

  doc.rect(summeZeileX, gridY, summeZeileW, totalHeaderHeight);
  doc.text('Summe Zeile', summeZeileX + summeZeileW / 2, gridY + totalHeaderHeight / 2 + 1.5, {
    align: 'center',
  });

  doc.rect(summeGesamtX, gridY, summeGesamtW, totalHeaderHeight);
  doc.text('Summe gesamt', summeGesamtX + summeGesamtW / 2, gridY + totalHeaderHeight / 2 + 1.5, {
    align: 'center',
  });

  // Ringe group header row.
  doc.rect(ringeX, gridY, ringeW, groupHeaderHeight);
  doc.text('Ringe Pfeil Nr.', ringeX + ringeW / 2, gridY + groupHeaderHeight / 2 + 1.5, {
    align: 'center',
  });

  // Ringe arrow-number sub-header row.
  const subHeaderY = gridY + groupHeaderHeight;
  for (let arrow = 0; arrow < arrowsPerPasse; arrow++) {
    const x = ringeX + arrow * arrowColWidth;
    doc.rect(x, subHeaderY, arrowColWidth, subHeaderHeight);
    doc.text(String(arrow + 1), x + arrowColWidth / 2, subHeaderY + subHeaderHeight / 2 + 1.5, {
      align: 'center',
    });
  }

  gridY += totalHeaderHeight;

  // Data rows.
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  for (let pass = 0; pass < passesPerRound; pass++) {
    doc.rect(passeX, gridY, passeW, rowHeight);
    doc.text(String(pass + 1), passeX + passeW / 2, gridY + rowHeight / 2 + 1.5, { align: 'center' });

    for (let arrow = 0; arrow < arrowsPerPasse; arrow++) {
      doc.rect(ringeX + arrow * arrowColWidth, gridY, arrowColWidth, rowHeight);
    }

    doc.rect(summeZeileX, gridY, summeZeileW, rowHeight);
    doc.rect(summeGesamtX, gridY, summeGesamtW, rowHeight);

    if (pass === 0) {
      doc.line(summeGesamtX, gridY, summeGesamtX + summeGesamtW, gridY + rowHeight);
      doc.line(summeGesamtX, gridY + rowHeight, summeGesamtX + summeGesamtW, gridY);
    }

    gridY += rowHeight;
  }

  drawSheetFooter(doc, pageWidth, pageHeight);

  return doc;
}

// v2 — blank 3D card, one A5 page per leg. Each page: header, write-in fields, the
// leg ruleset's point-table legend, and a station grid (Ziel | Wertung | Punkte |
// Summe). The scorer writes the zone/ordinal in "Wertung", converts to points via
// the legend, and keeps the running total in "Summe".
async function buildThreeDScoresheetDoc(
  roundsConfig: RoundConfig,
  settings: SheetSettings
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const stored = roundsConfig.roundRulesets ?? [];
  const fallback = Array.from({ length: Math.max(1, roundsConfig.numberOfRounds) }, () =>
    defaultRoundRuleset('dfbv-3arrow')
  );
  const legs: ResolvedRuleset[] = (stored.length ? stored : fallback).map((rr) =>
    resolveRuleset(rr, roundsConfig.threeDZoneLabels)
  );
  const multiLeg = legs.length > 1;

  legs.forEach((rs, legIndex) => {
    if (legIndex > 0) doc.addPage();

    let cursorY = drawSheetHeader(doc, settings, pageWidth);

    // Write-in fields + a pre-filled leg marker when there is more than one leg.
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (multiLeg) {
      doc.text(`Durchgang: ${legIndex + 1} — ${rs.label}`, MARGIN, cursorY);
      cursorY += 7;
    }
    const fieldLabelWidth = 24;
    for (const label of ['Schütze:', 'Bogenklasse:', 'Startnr.:', 'Schreiber:']) {
      doc.text(label, MARGIN, cursorY);
      doc.line(MARGIN + fieldLabelWidth, cursorY, pageWidth - MARGIN, cursorY);
      cursorY += 7;
    }
    cursorY += 3;

    // Point-table legend for this leg — one line per zone, plus the miss value.
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Wertung (Punkte):', MARGIN, cursorY);
    cursorY += 4;
    doc.setFont('helvetica', 'normal');
    for (const zone of rs.zones) {
      const parts = Array.from({ length: rs.maxArrows }, (_, i) => {
        const points = rs.points[`${zone.zone}${i + 1}`] ?? 0;
        return rs.maxArrows > 1 ? `${i + 1}. ${points}` : String(points);
      });
      doc.text(`${zone.label}: ${parts.join('    ')}`, MARGIN + 2, cursorY);
      cursorY += 4;
    }
    doc.text(`Fehlschuss: ${rs.points.M ?? 0}`, MARGIN + 2, cursorY);
    cursorY += 6;

    // Station grid.
    const availableWidth = pageWidth - 2 * MARGIN;
    const zielW = 0.14 * availableWidth;
    const wertungW = 0.4 * availableWidth;
    const punkteW = 0.23 * availableWidth;
    const summeW = 0.23 * availableWidth;
    const zielX = MARGIN;
    const wertungX = zielX + zielW;
    const punkteX = wertungX + wertungW;
    const summeX = punkteX + punkteW;

    const FOOTER_HEIGHT = 20;
    const gridBottom = pageHeight - MARGIN - FOOTER_HEIGHT;
    const headerH = 6;
    const rowH = Math.min(
      (gridBottom - cursorY - headerH) / roundsConfig.passesPerRound,
      9
    );

    let gridY = cursorY;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const cols: [string, number, number][] = [
      ['Ziel', zielX, zielW],
      ['Wertung', wertungX, wertungW],
      ['Punkte', punkteX, punkteW],
      ['Summe', summeX, summeW],
    ];
    for (const [label, x, w] of cols) {
      doc.rect(x, gridY, w, headerH);
      doc.text(label, x + w / 2, gridY + headerH / 2 + 1.5, { align: 'center' });
    }
    gridY += headerH;

    doc.setFont('helvetica', 'normal');
    for (let station = 0; station < roundsConfig.passesPerRound; station++) {
      doc.rect(zielX, gridY, zielW, rowH);
      doc.text(String(station + 1), zielX + zielW / 2, gridY + rowH / 2 + 1.5, { align: 'center' });
      doc.rect(wertungX, gridY, wertungW, rowH);
      doc.rect(punkteX, gridY, punkteW, rowH);
      doc.rect(summeX, gridY, summeW, rowH);
      if (station === 0) {
        doc.line(summeX, gridY, summeX + summeW, gridY + rowH);
        doc.line(summeX, gridY + rowH, summeX + summeW, gridY);
      }
      gridY += rowH;
    }

    drawSheetFooter(doc, pageWidth, pageHeight);
  });

  return doc;
}

export async function generateScoresheetPdf(
  roundsConfig: RoundConfig,
  settings: SheetSettings
): Promise<Blob> {
  const doc = await buildScoresheetPdfDoc(roundsConfig, settings);
  return doc.output('blob');
}
