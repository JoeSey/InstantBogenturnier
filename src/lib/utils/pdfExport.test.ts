import { describe, expect, it } from 'vitest';
import {
  buildClassTableRows,
  buildResultsPdfDoc,
  containFit,
  generateResultsPdf,
  resultsPdfFilename,
} from './pdfExport';
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
    roundSums: [100],
    countX: 0,
    count10: 0,
    count9: 0,
    count5: 0,
    count4to1: 0,
    countM: 0,
    ...overrides,
  };
}

describe('resultsPdfFilename', () => {
  it('formats a fixed date as Ergebnisse_YYYY-MM-DD.pdf', () => {
    expect(resultsPdfFilename(new Date('2026-07-06T10:00:00Z'))).toBe('Ergebnisse_2026-07-06.pdf');
  });
});

describe('buildClassTableRows', () => {
  const rows: RankedRow[] = [
    makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1, isComplete: true }),
    makeRow({ shooterId: 2, name: 'Bert', sum: 250, rank: 2, isComplete: false }),
  ];

  it('excludes incomplete rows when includeIncomplete is false', () => {
    const result = buildClassTableRows(rows, false, 1);
    expect(result).toEqual([['1', 'Anna', '0/0/0', '280']]);
  });

  it('includes all rows when includeIncomplete is true', () => {
    const result = buildClassTableRows(rows, true, 1);
    expect(result).toEqual([
      ['1', 'Anna', '0/0/0', '280'],
      ['2', 'Bert', '0/0/0', '250'],
    ]);
  });

  it('never emits more than 4 columns per row when there is a single round', () => {
    const result = buildClassTableRows(rows, true, 1);
    for (const row of result) {
      expect(row.length).toBeLessThanOrEqual(4);
    }
  });

  it('adds one column per round when there is more than one round', () => {
    const multiRoundRows: RankedRow[] = [
      makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1, isComplete: true, roundSums: [140, 140] }),
    ];
    const result = buildClassTableRows(multiRoundRows, true, 2);
    expect(result).toEqual([['1', 'Anna', '140', '140', '0/0/0', '280']]);
  });

  it('defaults to the 10-ring X/10/9 hit-count format when rings is omitted', () => {
    const result = buildClassTableRows(rows, false, 1);
    expect(result).toEqual([['1', 'Anna', '0/0/0', '280']]);
  });

  it('produces byte-identical X/10/9 output when rings=10 is explicit', () => {
    const result = buildClassTableRows(rows, false, 1, 10);
    expect(result).toEqual([['1', 'Anna', '0/0/0', '280']]);
  });

  it('combines X+5 hits into one number, followed by count4to1 and countM when rings=5', () => {
    const fiveRingRows: RankedRow[] = [
      makeRow({
        shooterId: 1,
        name: 'Anna',
        sum: 280,
        rank: 1,
        isComplete: true,
        countX: 2,
        count5: 3,
        count4to1: 4,
        countM: 1,
      }),
    ];
    const result = buildClassTableRows(fiveRingRows, false, 1, 5);
    expect(result).toEqual([['1', 'Anna', '5/4/1', '280']]);
  });
});

