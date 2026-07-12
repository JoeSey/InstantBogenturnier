import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PresetSave from './PresetSave.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import type { PresetRecord } from '../db/schema';

function makePreset(name: string, overrides: Partial<PresetRecord> = {}): Omit<PresetRecord, 'id'> {
  return {
    name,
    classes: [],
    shootingLineCount: 2,
    roundsConfig: { arrowsPerPasse: 3, passesPerRound: 10, numberOfRounds: 1, distance: '18m' },
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PresetSave', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('shows the capacity indicator and adds a new preset on save', async () => {
    await db.presets.bulkAdd([makePreset('A'), makePreset('B'), makePreset('C')]);

    render(PresetSave);

    await screen.findByText('3 von 8 Vorlagen gespeichert');

    const nameInput = screen.getByLabelText('Vorlagenname') as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Neue Vorlage' } });

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    // The capacity indicator is driven by a liveQuery, so waiting for it to reflect the
    // new count is a reliable signal that the async save chain has fully completed.
    await screen.findByText('4 von 8 Vorlagen gespeichert');

    expect(await db.presets.count()).toBe(4);
    const saved = await db.presets.where('name').equals('Neue Vorlage').first();
    expect(saved).toBeTruthy();
  });

  it('opens the overwrite confirmation on name collision and updates the record in place', async () => {
    await db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV' });
    const existingId = await db.presets.add(makePreset('Sommermeisters 2026'));

    render(PresetSave);

    const nameInput = screen.getByLabelText('Vorlagenname') as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'Sommermeisters 2026' } });

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    await screen.findByText('Vorlage "Sommermeisters 2026" existiert bereits. Überschreiben?');

    const confirmButton = screen.getByRole('button', { name: 'Ja, überschreiben' });
    await fireEvent.click(confirmButton);

    // The confirm dialog closes only after the async overwrite completes.
    await waitFor(() => {
      expect(
        screen.queryByText('Vorlage "Sommermeisters 2026" existiert bereits. Überschreiben?')
      ).toBeNull();
    });

    expect(await db.presets.count()).toBe(1);
    const updated = await db.presets.get(existingId);
    expect(updated?.id).toBe(existingId);
    expect(updated?.classes.map((c) => c.name)).toEqual(['RCV-U14']);
  });

  it('shows the capacity warning and blocks save when at 8 presets with a non-colliding name', async () => {
    await db.presets.bulkAdd([
      makePreset('P1'),
      makePreset('P2'),
      makePreset('P3'),
      makePreset('P4'),
      makePreset('P5'),
      makePreset('P6'),
      makePreset('P7'),
      makePreset('P8'),
    ]);

    render(PresetSave);

    // Wait for the liveQuery-backed capacity indicator to settle at 8 before submitting —
    // otherwise the count check could race against the initial (pre-resolution) fallback.
    await screen.findByText('8 von 8 Vorlagen gespeichert');

    const nameInput = screen.getByLabelText('Vorlagenname') as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'P9' } });

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    await screen.findByText('Maximum 8 Vorlagen. Löschen Sie eine Vorlage, bevor Sie speichern.');
    expect(await db.presets.count()).toBe(8);
  });

  it('persists rings: 5 from db.rounds into the saved preset (research Pitfall 1)', async () => {
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 5,
      passesPerRound: 1,
      numberOfRounds: 6,
      rings: 5,
      presetId: 'dfbv-6x5',
    });

    render(PresetSave);

    const nameInput = screen.getByLabelText('Vorlagenname') as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: 'DFBV Turnier' } });

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    await waitFor(async () => {
      const saved = await db.presets.where('name').equals('DFBV Turnier').first();
      expect(saved?.roundsConfig.rings).toBe(5);
    });
  });
});
