import { describe, it, expect } from 'vitest';
import {
  computeShooterSum,
  computeShooterRoundSums,
  computeShooterHitCounts,
  isShooterComplete,
  computeClassRankings,
} from './ranking';
import { buildScoringContext } from './scoringContext';
import { defaultRoundRuleset } from './threeDScoring';
import type { ClassRecord, RoundConfig, ScoreRecord, ShooterRecord } from '../db/schema';

function record(
  shooterId: number,
  roundIndex: number,
  passeIndex: number,
  arrowIndex: number,
  value: ScoreRecord['value'] = '8'
): ScoreRecord {
  return { shooterId, roundIndex, passeIndex, arrowIndex, value, finalized: false };
}

function shooter(id: number, name: string, classId: number, lineAssignment: number | null = null): ShooterRecord {
  return { id, name, classId, lineAssignment };
}

function roundsConfig(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    arrowsPerPasse: 1,
    passesPerRound: 1,
    numberOfRounds: 1,
    distance: '18m',
    ...overrides,
  };
}

// Behavior per 04-01-PLAN.md Task 1 <behavior> block (RES-01, RES-02, D-02).
describe('computeShooterSum', () => {
  it('sums only the given shooter\'s scores, treating M as 0 and X as 10', () => {
    const scores = [
      record(1, 0, 0, 0, '8'),
      record(1, 0, 0, 1, 'M'),
      record(1, 0, 0, 2, 'X'),
      record(2, 0, 0, 0, '10'),
    ];
    expect(computeShooterSum(1, scores)).toBe(18);
  });

  // Pitfall 2 regression fixture: a 2-round tournament's sum must reflect BOTH rounds,
  // not just round 0 — computeShooterSum filters by shooterId only, never scoped to a
  // single round/passe.
  it('reflects arrows from every round, not just the first', () => {
    const scores = [
      record(1, 0, 0, 0, '9'),
      record(1, 0, 0, 1, '9'),
      record(1, 1, 0, 0, '7'),
      record(1, 1, 0, 1, '7'),
    ];
    expect(computeShooterSum(1, scores)).toBe(32);
  });

  it('returns 0 for a shooter with no recorded scores', () => {
    expect(computeShooterSum(1, [])).toBe(0);
  });

  // Phase 9 (TARGET-09): rings-aware sum — X must resolve to 5, not 10, under a
  // 5-ring config.
  it('sums X as 5 points when rings=5 is passed', () => {
    const scores = [record(1, 0, 0, 0, 'X'), record(1, 0, 0, 1, '5')];
    expect(computeShooterSum(1, scores, 5)).toBe(10);
  });
});

describe('computeShooterRoundSums', () => {
  // Phase 9 (TARGET-09): rings-aware round sums.
  it('reflects a 5-point X value in the correct round bucket when rings=5', () => {
    const scores = [record(1, 0, 0, 0, 'X'), record(1, 1, 0, 0, '7')];
    expect(computeShooterRoundSums(1, 2, scores, 5)).toEqual([5, 7]);
  });
});

describe('computeShooterHitCounts', () => {
  it('returns count5, count4to1, and countM alongside countX/count10/count9', () => {
    const scores = [
      record(1, 0, 0, 0, 'X'),
      record(1, 0, 0, 1, '10'),
      record(1, 0, 0, 2, '9'),
      record(1, 0, 0, 3, '5'),
      record(1, 0, 0, 4, '4'),
      record(1, 0, 0, 5, '3'),
      record(1, 0, 0, 6, '2'),
      record(1, 0, 0, 7, '1'),
      record(1, 0, 0, 8, 'M'),
    ];
    expect(computeShooterHitCounts(1, scores)).toEqual({
      countX: 1,
      count10: 1,
      count9: 1,
      count5: 1,
      count4to1: 4,
      countM: 1,
    });
  });
});

describe('isShooterComplete', () => {
  it('is true once every configured round/passe/arrow is filled for that shooter', () => {
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 2 });
    const scores = [record(1, 0, 0, 0), record(1, 0, 0, 1)];
    expect(isShooterComplete(1, config, scores)).toBe(true);
  });

  it('is false when an arrow is missing', () => {
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 2 });
    const scores = [record(1, 0, 0, 0)];
    expect(isShooterComplete(1, config, scores)).toBe(false);
  });
});