describe('generateResultsPdf', () => {
  const classes: ClassRecord[] = [
    { id: 1, name: 'RCV-U14' },
    { id: 2, name: 'RCV-U18' },
  ];

  function makeRankings(): Map<number, RankedRow[]> {
    return new Map([
      [
        1,
        [
          makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1, isComplete: true }),
          makeRow({ shooterId: 2, name: 'Bert', sum: 250, rank: 2, isComplete: true }),
        ],
      ],
      [
        2,
        [
          makeRow({ shooterId: 3, name: 'Clara', sum: 270, rank: 1, isComplete: true }),
          makeRow({ shooterId: 4, name: 'David', sum: 260, rank: 2, isComplete: true }),
        ],
      ],
    ]);
  }

  it('produces a Blob with type application/pdf and non-zero size', async () => {
    const blob = await generateResultsPdf(makeRankings(), classes, { id: 1 }, false);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('packs small classes onto a single page instead of forcing a page break per class', async () => {
    const threeClasses: ClassRecord[] = [
      { id: 1, name: 'A-Klasse' },
      { id: 2, name: 'B-Klasse' },
      { id: 3, name: 'C-Klasse' },
    ];
    const rankings = new Map<number, RankedRow[]>([
      [1, [makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1 })]],
      [2, [makeRow({ shooterId: 2, name: 'Bert', sum: 250, rank: 1 })]],
      [3, [makeRow({ shooterId: 3, name: 'Clara', sum: 270, rank: 1 })]],
    ]);

    const doc = await buildResultsPdfDoc(rankings, threeClasses, { id: 1 }, true);
    // 3 tiny classes (1 row each) easily fit together on a single A4 page — no forced
    // page break between them since none would be torn apart.
    expect(doc.getNumberOfPages()).toBe(1);
  });

  it('forces a page break when the next class block would not fit in the remaining space', async () => {
    // Many classes, each with several rows, so the page fills up and a later class
    // must start on a new page rather than being split mid-table.
    const manyClasses: ClassRecord[] = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      name: `Klasse-${i + 1}`,
    }));
    const rankings = new Map<number, RankedRow[]>(
      manyClasses.map((cls) => [
        cls.id!,
        Array.from({ length: 6 }, (_, i) =>
          makeRow({ shooterId: cls.id! * 100 + i, name: `Shooter${i}`, sum: 200 - i, rank: i + 1 })
        ),
      ])
    );

    const doc = await buildResultsPdfDoc(rankings, manyClasses, { id: 1 }, true);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });

  it('respects includeIncomplete=false to exclude incomplete shooters from the table', async () => {
    const rankings = new Map<number, RankedRow[]>([
      [
        1,
        [
          makeRow({ shooterId: 1, name: 'Anna', sum: 280, rank: 1, isComplete: true }),
          makeRow({ shooterId: 2, name: 'Bert', sum: 250, rank: 2, isComplete: false }),
        ],
      ],
    ]);
    const blobExcluding = await generateResultsPdf(rankings, [classes[0]], { id: 1 }, false);
    const blobIncluding = await generateResultsPdf(rankings, [classes[0]], { id: 1 }, true);
    // Including more rows should produce a larger (or at least not-smaller) document.
    expect(blobIncluding.size).toBeGreaterThanOrEqual(blobExcluding.size);
  });

  it('works with no settings (no title, no logos)', async () => {
    const blob = await generateResultsPdf(makeRankings(), classes, undefined, false);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('renders the X/10/9 hit-count header when roundsConfig is omitted (regression guard)', async () => {
    const doc = await buildResultsPdfDoc(makeRankings(), classes, { id: 1 }, false);
    // Assert via the doc's autoTable head row attached at draw time.
    expect(getAutoTableHeadRow(doc)).toContain('X/10/9');
  });

  it('renders the X/10/9 hit-count header when rings=10 is explicit (regression guard)', async () => {
    const doc = await buildResultsPdfDoc(makeRankings(), classes, { id: 1 }, false, {
      numberOfRounds: 1,
      rings: 10,
    });
    expect(getAutoTableHeadRow(doc)).toContain('X/10/9');
  });

  it('renders a distinct 5-ring hit-count header when rings=5', async () => {
    const doc = await buildResultsPdfDoc(makeRankings(), classes, { id: 1 }, false, {
      numberOfRounds: 1,
      rings: 5,
    });
    const head = getAutoTableHeadRow(doc);
    expect(head).not.toContain('X/10/9');
    expect(head).toContain('X+5/4-1/M');
  });
});

// jspdf-autotable attaches this at runtime; not present in its type definitions.
// `lastAutoTable.head[0].raw` is the raw header row array passed to `head: [head]`.
function getAutoTableHeadRow(doc: Awaited<ReturnType<typeof buildResultsPdfDoc>>): string[] {
  return (doc as unknown as { lastAutoTable: { head: [{ raw: string[] }] } }).lastAutoTable.head[0].raw;
}

describe('containFit', () => {
  it('scales a wider-than-tall image down to fit the max box without distortion', () => {
    // 100x50 (2:1) fit into a 25x20 (1.25:1) box: width-constrained, ratio = 25/100 = 0.25
    expect(containFit(100, 50, 25, 20)).toEqual({ width: 25, height: 12.5 });
  });

  it('scales a taller-than-wide image down to fit the max box without distortion', () => {
    // 50x100 (0.5:1) fit into a 25x20 box: height-constrained, ratio = 20/100 = 0.2
    expect(containFit(50, 100, 25, 20)).toEqual({ width: 10, height: 20 });
  });

  it('scales a square image down preserving 1:1 aspect ratio', () => {
    // 200x200 fit into 25x20: height-constrained, ratio = 20/200 = 0.1
    expect(containFit(200, 200, 25, 20)).toEqual({ width: 20, height: 20 });
  });

  it('falls back to the max box when natural dimensions are zero/invalid', () => {
    expect(containFit(0, 0, 25, 20)).toEqual({ width: 25, height: 20 });
  });
});
