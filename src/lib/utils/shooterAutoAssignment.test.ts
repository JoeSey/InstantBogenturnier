import { describe, it, expect } from 'vitest';
import { assignShootersToLines, previewAssignmentSummary } from './shooterAutoAssignment';

// Behavior per 02-03-PLAN.md Task 1 <behavior> block (D-10).
describe('assignShootersToLines', () => {
  it('round-robins across lines with flight A/B in AB mode', () => {
    const result = assignShootersToLines(4, 2, 'AB');
    expect(result.map((r) => r.lineNum)).toEqual([1, 2, 1, 2]);
    expect(result.every((r) => r.flight === 'A/B')).toBe(true);
  });

  it('round-robins across lines and flips flight every full pass in AB/CD mode', () => {
    const result = assignShootersToLines(5, 2, 'AB/CD');
    expect(result.map((r) => r.lineNum)).toEqual([1, 2, 1, 2, 1]);
    expect(result.map((r) => r.flight)).toEqual(['A/B', 'A/B', 'C/D', 'C/D', 'A/B']);
  });
});

describe('previewAssignmentSummary', () => {
  it('returns a comma-joined string of line numbers', () => {
    const assignments = assignShootersToLines(5, 2, 'AB/CD');
    expect(previewAssignmentSummary(assignments)).toBe('1,2,1,2,1');
  });
});
