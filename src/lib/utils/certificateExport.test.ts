import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  buildCertPdf,
  certificatePdfFilename,
  generateBulkCerts,
  generateSingleCertPdf,
  zipFilename,
} from './certificateExport';
import type { RankedRow } from './ranking';
import type { ClassRecord } from '../db/schema';

function makeRow(overrides: Partial<RankedRow>): RankedRow {
  return {
    shooterId: 1,
    name: 'Test Schütze',
    line: null,
    sum: 100,
    rank: 1,
    isComplete: true,
    ...overrides,
  };
}

describe('certificatePdfFilename', () => {
  it('formats name+date as Urkunde_<name>_YYYY-MM-DD.pdf', () => {
    expect(certificatePdfFilename('Max Mustermann', new Date('2026-07-06T10:00:00Z'))).toBe(
      'Urkunde_Max Mustermann_2026-07-06.pdf'
    );
  });
});

describe('zipFilename', () => {
  it('formats date as Urkunden_YYYY-MM-DD.zip', () => {
    expect(zipFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Urkunden_2026-07-06.zip');
  });
});

describe('buildCertPdf', () => {
  it('produces a single-page A4 portrait document', async () => {
    const row = makeRow({ name: 'Anna', rank: 1, sum: 280 });
    const doc = await buildCertPdf(row, 'RCV-U14', { id: 1 });
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('renders the configured certificateHeading text', async () => {
    const row = makeRow({ name: 'Anna', rank: 1, sum: 280 });
    const doc = await buildCertPdf(row, 'RCV-U14', { id: 1, certificateHeading: 'Ehrenurkunde' });
    const text = (doc as unknown as { getTextContent?: unknown }).getTextContent;
    // jsPDF doesn't expose rendered text directly in jsdom/node; assert via internal
    // output containing the string instead (jsPDF encodes text streams, but the plain
    // ASCII heading string survives inside the raw doc output for our fixture data).
    void text;
    const output = doc.output();
    expect(typeof output).toBe('string');
    expect(output).toContain('Ehrenurkunde');
  });

  it('falls back to "Urkunde" when certificateHeading is undefined', async () => {
    const row = makeRow({ name: 'Anna', rank: 1, sum: 280 });
    const doc = await buildCertPdf(row, 'RCV-U14', { id: 1 });
    const output = doc.output();
    expect(output).toContain('Urkunde');
  });
});

describe('generateSingleCertPdf', () => {
  it('returns a Blob with type starting with application/pdf', async () => {
    const row = makeRow({ name: 'Anna', rank: 1, sum: 280 });
    const blob = await generateSingleCertPdf(row, 'RCV-U14', { id: 1 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type.startsWith('application/pdf')).toBe(true);
  });
});

describe('generateBulkCerts', () => {
  const classes: ClassRecord[] = [
    { id: 1, name: 'RCV-U14' },
    { id: 2, name: 'RCV-U18' },
  ];

  it('bundles one PDF per shooter across all classes into a ZIP with correctly named files', async () => {
    const classifications = new Map<number, RankedRow[]>([
      [
        1,
        [
          makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1 }),
          makeRow({ shooterId: 2, name: 'Bert', sum: 250, rank: 2 }),
        ],
      ],
      [2, [makeRow({ shooterId: 3, name: 'Clara', sum: 270, rank: 1 })]],
    ]);

    const blob = await generateBulkCerts(classifications, classes, { id: 1 });
    expect(blob).toBeInstanceOf(Blob);

    const zip = await JSZip.loadAsync(blob);
    const filenames = Object.keys(zip.files);
    expect(filenames).toHaveLength(3);
    for (const filename of filenames) {
      expect(filename).toMatch(/^Urkunde_.+_\d{4}-\d{2}-\d{2}\.pdf$/);
    }
  });

  it('includes all shooters in a class with no top-N cutoff', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      makeRow({ shooterId: i + 1, name: `Shooter${i}`, sum: 200 - i, rank: i + 1 })
    );
    const classifications = new Map<number, RankedRow[]>([[1, rows]]);

    const blob = await generateBulkCerts(classifications, [classes[0]], { id: 1 });
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toHaveLength(5);
  });
});
