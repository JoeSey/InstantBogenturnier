import { describe, it, expect } from 'vitest';
import { buildScoringContext, isTournamentComplete } from './scoringContext';
import { defaultRoundRuleset } from './threeDScoring';
import type { RoundConfig, ScoreRecord, ScoreValue } from '../db/schema';

function rec(
  shooterId: number,
  roundIndex: number,
  passeIndex: number,
  arrowIndex: number,
  value: ScoreValue
): ScoreRecord {
  return { shooterId, roundIndex, passeIndex, arrowIndex, value, finalized: false };
}

function ringsConfig(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return { id: 1, arrowsPerPasse: 3, passesPerRound: 2, numberOfRounds: 1, ...overrides };
}

function threeDConfig(overrides: Partial<RoundConfig> = {}): RoundConfig {
  return {
    id: 1,
    arrowsPerPasse: 1,
    passesPerRound: 2,
    numberOfRounds: 2,
    scoringMode: '3d',
    roundRulesets: [defaultRoundRuleset('dfbv-3arrow'), defaultRoundRuleset('dfbv-hunter')],
    ...overrides,
  };
}

describe('buildScoringContext — rings mode', () => {
  it('scores ring values exactly like arrowScoreValue (X=10 default, X=5 when rings:5)', () => {
    const ten = buildScoringContext(ringsConfig());
    expect(ten.mode).toBe('rings');
    expect(ten.pointsFor(rec(1, 0, 0, 0, 'X'))).toBe(10);
    expect(ten.pointsFor(rec(1, 0, 0, 0, 'M'))).toBe(0);
    expect(ten.pointsFor(rec(1, 0, 0, 0, '7'))).toBe(7);

    const five = buildScoringContext(ringsConfig({ rings: 5 }));
    expect(five.pointsFor(rec(1, 0, 0, 0, 'X'))).toBe(5);
  });

  it('has an empty tie-break and entriesExpected = arrowsPerPasse', () => {
    const ctx = buildScoringContext(ringsConfig({ arrowsPerPasse: 6 }));
    expect(ctx.tieBreakLabels).toEqual([]);
    expect(ctx.tieBreakCounts([rec(1, 0, 0, 0, '10')])).toEqual([]);
    expect(ctx.entriesExpected(0)).toBe(6);
  });
});

describe('buildScoringContext — 3d mode', () => {
  const ctx = buildScoringContext(threeDConfig());

  it('looks up points from the per-round ruleset', () => {
    expect(ctx.mode).toBe('3d');
    expect(ctx.pointsFor(rec(1, 0, 0, 0, 'V2'))).toBe(12); // round 0 = dfbv-3arrow
    expect(ctx.pointsFor(rec(1, 1, 0, 0, 'W1'))).toBe(16); // round 1 = dfbv-hunter
    expect(ctx.pointsFor(rec(1, 0, 0, 0, 'M'))).toBe(0);
  });

  it('scores 0 for a round with no configured ruleset', () => {
    expect(ctx.pointsFor(rec(1, 5, 0, 0, 'K1'))).toBe(0);
  });

  it('exposes Kill/Vital/Wound tie-break labels and counts them across all rounds', () => {
    expect(ctx.tieBreakLabels).toEqual(['Kill', 'Vital', 'Wound']);
    const records = [
      rec(1, 0, 0, 0, 'K1'),
      rec(1, 0, 1, 0, 'V1'),
      rec(1, 1, 0, 0, 'V2'),
      rec(1, 1, 1, 0, 'W3'),
      rec(1, 0, 0, 0, 'M'),
    ];
    expect(ctx.tieBreakCounts(records)).toEqual([1, 2, 1]);
  });

  it('entriesExpected is the round ruleset entriesPerTarget (1 for both DFBV templates)', () => {
    expect(ctx.entriesExpected(0)).toBe(1);
    expect(ctx.entriesExpected(1)).toBe(1);
  });

  it('degrades safely when roundRulesets is absent', () => {
    const bare = buildScoringContext(threeDConfig({ roundRulesets: undefined }));
    expect(bare.pointsFor(rec(1, 0, 0, 0, 'K1'))).toBe(0);
    expect(bare.tieBreakLabels).toEqual([]);
    expect(bare.entriesExpected(0)).toBe(1);
  });
});

describe('isTournamentComplete', () => {
  it('rings mode delegates to the per-arrow check', () => {
    const config = ringsConfig({ arrowsPerPasse: 2, passesPerRound: 1, numberOfRounds: 1 });
    const full = [rec(1, 0, 0, 0, '9'), rec(1, 0, 0, 1, '9')];
    expect(isTournamentComplete([1], config, full)).toBe(true);
    expect(isTournamentComplete([1], config, full.slice(0, 1))).toBe(false);
  });

  it('3d mode needs one entry per (shooter, round, station)', () => {
    const config = threeDConfig(); // 2 rounds × 2 stations = 4 entries per shooter
    const full = [
      rec(1, 0, 0, 0, 'K1'),
      rec(1, 0, 1, 0, 'M'),
      rec(1, 1, 0, 0, 'V1'),
      rec(1, 1, 1, 0, 'W1'),
    ];
    expect(isTournamentComplete([1], config, full)).toBe(true);
    expect(isTournamentComplete([1], config, full.slice(0, 3))).toBe(false);
    expect(isTournamentComplete([1, 2], config, full)).toBe(false); // shooter 2 has nothing
  });

  it('is vacuously true with no shooters', () => {
    expect(isTournamentComplete([], threeDConfig(), [])).toBe(true);
  });
});
