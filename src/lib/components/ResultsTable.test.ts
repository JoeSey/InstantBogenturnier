import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ResultsTable from './ResultsTable.svelte';
import type { RankedRow } from '../utils/ranking';
import { strings } from '../i18n/strings.de';

function row(overrides: Partial<RankedRow> = {}): RankedRow {
  return {
    shooterId: 1,
    name: 'Anna',
    line: 1,
    sum: 100,
    rank: 1,
    isComplete: true,
    ...overrides,
  };
}

// Behavior per 04-01-PLAN.md Task 2 <acceptance_criteria> block.
describe('ResultsTable', () => {
  it('renders all 4 column headers with the exact German copy', () => {
    render(ResultsTable, { props: { rows: [], oncertexport: () => {} } });

    expect(screen.getByText(strings.results.columnRank)).not.toBeNull();
    expect(screen.getByText(strings.results.columnName)).not.toBeNull();
    expect(screen.getByText(strings.results.columnLine)).not.toBeNull();
    expect(screen.getByText(strings.results.columnTotal)).not.toBeNull();
  });

  it('renders podium badge classes for ranks 1-3 and plain text for rank 4', () => {
    const rows: RankedRow[] = [
      row({ shooterId: 1, name: 'Anna', rank: 1, sum: 100 }),
      row({ shooterId: 2, name: 'Bob', rank: 2, sum: 90 }),
      row({ shooterId: 3, name: 'Cara', rank: 3, sum: 80 }),
      row({ shooterId: 4, name: 'Dirk', rank: 4, sum: 70 }),
    ];

    const { container } = render(ResultsTable, { props: { rows, oncertexport: () => {} } });

    const rank1Badge = screen.getByLabelText('Rang 1');
    expect(rank1Badge.className).toContain('bg-amber-100');
    expect(rank1Badge.className).toContain('dark:bg-amber-900/50');

    const rank2Badge = screen.getByLabelText('Rang 2');
    expect(rank2Badge.className).toContain('bg-slate-200');

    const rank3Badge = screen.getByLabelText('Rang 3');
    expect(rank3Badge.className).toContain('bg-orange-100');

    const rank4Cell = screen.getByLabelText('Rang 4');
    expect(rank4Cell.tagName).toBe('SPAN');
    expect(rank4Cell.className).toBe('');

    // No sort buttons in the header row (fixed order, no sort).
    const headerRow = container.querySelector('thead tr');
    expect(headerRow?.querySelectorAll('button').length ?? 0).toBe(0);
  });

  it('renders the in-progress marker and sr-only aria text for an incomplete row', () => {
    const rows: RankedRow[] = [row({ isComplete: false, sum: 42 })];

    render(ResultsTable, { props: { rows, oncertexport: () => {} } });

    const gesamtCell = screen.getByText('42').closest('td') as HTMLElement;
    expect(gesamtCell.textContent).toContain('*');
    expect(screen.getByText(strings.results.inProgressAria)).not.toBeNull();
  });

  it('only shows the legend line when at least one row is incomplete', () => {
    const { rerender } = render(ResultsTable, {
      props: { rows: [row({ isComplete: true })], oncertexport: () => {} },
    });
    expect(screen.queryByText(strings.results.inProgressLegend)).toBeNull();

    rerender({ rows: [row({ isComplete: false })] });
    expect(screen.getByText(strings.results.inProgressLegend)).not.toBeNull();
  });

  it('has no onclick sort handlers in the header row', () => {
    const { container } = render(ResultsTable, { props: { rows: [row()], oncertexport: () => {} } });
    const headerButtons = container.querySelectorAll('thead button');
    expect(headerButtons.length).toBe(0);
  });

  // v2 (3D milestone) slice 5 — tie-break count columns.
  it('renders no tie-break columns by default', () => {
    const { container } = render(ResultsTable, {
      props: { rows: [row()], oncertexport: () => {} },
    });
    // Rang, Name, Schießplatz, Gesamt, Urkunde
    expect(container.querySelectorAll('thead th')).toHaveLength(5);
  });

  it('renders one count column per tieBreakLabel, reading row.tieBreakCounts', () => {
    const rows: RankedRow[] = [
      row({ shooterId: 1, name: 'Anna', rank: 1, sum: 40, tieBreakCounts: [2, 1, 0] }),
      row({ shooterId: 2, name: 'Bea', rank: 2, sum: 38, tieBreakCounts: [1, 1, 1] }),
    ];
    const { container } = render(ResultsTable, {
      props: { rows, oncertexport: () => {}, tieBreakLabels: ['Kill', 'Vital', 'Wound'] },
    });

    const headers = Array.from(container.querySelectorAll('thead th')).map((h) => h.textContent?.trim());
    expect(headers).toEqual([
      strings.results.columnRank,
      strings.results.columnName,
      strings.results.columnLine,
      strings.results.columnTotal,
      'Kill',
      'Vital',
      'Wound',
      strings.results.columnCertificate,
    ]);

    const annaCells = Array.from(
      container.querySelectorAll('tbody tr')[0].querySelectorAll('td')
    ).map((c) => c.textContent?.trim());
    // Rang, Name, Linie, Gesamt(40), Kill(2), Vital(1), Wound(0), Urkunde-button
    expect(annaCells.slice(4, 7)).toEqual(['2', '1', '0']);
  });

  it('shows 0 in a tie-break column when a row has no tieBreakCounts', () => {
    const { container } = render(ResultsTable, {
      props: {
        rows: [row({ tieBreakCounts: undefined })],
        oncertexport: () => {},
        tieBreakLabels: ['Kill', 'Vital', 'Wound'],
      },
    });
    const cells = Array.from(container.querySelectorAll('tbody td')).map((c) => c.textContent?.trim());
    expect(cells.slice(4, 7)).toEqual(['0', '0', '0']);
  });
});
