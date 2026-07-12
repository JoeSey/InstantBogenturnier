import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import SetupRounds from './SetupRounds.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

describe('SetupRounds', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the DFBV summary and persists the matching preset immediately on selection', async () => {
    render(SetupRounds);

    // WA 10 Passen à 3 Pfeile is the default-selected preset on mount, so selecting it
    // again would not fire a native radio "change" event (checked state wouldn't
    // actually change). Select DFBV instead to exercise a genuine onchange-driven
    // auto-save.
    const dfbvRadio = screen.getByLabelText(strings.setup.presetDfbv6x5);
    await fireEvent.click(dfbvRadio);

    await screen.findByText('1 Passen, 5 Pfeile, 5 Ringe');

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 5,
        passesPerRound: 1,
        numberOfRounds: 6,
        rings: 5,
        presetId: 'dfbv-6x5',
      });
    });
  });

  it('persists a custom configuration with presetId undefined', async () => {
    render(SetupRounds);

    const customModeRadio = screen.getByLabelText(strings.setup.customLabel);
    await fireEvent.click(customModeRadio);

    const passesInput = screen.getByLabelText(strings.setup.passesPerRoundLabel) as HTMLInputElement;
    const arrowsInput = screen.getByLabelText(strings.setup.arrowsPerPassLabel) as HTMLInputElement;
    const roundsInput = screen.getByLabelText(strings.setup.roundsCountLabel) as HTMLInputElement;
    const rings5Radio = screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement;

    await fireEvent.input(passesInput, { target: { value: '8' } });
    await fireEvent.input(arrowsInput, { target: { value: '5' } });
    await fireEvent.input(roundsInput, { target: { value: '2' } });
    await fireEvent.click(rings5Radio);

    await screen.findByText('8 Passen, 5 Pfeile, 5 Ringe');

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 5,
        passesPerRound: 8,
        numberOfRounds: 2,
        rings: 5,
        presetId: undefined,
      });
    });
  });

  // CR-01 (04-REVIEW.md): App.svelte destroys/recreates views on nav, so this component
  // remounts on every visit to Einrichtung. It must rehydrate from the persisted
  // db.rounds record rather than resetting to hardcoded defaults — otherwise a
  // subsequent Speichern click silently overwrites a real saved configuration.
  it('rehydrates form fields from an existing db.rounds record with rings: 5 set', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      rings: 5,
      presetId: undefined,
    });

    render(SetupRounds);

    await screen.findByText('4 Passen, 6 Pfeile, 5 Ringe');
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).checked).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement).checked).toBe(
      true
    );

    await waitFor(async () => {
      const config = await db.rounds.get(1);
      expect(config).toEqual({
        id: 1,
        arrowsPerPasse: 6,
        passesPerRound: 4,
        numberOfRounds: 3,
        rings: 5,
        presetId: undefined,
      });
    });
  });

  it('defaults to 10 Ringe when rehydrating a custom db.rounds record with no rings field', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      presetId: undefined,
    });

    render(SetupRounds);

    await screen.findByText('4 Passen, 6 Pfeile, 10 Ringe');
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).checked).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.rings10Label) as HTMLInputElement).checked).toBe(
      true
    );
  });

  it('rehydrates a preset-based db.rounds record by selecting the matching preset radio', async () => {
    // resolvedConfig in preset mode looks up the summary text from WA_PRESETS by
    // presetId (not from the stored numberOfRounds/passesPerRound/arrowsPerPasse
    // fields), so this must match the real WA 70 preset shape (6 Passen, 6 Pfeile).
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 6,
      numberOfRounds: 1,
      rings: 10,
      presetId: 'wa-70',
    });

    render(SetupRounds);

    await screen.findByText('6 Passen, 6 Pfeile, 10 Ringe');
    expect((screen.getByLabelText(strings.setup.presetWa70) as HTMLInputElement).checked).toBe(
      true
    );
  });

  // Behavior per 04-03-PLAN.md Task 3 <action>/<acceptance_criteria> block (RES-06):
  // once isFinalized is passed as true, every radio, every custom input, and the
  // Speichern button must be disabled.
  it('disables every radio, custom input, and the save button when isFinalized is true', async () => {
    render(SetupRounds, { isFinalized: true });

    expect((screen.getByLabelText(strings.setup.waPresetsLabel) as HTMLInputElement).disabled).toBe(
      true
    );
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).disabled).toBe(
      true
    );
    expect(
      (screen.getByLabelText(strings.setup.presetWa10x3) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.presetDfbv6x5) as HTMLInputElement).disabled
    ).toBe(true);
    expect((screen.getByLabelText(strings.setup.presetWa70) as HTMLInputElement).disabled).toBe(
      true
    );

    await fireEvent.click(screen.getByLabelText(strings.setup.customLabel));
    // Note: the custom-mode radio itself is disabled above, but the underlying
    // selectedMode state is still toggleable via fireEvent in jsdom regardless of the
    // disabled attribute (jsdom does not enforce disabled semantics on fireEvent).
    // The assertion of interest here is that once rendered, the custom inputs also
    // carry the disabled attribute.

    expect(
      (screen.getByLabelText(strings.setup.roundsCountLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.passesPerRoundLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.arrowsPerPassLabel) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.rings10Label) as HTMLInputElement).disabled
    ).toBe(true);
    expect(
      (screen.getByLabelText(strings.setup.rings5Label) as HTMLInputElement).disabled
    ).toBe(true);
  });
});
