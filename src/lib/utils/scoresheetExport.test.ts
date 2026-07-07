import { describe, expect, it } from 'vitest';
import { buildScoresheetPdfDoc, generateScoresheetPdf, scoresheetPdfFilename } from './scoresheetExport';
import type { RoundConfig } from '../db/schema';

function makeConfig(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    arrowsPerPasse: 3,
    passesPerRound: 10,
    numberOfRounds: 1,
    distance: '18m',
    ...overrides,
  };
}

describe('scoresheetPdfFilename', () => {
  it('formats a fixed date as Schießformular_YYYY-MM-DD.pdf', () => {
    expect(scoresheetPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe(
      'Schießformular_2026-07-06.pdf'
    );
  });
});

describe('generateScoresheetPdf', () => {
  it('produces a Blob with type application/pdf and non-zero size', async () => {
    const blob = await generateScoresheetPdf(makeConfig(), undefined);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('works with settings that have a title but no logos, without crashing', async () => {
    const blob = await generateScoresheetPdf(makeConfig(), { title: 'Trainingsturnier' });
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe('buildScoresheetPdfDoc', () => {
  it('produces a single-page A5 portrait document', async () => {
    const doc = await buildScoresheetPdfDoc(makeConfig(), undefined);
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('produces a single page for a small rounds config', async () => {
    const doc = await buildScoresheetPdfDoc(
      makeConfig({ numberOfRounds: 1, passesPerRound: 10, arrowsPerPasse: 3 }),
      undefined
    );
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('produces a single page for a larger rounds config', async () => {
    const doc = await buildScoresheetPdfDoc(
      makeConfig({ numberOfRounds: 2, passesPerRound: 5, arrowsPerPasse: 4 }),
      undefined
    );
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('renders the Passe/Ringe/Summe Zeile/Summe gesamt column headers', async () => {
    const doc = await buildScoresheetPdfDoc(makeConfig(), undefined);
    const output = doc.output();
    expect(output).toContain('Passe');
    expect(output).toContain('Ringe');
    expect(output).toContain('Summe Zeile');
    expect(output).toContain('Summe gesamt');
  });

  it('omits the Runde field when there is only one round', async () => {
    const doc = await buildScoresheetPdfDoc(makeConfig({ numberOfRounds: 1 }), undefined);
    const output = doc.output();
    expect(output).not.toContain('Runde:');
  });

  it('includes the Runde field when there is more than one round', async () => {
    const doc = await buildScoresheetPdfDoc(makeConfig({ numberOfRounds: 2 }), undefined);
    const output = doc.output();
    expect(output).toContain('Runde:');
  });
});
