import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import SetupRounds from './SetupRounds.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

describe('SetupRounds', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the WA 18m summary and persists the matching preset on save', async () => {
    render(SetupRounds);

    const wa18mRadio = screen.getByLabelText(strings.setup.wa18m);
    await fireEvent.click(wa18mRadio);

    await screen.findByText('10 Passen, 3 Pfeile, 18m');

    const saveButton = screen.getByRole('button', { name: strings.setup.saveButton });
    await fireEvent.click(saveButton);

    const config = await db.rounds.get(1);
    expect(config).toEqual({
      id: 1,
      arrowsPerPasse: 3,
      passesPerRound: 10,
      numberOfRounds: 1,
      distance: '18m',
      presetId: 'wa-18m',
    });
  });

  it('persists a custom configuration with presetId undefined', async () => {
    render(SetupRounds);

    const customModeRadio = screen.getByLabelText(strings.setup.customLabel);
    await fireEvent.click(customModeRadio);

    const passesInput = screen.getByLabelText(strings.setup.passesPerRoundLabel) as HTMLInputElement;
    const arrowsInput = screen.getByLabelText(strings.setup.arrowsPerPassLabel) as HTMLInputElement;
    const roundsInput = screen.getByLabelText(strings.setup.roundsCountLabel) as HTMLInputElement;
    const distanceInput = screen.getByLabelText(strings.setup.customDistanceLabel) as HTMLInputElement;

    await fireEvent.input(passesInput, { target: { value: '8' } });
    await fireEvent.input(arrowsInput, { target: { value: '5' } });
    await fireEvent.input(roundsInput, { target: { value: '2' } });
    await fireEvent.input(distanceInput, { target: { value: '30m' } });

    await screen.findByText('8 Passen, 5 Pfeile, 30m');

    const saveButton = screen.getByRole('button', { name: strings.setup.saveButton });
    await fireEvent.click(saveButton);

    const config = await db.rounds.get(1);
    expect(config).toEqual({
      id: 1,
      arrowsPerPasse: 5,
      passesPerRound: 8,
      numberOfRounds: 2,
      distance: '30m',
      presetId: undefined,
    });
  });

  // CR-01 (04-REVIEW.md): App.svelte destroys/recreates views on nav, so this component
  // remounts on every visit to Einrichtung. It must rehydrate from the persisted
  // db.rounds record rather than resetting to hardcoded defaults — otherwise a
  // subsequent Speichern click silently overwrites a real saved configuration.
  it('rehydrates form fields from an existing db.rounds record instead of resetting to defaults', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      distance: '70m',
      presetId: undefined,
    });

    render(SetupRounds);

    await screen.findByText('4 Passen, 6 Pfeile, 70m');
    expect((screen.getByLabelText(strings.setup.customLabel) as HTMLInputElement).checked).toBe(
      true
    );

    const saveButton = screen.getByRole('button', { name: strings.setup.saveButton });
    await fireEvent.click(saveButton);

    const config = await db.rounds.get(1);
    expect(config).toEqual({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 4,
      numberOfRounds: 3,
      distance: '70m',
      presetId: undefined,
    });
  });

  it('rehydrates a preset-based db.rounds record by selecting the matching preset radio', async () => {
    // resolvedConfig in preset mode looks up the summary text from WA_PRESETS by
    // presetId (not from the stored numberOfRounds/passesPerRound/arrowsPerPasse
    // fields), so this must match the real WA 70m preset shape (6 Passen, 6 Pfeile).
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 6,
      numberOfRounds: 1,
      distance: '70m',
      presetId: 'wa-70m',
    });

    render(SetupRounds);

    await screen.findByText('6 Passen, 6 Pfeile, 70m');
    expect((screen.getByLabelText(strings.setup.wa70m) as HTMLInputElement).checked).toBe(true);
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
    expect((screen.getByLabelText(strings.setup.wa18m) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(strings.setup.wa25m) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText(strings.setup.wa70m) as HTMLInputElement).disabled).toBe(true);

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
      (screen.getByLabelText(strings.setup.customDistanceLabel) as HTMLInputElement).disabled
    ).toBe(true);

    expect(
      (screen.getByRole('button', { name: strings.setup.saveButton }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
