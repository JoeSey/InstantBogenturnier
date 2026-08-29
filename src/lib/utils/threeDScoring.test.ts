import { describe, it, expect } from 'vitest';
import { defaultRoundRuleset, resolveRuleset, scoreTarget, tokenZone } from './threeDScoring';
import { getThreeDTemplate } from '../fixtures/threeDTemplates';
import type { RoundRuleset } from '../db/schema';

describe('tokenZone', () => {
  it('extracts the zone letter of a hit token', () => {
    expect(tokenZone('K1')).toBe('K');
    expect(tokenZone('V3')).toBe('V');
    expect(tokenZone('W2')).toBe('W');
  });

  it('returns null for a miss and for non-3D values', () => {
    expect(tokenZone('M')).toBeNull();
    expect(tokenZone('10')).toBeNull();
    expect(tokenZone('X')).toBeNull();
  });
});

describe('defaultRoundRuleset', () => {
  it('seeds points from the template defaults as an independent copy', () => {
    const rr = defaultRoundRuleset('dfbv-3arrow');
    expect(rr.templateId).toBe('dfbv-3arrow');
    expect(rr.points).toEqual(getThreeDTemplate('dfbv-3arrow').defaultPoints);

    rr.points.K1 = 999;
    expect(getThreeDTemplate('dfbv-3arrow').defaultPoints.K1).toBe(20);
  });
});

describe('resolveRuleset', () => {
  it('with no overrides yields the template default points for every token', () => {
    const rs = resolveRuleset({ templateId: 'dfbv-3arrow', points: {} });
    const t = getThreeDTemplate('dfbv-3arrow');
    for (const token of t.tokens) {
      expect(rs.points[token]).toBe(t.defaultPoints[token]);
    }
    expect(rs.tokens).toEqual(t.tokens);
    expect(rs.zones).toEqual(t.zones);
    expect(rs.tieBreak).toEqual(['K', 'V', 'W']);
    expect(rs.entriesPerTarget).toBe(1);
  });

  it('applies point overrides and leaves the rest at default', () => {
    const rr: RoundRuleset = { templateId: 'dfbv-3arrow', points: { K1: 25, W3: 1 } };
    const rs = resolveRuleset(rr);
    expect(rs.points.K1).toBe(25);
    expect(rs.points.W3).toBe(1);
    expect(rs.points.V2).toBe(12); // untouched default
  });

  it('forces M to 0 even if an override tries to set it', () => {
    const rs = resolveRuleset({ templateId: 'dfbv-hunter', points: { M: 9 } });
    expect(rs.points.M).toBe(0);
  });

  it('falls back to the template default for a token the stored overrides omit', () => {
    const rs = resolveRuleset({
      templateId: 'dfbv-3arrow',
      // K2 deliberately omitted from the stored overrides
      points: { K1: 20, V1: 18, W1: 16, V2: 12, W2: 10, K3: 8, V3: 6, W3: 4, M: 0 },
    });
    expect(rs.points.K2).toBe(14);
  });
});

describe('scoreTarget (entriesPerTarget 1)', () => {
  const rs = resolveRuleset({ templateId: 'dfbv-3arrow', points: {} });

  it('scores a hit token by its resolved value and marks the target complete', () => {
    expect(scoreTarget(rs, ['V2'])).toEqual({ points: 12, complete: true });
    expect(scoreTarget(rs, ['K1'])).toEqual({ points: 20, complete: true });
  });

  it('scores a miss as 0 but still complete', () => {
    expect(scoreTarget(rs, ['M'])).toEqual({ points: 0, complete: true });
  });

  it('is incomplete and zero with no token recorded yet', () => {
    expect(scoreTarget(rs, [])).toEqual({ points: 0, complete: false });
    expect(scoreTarget(rs, [null, undefined])).toEqual({ points: 0, complete: false });
  });

  it('reflects a point override', () => {
    const custom = resolveRuleset({ templateId: 'dfbv-3arrow', points: { V2: 99 } });
    expect(scoreTarget(custom, ['V2']).points).toBe(99);
  });

  it('works for the hunter template', () => {
    const hunt = resolveRuleset({ templateId: 'dfbv-hunter', points: {} });
    expect(scoreTarget(hunt, ['W1'])).toEqual({ points: 16, complete: true });
  });
});
