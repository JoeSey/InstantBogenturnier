import { describe, it, expect } from 'vitest';
import { generateClassName, autoSuffixOnCollision, getBowTypeAbbr } from './classNameGenerator';
import type { ClassRecord } from '../db/schema';

// Behavior per 02-01-PLAN.md Task 1 <behavior> block (D-04 through D-07).
describe('generateClassName', () => {
  it('joins bow-type abbreviation, age-group, distance with "-"', () => {
    expect(generateClassName('U14', 'RCV', '18m')).toBe('RCV-U14-18m');
  });

  it('falls back to "Neue Klasse" when no fields are set', () => {
    expect(generateClassName('', '', '')).toBe('Neue Klasse');
  });

  it('joins only the populated fields', () => {
    expect(generateClassName('U14', '', '')).toBe('U14');
  });
});

describe('getBowTypeAbbr', () => {
  it('maps "Recurve" to "RCV"', () => {
    expect(getBowTypeAbbr('Recurve')).toBe('RCV');
  });

  it('maps "trad. Recurve" to "trad"', () => {
    expect(getBowTypeAbbr('trad. Recurve')).toBe('trad');
  });

  it('returns unrecognized input unchanged', () => {
    expect(getBowTypeAbbr('Compound Custom')).toBe('Compound Custom');
  });
});

describe('autoSuffixOnCollision', () => {
  it('returns the name unchanged when no existing class has that name', () => {
    const existing: ClassRecord[] = [{ id: 1, name: 'RCV-U16', ageGroup: 'U16', bowType: 'RCV' }];
    expect(autoSuffixOnCollision('RCV-U14', { ageGroup: 'U14', bowType: 'RCV' }, existing)).toBe(
      'RCV-U14'
    );
  });

  it('appends the differing field (distance priority) on collision', () => {
    const existing: ClassRecord[] = [
      { id: 1, name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' },
    ];
    const result = autoSuffixOnCollision(
      'RCV-U14',
      { ageGroup: 'U14', bowType: 'RCV', distance: '25m' },
      existing
    );
    expect(result).toBe('RCV-U14-25m');
  });

  it('falls back to a numeric suffix when the tuple is fully identical', () => {
    const existing: ClassRecord[] = [
      { id: 1, name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' },
    ];
    const result = autoSuffixOnCollision(
      'RCV-U14',
      { ageGroup: 'U14', bowType: 'RCV', distance: '18m' },
      existing
    );
    expect(result).toBe('RCV-U14-2');
  });
});
