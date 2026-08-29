import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ScoreOutcomeGrid from './ScoreOutcomeGrid.svelte';
import { resolveRuleset, defaultRoundRuleset } from '../utils/threeDScoring';
import { strings } from '../i18n/strings.de';

const threeArrow = resolveRuleset(defaultRoundRuleset('dfbv-3arrow'));
const hunter = resolveRuleset(defaultRoundRuleset('dfbv-hunter'));

function renderGrid(overrides: Record<string, unknown> = {}) {
  return render(ScoreOutcomeGrid, {
    open: true,
    shooterName: 'Ada',
    stationLabel: '2',
    ruleset: threeArrow,
    onselect: vi.fn(),
    oncancel: vi.fn(),
    ...overrides,
  });
}

describe('ScoreOutcomeGrid', () => {
  it('renders a button per zone × ordinal plus Fehlschuss for the 3-arrow ruleset', () => {
    renderGrid();
    // 9 zone buttons + Fehlschuss + Abbrechen
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(11);
    expect(screen.getByText(strings.scoring.outcomeMiss)).toBeTruthy();
  });

  it('collapses to one row of zone buttons for the single-arrow hunter ruleset', () => {
    renderGrid({ ruleset: hunter });
    expect(screen.getAllByRole('button')).toHaveLength(5); // 3 zones + Fehlschuss + Abbrechen
  });

  it('emits the zone+ordinal token on tap', async () => {
    const onselect = vi.fn();
    renderGrid({ onselect });

    await fireEvent.click(
      screen.getByRole('button', {
        name: strings.scoring.outcomeAria(strings.scoring.outcomeZoneOrdinal('Vital', 2), 12),
      })
    );
    expect(onselect).toHaveBeenCalledWith('V2');
  });

  it('emits M for Fehlschuss', async () => {
    const onselect = vi.fn();
    renderGrid({ onselect });
    await fireEvent.click(screen.getByRole('button', { name: /Fehlschuss/ }));
    expect(onselect).toHaveBeenCalledWith('M');
  });

  it('reflects an overridden point value in the button label', () => {
    const custom = resolveRuleset({ templateId: 'dfbv-3arrow', points: { K1: 25 } });
    renderGrid({ ruleset: custom });
    expect(
      screen.getByRole('button', {
        name: strings.scoring.outcomeAria(strings.scoring.outcomeZoneOrdinal('Kill', 1), 25),
      })
    ).toBeTruthy();
  });

  it('shows the archer + station in the title and is dismissible', async () => {
    const oncancel = vi.fn();
    renderGrid({ oncancel });
    expect(screen.getByText(strings.scoring.outcomePickerTitle('Ada', '2'))).toBeTruthy();

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(oncancel).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    renderGrid({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
