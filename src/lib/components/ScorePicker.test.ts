import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ScorePicker from './ScorePicker.svelte';
import { strings } from '../i18n/strings.de';

describe('ScorePicker', () => {
  it('renders exactly the 12 existing buttons (1-10, X, M) with rings omitted (default 10)', () => {
    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect: vi.fn(),
      oncancel: vi.fn(),
    });

    const buttons = screen.getAllByRole('button').filter((btn) => btn.textContent?.trim() !== strings.scoring.pickerCancel);
    expect(buttons).toHaveLength(12);
    for (const value of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'X', 'M']) {
      expect(screen.getByText(value, { selector: 'button' })).not.toBeNull();
    }
  });

  it('renders exactly 7 buttons for rings=5 — no 6/7/8/9/10 buttons present', () => {
    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect: vi.fn(),
      oncancel: vi.fn(),
      rings: 5,
    });

    const buttons = screen.getAllByRole('button').filter((btn) => btn.textContent?.trim() !== strings.scoring.pickerCancel);
    expect(buttons).toHaveLength(7);
    for (const value of ['1', '2', '3', '4', '5', 'X', 'M']) {
      expect(screen.getByText(value, { selector: 'button' })).not.toBeNull();
    }
    for (const value of ['6', '7', '8', '9', '10']) {
      expect(screen.queryByText(value, { selector: 'button' })).toBeNull();
    }
  });

  it('rings=5: X and 5 carry white color classes, 4/3/2/1 carry the new darkblue classes', () => {
    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect: vi.fn(),
      oncancel: vi.fn(),
      rings: 5,
    });

    const xButton = screen.getByText('X', { selector: 'button' });
    const fiveButton = screen.getByText('5', { selector: 'button' });
    const fourButton = screen.getByText('4', { selector: 'button' });
    const oneButton = screen.getByText('1', { selector: 'button' });

    expect(xButton.className).toContain('bg-white');
    expect(fiveButton.className).toContain('bg-white');
    expect(fourButton.className).toContain('bg-blue-800');
    expect(oneButton.className).toContain('bg-blue-800');
    // distinct from the existing 10-ring blue (bg-blue-500)
    expect(fourButton.className).not.toContain('bg-blue-500');
  });

  it('rings=5: keyboard 6 is a no-op, 5 selects "5", x selects "X"', async () => {
    const onselect = vi.fn();
    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect,
      oncancel: vi.fn(),
      rings: 5,
    });

    await fireEvent.keyDown(window, { key: '6' });
    expect(onselect).not.toHaveBeenCalled();

    await fireEvent.keyDown(window, { key: '5' });
    expect(onselect).toHaveBeenCalledWith('5');

    await fireEvent.keyDown(window, { key: 'x' });
    expect(onselect).toHaveBeenCalledWith('X');
  });

  it('rings=10: keyboard 0 still selects "10" (regression guard)', async () => {
    const onselect = vi.fn();
    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect,
      oncancel: vi.fn(),
    });

    await fireEvent.keyDown(window, { key: '0' });
    expect(onselect).toHaveBeenCalledWith('10');
  });

  it("X button's aria-label reflects rings-correct point value", () => {
    const { unmount } = render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect: vi.fn(),
      oncancel: vi.fn(),
    });
    expect(screen.getByLabelText(strings.scoring.pickerAriaX(10))).not.toBeNull();
    unmount();

    render(ScorePicker, {
      open: true,
      shooterName: 'Max',
      rowPreview: [],
      onselect: vi.fn(),
      oncancel: vi.fn(),
      rings: 5,
    });
    expect(screen.getByLabelText(strings.scoring.pickerAriaX(5))).not.toBeNull();
  });
});
