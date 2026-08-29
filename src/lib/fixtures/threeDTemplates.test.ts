import { describe, it, expect } from 'vitest';
import { THREE_D_TEMPLATES, getThreeDTemplate } from './threeDTemplates';

// v2 slice 1 — templates are fixed reference data; these tests pin the DFBV point
// values and prove every template is internally well-formed so the generic
// (zone-count-agnostic) consumers can trust it.

describe('threeDTemplates', () => {
  it('exposes the two near-term DFBV templates', () => {
    expect(THREE_D_TEMPLATES.map((t) => t.id)).toEqual(['dfbv-3arrow', 'dfbv-hunter']);
  });

  it('getThreeDTemplate returns the template by id', () => {
    expect(getThreeDTemplate('dfbv-3arrow').label).toBe('3-Pfeil-Runde');
    expect(getThreeDTemplate('dfbv-hunter').label).toBe('Hunter-Runde');
  });

  describe.each(THREE_D_TEMPLATES.map((t) => [t.id, t] as const))('%s is well-formed', (_id, t) => {
    it('lists M plus one hit token per zone × ordinal, in ordinal-then-zone order', () => {
      const expected = [
        ...Array.from({ length: t.maxArrows }, (_, i) => i + 1).flatMap((ordinal) =>
          t.zones.map(({ zone }) => `${zone}${ordinal}`)
        ),
        'M',
      ];
      expect(t.tokens).toEqual(expected);
    });

    it('every hit token has an ordinal within maxArrows', () => {
      for (const token of t.tokens) {
        if (token === 'M') continue;
        expect(token).toMatch(/^[KVW][1-9]$/);
        expect(Number(token[1])).toBeLessThanOrEqual(t.maxArrows);
      }
    });

    it('defaultPoints covers every permitted token and scores M as 0', () => {
      for (const token of t.tokens) {
        expect(t.defaultPoints[token]).toBeTypeOf('number');
        expect(t.defaultPoints[token]).toBeGreaterThanOrEqual(0);
      }
      expect(t.defaultPoints.M).toBe(0);
    });

    it('tieBreak references only zones the template defines', () => {
      const zoneSet = new Set(t.zones.map((z) => z.zone));
      for (const zone of t.tieBreak) {
        expect(zoneSet.has(zone)).toBe(true);
      }
    });

    it('targetMax equals the best available token value', () => {
      const best = Math.max(...t.tokens.map((tok) => t.defaultPoints[tok] ?? 0));
      expect(t.targetMax).toBe(best);
    });
  });

  it('dfbv-3arrow carries the SpO §6.7.8 point table', () => {
    expect(getThreeDTemplate('dfbv-3arrow').defaultPoints).toEqual({
      K1: 20, V1: 18, W1: 16,
      K2: 14, V2: 12, W2: 10,
      K3: 8, V3: 6, W3: 4,
      M: 0,
    });
  });

  it('dfbv-hunter is a single-arrow K/V/W 20/18/16 table', () => {
    const t = getThreeDTemplate('dfbv-hunter');
    expect(t.maxArrows).toBe(1);
    expect(t.entriesPerTarget).toBe(1);
    expect(t.tokens).toEqual(['K1', 'V1', 'W1', 'M']);
    expect(t.defaultPoints).toEqual({ K1: 20, V1: 18, W1: 16, M: 0 });
  });
});
