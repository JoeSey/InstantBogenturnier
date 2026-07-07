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

const LOGO_MAX_WIDTH = 40;
const LOGO_MAX_HEIGHT = 35;
const LOGO_GAP = 10;

interface CertLine {
  text: string;
  size: number;
  bold: boolean;
}

export async function buildCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined,
  now: Date = new Date()
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageCenterX = doc.internal.pageSize.getWidth() / 2;

  const logoLeftData = settings?.logoLeftBlob ? await blobToDataUri(settings.logoLeftBlob) : undefined;
  const logoRightData = settings?.logoRightBlob ? await blobToDataUri(settings.logoRightBlob) : undefined;

  // Header — both logos centered together at the top (not left/right corners), and
  // bigger than the original results-list header treatment. Revised post-ship per
  // user feedback: a real club certificate places one centered emblem block, not
  // side-mounted decoration, so we group left+right logos side by side and center
  // the pair rather than pinning them to the page margins (06-CONTEXT.md D-05
  // originally called for margin placement; superseded by this cosmetic pass).
  const logos: { data: string; width: number; height: number }[] = [];
  for (const logoData of [logoLeftData, logoRightData]) {
    if (!logoData) continue;
    const { width: natWidth, height: natHeight } = doc.getImageProperties(logoData);
    logos.push({ data: logoData, ...containFit(natWidth, natHeight, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT) });
  }
  if (logos.length > 0) {
    const totalWidth = logos.reduce((sum, l) => sum + l.width, 0) + (logos.length - 1) * LOGO_GAP;
    let x = pageCenterX - totalWidth / 2;
    const logoTop = 15;
    for (const logo of logos) {
      doc.addImage(logo.data, 'PNG', x, logoTop, logo.width, logo.height);
      x += logo.width + LOGO_GAP;
    }
  }

  // Certificate heading — 06-UI-SPEC.md section 2.
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.certificateHeading ?? 'Urkunde', pageCenterX, 70, { align: 'center' });

  // Body — alternating small connector lines and bold value lines, spread down the
  // page for an "authentic" printed-certificate look (user feedback), mirroring the
  // connector/value rhythm of a real club certificate rather than a dense stat block.
  const lines: CertLine[] = [{ text: rankedRow.name, size: 22, bold: true }];
  if (settings?.title) {
    lines.push(
      { text: 'belegte beim', size: 12, bold: false },
      { text: settings.title, size: 18, bold: true }
    );
  } else {
    lines.push({ text: 'belegte', size: 12, bold: false });
  }
  lines.push(
    { text: 'am', size: 12, bold: false },
    {
      text: now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      size: 14,
      bold: true,
    },
    { text: 'in der Klasse', size: 12, bold: false },
    { text: className, size: 18, bold: true },
    { text: 'mit', size: 12, bold: false },
    { text: `${rankedRow.sum} Punkten`, size: 16, bold: true },
    { text: 'den', size: 12, bold: false },
    { text: `${rankedRow.rank}. Platz`, size: 24, bold: true }
  );

  let cursorY = 100;
  for (const line of lines) {
    doc.setFontSize(line.size);
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.text(line.text, pageCenterX, cursorY, { align: 'center' });
    cursorY += line.bold ? 14 : 10;
  }

  return doc;
}

export async function generateSingleCertPdf(
  rankedRow: RankedRow,
  className: string,
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined,
  now: Date = new Date()
): Promise<Blob> {
  const doc = await buildCertPdf(rankedRow, className, settings, now);
  return doc.output('blob');
}

export async function generateBulkCerts(
  classifications: Map<number, RankedRow[]>,
  classes: ClassRecord[],
  settings:
    | Pick<SettingsRecord, 'title' | 'logoLeftBlob' | 'logoRightBlob' | 'certificateHeading'>
    | undefined,
  now: Date = new Date()
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
      const doc = await buildCertPdf(row, cls.name, settings, now);
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
