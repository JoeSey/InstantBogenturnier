import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { containFit } from './pdfExport';
import type { RankedRow } from './ranking';
import type { ClassRecord, SettingsRecord } from '../db/schema';

// Pure certificate generation (D-01, D-03 through D-08, 06-RESEARCH.md): framework-free,
// no side effects, no Svelte dependency — mirrors pdfExport.ts's and ranking.ts's
// pure-function style. Reuses Phase 5's containFit() logo scaling and header layout
// (see buildResultsPdfDoc in pdfExport.ts) rather than reimplementing it.

export function certificatePdfFilename(shooterName: string, date: Date = new Date()): string {
  return `Urkunde_${shooterName}_${date.toISOString().split('T')[0]}.pdf`;
}

export function zipFilename(date: Date = new Date()): string {
  return `Urkunden_${date.toISOString().split('T')[0]}.zip`;
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const LOGO_MAX_WIDTH = 25;
const LOGO_MAX_HEIGHT = 20;

export async function buildCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
  const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;

  const cursorY = 20;

  // Header section — reuse Phase 5's header rendering (title top-left, logos left/right,
  // same containFit() aspect-ratio handling), per 06-UI-SPEC.md's Certificate Content
  // Structure section 1.
  if (settings?.title) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(settings.title, 20, cursorY);
  }

  if (logoLeftData) {
    const { width: natWidth, height: natHeight } = doc.getImageProperties(logoLeftData);
    const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    doc.addImage(logoLeftData, 'PNG', 20, cursorY, width, height);
  }
  if (logoRightData) {
    const { width: natWidth, height: natHeight } = doc.getImageProperties(logoRightData);
    const { width, height } = containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    doc.addImage(logoRightData, 'PNG', doc.internal.pageSize.getWidth() - 20 - width, cursorY, width, height);
  }

  const pageCenterX = doc.internal.pageSize.getWidth() / 2;

  // Certificate heading — 06-UI-SPEC.md section 2.
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.certificateHeading ?? 'Urkunde', pageCenterX, 60, { align: 'center' });

  // Shooter details — 06-UI-SPEC.md section 3.
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(rankedRow.name, pageCenterX, 85, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Klasse: ${className}`, pageCenterX, 93, { align: 'center' });
  doc.text(`Platzierung: ${rankedRow.rank}`, pageCenterX, 101, { align: 'center' });
  doc.text(`Punkte: ${rankedRow.sum}`, pageCenterX, 109, { align: 'center' });

  return doc;
}

export async function generateSingleCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined
): Promise<Blob> {
  const doc = await buildCertPdf(rankedRow, className, settings);
  return doc.output('blob');
}

export async function generateBulkCerts(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined
): Promise<Blob> {
  const zip = new JSZip();

  // Same alphabetical-by-name ordering as buildResultsPdfDoc (D-04 consistency).
  const classesWithResults = classes
    .filter((cls) => cls.id !== undefined && classifications.has(cls.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const cls of classesWithResults) {
    const rows = classifications.get(cls.id!) ?? [];
    // No top-N cutoff (D-01) — every shooter in the class gets a certificate.
    for (const row of rows) {
      const doc = await buildCertPdf(row, cls.name, settings);
      // Use 'arraybuffer' rather than a Blob here — JSZip's internal FileReader-based
      // Blob handling in a jsdom/vitest test environment cannot reliably read Blobs
      // originating from a different Blob global than jsdom's own, since jsPDF/Node
      // construct their own Blob instances. ArrayBuffer sidesteps that cross-realm
      // interop issue entirely and works identically in real browsers.
      const arrayBuffer = doc.output('arraybuffer');
      zip.file(certificatePdfFilename(row.name), arrayBuffer);
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
