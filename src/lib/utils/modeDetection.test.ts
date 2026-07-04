import { describe, it, expect } from 'vitest';
import { detectMode } from './modeDetection';

// Behavior per 02-03-PLAN.md Task 1 <behavior> block (D-08, D-09).
describe('detectMode', () => {
  it('returns AB when shooterCount is not greater than 2 x lineCount', () => {
    expect(detectMode(4, 2)).toBe('AB');
  });

  it('returns AB/CD when shooterCount exceeds 2 x lineCount', () => {
    expect(detectMode(5, 2)).toBe('AB/CD');
  });

  it('returns AB for zero shooters', () => {
    expect(detectMode(0, 3)).toBe('AB');
  });
});
