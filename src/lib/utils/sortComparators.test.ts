import { describe, it, expect } from 'vitest';
import {
  compareByLine,
  compareByName,
  compareByClass,
  compareBySum,
  sortRows,
} from './sortComparators';
import type { ScoreRow } from '../components/ScoreTable.svelte';

// Behavior per 03-02-PLAN.md Task 1 <behavior> block (SCORE-04, D-04).
function makeRow(overrides: Partial<ScoreRow>): ScoreRow {
  return {
    shooterId: 1,
    name: 'Anna',
    className: 'RCV-U14',
    line: 1,
    arrows: [],
    sum: 5,
    ...overrides,
  };
}

describe('compareByLine', () => {
  it('sorts a row with line 1 before a row with line 2', () => {
    const a = makeRow({ shooterId: 1, line: 1 });
    const b = makeRow({ shooterId: 2, line: 2 });
    expect(compareByLine(a, b)).toBeLessThan(0);
  });

  it('sorts a row with line null after both assigned-line rows', () => {
    const withLine = makeRow({ shooterId: 1, line: 1 });
    const noLine = makeRow({ shooterId: 2, line: null });
    expect(compareByLine(noLine, withLine)).toBeGreaterThan(0);
  });
});

describe('compareByName', () => {
  it('sorts "Anna" before "Bob" via localeCompare', () => {
    const anna = makeRow({ shooterId: 1, name: 'Anna' });
    const bob = makeRow({ shooterId: 2, name: 'Bob' });
    expect(compareByName(anna, bob)).toBeLessThan(0);
  });
});

describe('compareByClass', () => {
  it('sorts alphabetically by className', () => {
    const a = makeRow({ shooterId: 1, className: 'RCV-U14' });
    const b = makeRow({ shooterId: 2, className: 'RCV-U16' });
    expect(compareByClass(a, b)).toBeLessThan(0);
  });
});

describe('compareBySum', () => {
  it('sorts a row with sum 5 before a row with sum 10', () => {
    const a = makeRow({ shooterId: 1, sum: 5 });
    const b = makeRow({ shooterId: 2, sum: 10 });
    expect(compareBySum(a, b)).toBeLessThan(0);
  });

  it('sorts a row with sum null before any filled sum', () => {
    const incomplete = makeRow({ shooterId: 1, sum: null });
    const filled = makeRow({ shooterId: 2, sum: 5 });
    expect(compareBySum(incomplete, filled)).toBeLessThan(0);
  });
});

describe('sortRows', () => {
  it("reverses the ascending-by-line order when direction is 'desc'", () => {
    const rows = [
      makeRow({ shooterId: 1, line: 1 }),
      makeRow({ shooterId: 2, line: 3 }),
      makeRow({ shooterId: 3, line: 2 }),
    ];

    const result = sortRows(rows, 'line', 'desc');

    expect(result.map((r) => r.line)).toEqual([3, 2, 1]);
  });

  it("places a row with sum null before a row with sum 5 when sorting by 'sum' ascending", () => {
    const rows = [
      makeRow({ shooterId: 1, sum: 5 }),
      makeRow({ shooterId: 2, sum: null }),
    ];

    const result = sortRows(rows, 'sum', 'asc');

    expect(result[0].shooterId).toBe(2);
    expect(result[1].shooterId).toBe(1);
  });
});
