import { describe, it, expect } from 'vitest';
import { describeError } from './errorDetail';

describe('describeError', () => {
  it('formats an Error as "name: message"', () => {
    expect(describeError(new Error('boom'))).toBe('Error: boom');
  });

  it('formats a DOMException-like error with its own name', () => {
    const err = new DOMException('The object can not be found here.', 'NotFoundError');
    expect(describeError(err)).toBe('NotFoundError: The object can not be found here.');
  });

  it('stringifies a non-Error value', () => {
    expect(describeError('plain string')).toBe('plain string');
    expect(describeError(42)).toBe('42');
  });
});
