import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ThreeDPointGrid from './ThreeDPointGrid.svelte';

describe('ThreeDPointGrid', () => {
  it('renders one input per zone × ordinal, pre-filled from the template defaults', () => {
    render(ThreeDPointGrid, { templateId: 'dfbv-3arrow', points: {}, onchange: vi.fn() });

    const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    expect(inputs).toHaveLength(9); // 3 zones × 3 arrows

    expect((screen.getByLabelText('Kill 1. Pfeil') as HTMLInputElement).value).toBe('20');
    expect((screen.getByLabelText('Vital 2. Pfeil') as HTMLInputElement).value).toBe('12');
    expect((screen.getByLabelText('Wound 3. Pfeil') as HTMLInputElement).value).toBe('4');
  });

  it('collapses to one row of inputs for the single-arrow hunter template', () => {
    render(ThreeDPointGrid, { templateId: 'dfbv-hunter', points: {}, onchange: vi.fn() });
    expect(screen.getAllByRole('spinbutton')).toHaveLength(3); // 3 zones × 1 arrow
    expect((screen.getByLabelText('Kill 1. Pfeil') as HTMLInputElement).value).toBe('20');
  });

  it('shows a stored override instead of the default', () => {
    render(ThreeDPointGrid, { templateId: 'dfbv-3arrow', points: { K1: 25 }, onchange: vi.fn() });
    expect((screen.getByLabelText('Kill 1. Pfeil') as HTMLInputElement).value).toBe('25');
  });

  it('emits the full merged points map on edit', async () => {
    const onchange = vi.fn();
    render(ThreeDPointGrid, { templateId: 'dfbv-3arrow', points: { W3: 2 }, onchange });

    await fireEvent.change(screen.getByLabelText('Kill 1. Pfeil'), { target: { value: '19' } });

    expect(onchange).toHaveBeenCalledTimes(1);
    expect(onchange.mock.calls[0][0]).toEqual({ W3: 2, K1: 19 });
  });

  it('clamps a negative or non-numeric entry to 0', async () => {
    const onchange = vi.fn();
    render(ThreeDPointGrid, { templateId: 'dfbv-3arrow', points: {}, onchange });

    await fireEvent.change(screen.getByLabelText('Vital 1. Pfeil'), { target: { value: '-5' } });
    expect(onchange.mock.calls[0][0].V1).toBe(0);

    await fireEvent.change(screen.getByLabelText('Vital 1. Pfeil'), { target: { value: 'abc' } });
    expect(onchange.mock.calls[1][0].V1).toBe(0);
  });

  it('disables every input when disabled', () => {
    render(ThreeDPointGrid, {
      templateId: 'dfbv-3arrow',
      points: {},
      disabled: true,
      onchange: vi.fn(),
    });
    for (const input of screen.getAllByRole('spinbutton')) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
  });
});
