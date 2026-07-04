import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PresetList from './PresetList.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import type { PresetRecord } from '../db/schema';

function makePreset(name: string, overrides: Partial<PresetRecord> = {}): Omit<PresetRecord, 'id'> {
  return {
    name,
    classes: [{ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV' }],
    shootingLineCount: 3,
    roundsConfig: { arrowsPerPasse: 6, passesPerRound: 6, numberOfRounds: 2, distance: '70m' },
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PresetList', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('loads a preset after confirmation, replacing classes/lines/rounds but leaving shooters untouched', async () => {
    await db.classes.add({ name: 'Old Class' });
    await db.shootingLines.put({ id: 1, count: 2 });
    await db.rounds.put({ id: 1, arrowsPerPasse: 3, passesPerRound: 10, numberOfRounds: 1, distance: '18m' });
    const shooterId = await db.shooters.add({ name: 'Max Mustermann', classId: 1 });
    await db.presets.add(makePreset('Sommermeisters 2026'));

    render(PresetList);

    const loadButton = await screen.findByRole('button', { name: 'Laden' });
    await fireEvent.click(loadButton);

    await screen.findByText('Vorlage "Sommermeisters 2026" laden?');

    const confirmButton = screen.getByRole('button', { name: 'Ja, laden' });
    await fireEvent.click(confirmButton);

    await screen.findByText(
      'Vorlage "Sommermeisters 2026" geladen. Klassen, Schießplätze und Runden/Passen werden aktualisiert.'
    );

    const classes = await db.classes.toArray();
    expect(classes.map((c) => c.name)).toEqual(['RCV-U14']);
    expect((await db.shootingLines.get(1))?.count).toBe(3);
    expect(await db.rounds.get(1)).toEqual({
      id: 1,
      arrowsPerPasse: 6,
      passesPerRound: 6,
      numberOfRounds: 2,
      distance: '70m',
    });

    // Shooter roster untouched (D-12).
    const shooter = await db.shooters.get(shooterId);
    expect(shooter?.name).toBe('Max Mustermann');
  });

  it('deletes a preset after confirmation', async () => {
    const idToDelete = await db.presets.add(makePreset('Vorlage A'));
    await db.presets.add(makePreset('Vorlage B'));

    render(PresetList);

    const deleteButtons = await screen.findAllByRole('button', { name: 'Löschen' });
    await fireEvent.click(deleteButtons[0]);

    await screen.findByText(/löschen\?$/);

    const confirmButton = screen.getByRole('button', { name: 'Ja, löschen' });
    await fireEvent.click(confirmButton);

    await waitFor(async () => {
      expect(await db.presets.count()).toBe(1);
    });

    expect(await db.presets.get(idToDelete)).toBeUndefined();
  });
});