describe('computeClassRankings', () => {
  it('returns an empty Map immediately when roundsConfig is undefined', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
    expect(computeClassRankings(shooters, classes, [], undefined).size).toBe(0);
  });

  // Mandatory fixture: 4-shooter, 2-way tie for rank 2 -> ranks must be exactly
  // [1, 2, 2, 4] (never [1, 2, 2, 3] — Pitfall 1).
  it('assigns shared/skip-next ranks for a 4-shooter, 2-way tie at rank 2', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
    const shooters: ShooterRecord[] = [
      shooter(1, 'Anna', 1),
      shooter(2, 'Bob', 1),
      shooter(3, 'Cara', 1),
      shooter(4, 'Dirk', 1),
    ];
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 1 });
    const scores = [
      record(1, 0, 0, 0, '10'), // Anna: 10 -> rank 1
      record(2, 0, 0, 0, '8'), // Bob: 8 -> tied rank 2
      record(3, 0, 0, 0, '8'), // Cara: 8 -> tied rank 2
      record(4, 0, 0, 0, '5'), // Dirk: 5 -> rank 4 (skips 3)
    ];

    const rankings = computeClassRankings(shooters, classes, scores, config);
    const rows = rankings.get(1)!;
    const ranksByName = new Map(rows.map((r) => [r.name, r.rank]));

    expect(ranksByName.get('Anna')).toBe(1);
    expect(ranksByName.get('Bob')).toBe(2);
    expect(ranksByName.get('Cara')).toBe(2);
    expect(ranksByName.get('Dirk')).toBe(4);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  // Cross-round-sum fixture: total must reflect arrows from both configured rounds.
  it('sums across all configured rounds when ranking, not just round 0', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
    const config = roundsConfig({ numberOfRounds: 2, passesPerRound: 1, arrowsPerPasse: 1 });
    const scores = [record(1, 0, 0, 0, '9'), record(1, 1, 0, 0, '7')];

    const rankings = computeClassRankings(shooters, classes, scores, config);
    const rows = rankings.get(1)!;
    expect(rows[0].sum).toBe(16);
  });

  // Every shooter appears regardless of isComplete (D-02) — no separate in-progress
  // bucket.
  it('includes every shooter even when none have completed all their arrows', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1), shooter(2, 'Bob', 1)];
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 2 });
    const scores = [record(1, 0, 0, 0, '8'), record(2, 0, 0, 0, '5')];

    const rankings = computeClassRankings(shooters, classes, scores, config);
    const rows = rankings.get(1)!;

    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.isComplete === false)).toBe(true);
  });

  // Phase 9 (TARGET-09): end-to-end proof at the ranking layer that a 5-ring
  // roundsConfig resolves X to 5 points, not 10.
  it('produces sums reflecting 5-point X values when roundsConfig.rings is 5', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'DFBV-Klasse' }];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 2, rings: 5 });
    const scores = [record(1, 0, 0, 0, 'X'), record(1, 0, 0, 1, '5')];

    const rankings = computeClassRankings(shooters, classes, scores, config);
    const rows = rankings.get(1)!;
    expect(rows[0].sum).toBe(10);
  });

  // Regression guard: 10-ring (or rings-undefined) behavior is unchanged.
  it('produces sums reflecting 10-point X values when roundsConfig.rings is undefined (10-ring default)', () => {
    const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
    const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 2 });
    const scores = [record(1, 0, 0, 0, 'X'), record(1, 0, 0, 1, '5')];

    const rankings = computeClassRankings(shooters, classes, scores, config);
    const rows = rankings.get(1)!;
    expect(rows[0].sum).toBe(15);
  });

  it('omits a class with 0 registered shooters from the returned Map entirely', () => {
    const classes: ClassRecord[] = [
      { id: 1, name: 'RCV-U14' },
      { id: 2, name: 'RCV-U16' },
    ];
    const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
    const config = roundsConfig();

    const rankings = computeClassRankings(shooters, classes, [], config);

    expect(rankings.has(1)).toBe(true);
    expect(rankings.has(2)).toBe(false);
  });

  // v2 (3D milestone) slice 2 — ranking in 3d mode: sums come from the per-round
  // ruleset, ties break on Kill count then Vital count.
  describe('3d scoringMode', () => {
    function threeDConfig(): RoundConfig {
      return {
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 3,
        numberOfRounds: 1,
        scoringMode: '3d',
        roundRulesets: [defaultRoundRuleset('dfbv-3arrow')],
      };
    }

    it('sums targets via the round ruleset and exposes the Kill/Vital/Wound vector', () => {
      const classes: ClassRecord[] = [{ id: 1, name: 'Blank' }];
      const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
      // K1 (20) + V2 (12) + M (0) = 32
      const scores = [record(1, 0, 0, 0, 'K1'), record(1, 0, 1, 0, 'V2'), record(1, 0, 2, 0, 'M')];

      const rows = computeClassRankings(shooters, classes, scores, threeDConfig()).get(1)!;
      expect(rows[0].sum).toBe(32);
      expect(rows[0].tieBreakCounts).toEqual([1, 1, 0]);
      expect(rows[0].isComplete).toBe(true);
    });

    it('assigns shared/skip-next ranks when score AND zone counts are identical', () => {
      const classes: ClassRecord[] = [{ id: 1, name: 'Blank' }];
      const shooters: ShooterRecord[] = [
        shooter(1, 'Anna', 1),
        shooter(2, 'Bea', 1),
        shooter(3, 'Cara', 1),
      ];
      const scores = [
        // Anna: K1(20) K1(20) M = 40, kills 2
        record(1, 0, 0, 0, 'K1'),
        record(1, 0, 1, 0, 'K1'),
        record(1, 0, 2, 0, 'M'),
        // Bea:  K1(20) V1(18) M = 38, kills 1, vitals 1
        record(2, 0, 0, 0, 'K1'),
        record(2, 0, 1, 0, 'V1'),
        record(2, 0, 2, 0, 'M'),
        // Cara: K1(20) V1(18) M = 38, kills 1, vitals 1  (identical key to Bea)
        record(3, 0, 0, 0, 'K1'),
        record(3, 0, 1, 0, 'V1'),
        record(3, 0, 2, 0, 'M'),
      ];

      const rows = computeClassRankings(shooters, classes, scores, threeDConfig()).get(1)!;
      const byName = new Map(rows.map((r) => [r.name, r.rank]));
      expect(byName.get('Anna')).toBe(1);
      expect(byName.get('Bea')).toBe(2);
      expect(byName.get('Cara')).toBe(2);
      expect(rows.map((r) => r.rank)).toEqual([1, 2, 2]);
    });

    it('a higher Kill count outranks an equal-score shooter with fewer kills', () => {
      const classes: ClassRecord[] = [{ id: 1, name: 'Blank' }];
      const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1), shooter(2, 'Bea', 1)];
      const scores = [
        // Anna: V1(18) V1(18) M = 36, kills 0, vitals 2
        record(1, 0, 0, 0, 'V1'),
        record(1, 0, 1, 0, 'V1'),
        record(1, 0, 2, 0, 'M'),
        // Bea: K1(20) V2(12) W3(4) = 36, kills 1
        record(2, 0, 0, 0, 'K1'),
        record(2, 0, 1, 0, 'V2'),
        record(2, 0, 2, 0, 'W3'),
      ];

      const rows = computeClassRankings(shooters, classes, scores, threeDConfig()).get(1)!;
      const byName = new Map(rows.map((r) => [r.name, r]));
      expect(byName.get('Anna')!.sum).toBe(36);
      expect(byName.get('Bea')!.sum).toBe(36);
      expect(byName.get('Bea')!.rank).toBe(1); // 1 kill beats 0 kills at equal score
      expect(byName.get('Anna')!.rank).toBe(2);
    });

    it('rings-mode ranking still carries an empty tie-break vector', () => {
      const classes: ClassRecord[] = [{ id: 1, name: 'RCV-U14' }];
      const shooters: ShooterRecord[] = [shooter(1, 'Anna', 1)];
      const config = roundsConfig({ numberOfRounds: 1, passesPerRound: 1, arrowsPerPasse: 1 });
      const rows = computeClassRankings(shooters, classes, [record(1, 0, 0, 0, '8')], config).get(1)!;
      expect(rows[0].tieBreakCounts).toEqual([]);
    });

    it('buildScoringContext labels match the tie-break vector order', () => {
      const ctx = buildScoringContext(threeDConfig());
      expect(ctx.tieBreakLabels).toEqual(['Kill', 'Vital', 'Wound']);
    });
  });
});
