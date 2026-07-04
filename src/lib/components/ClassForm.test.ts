import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ClassForm from './ClassForm.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';

describe('ClassForm', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('suggests a live name from the tuple and saves a new class on submit', async () => {
    render(ClassForm);

    const ageSelect = screen.getByLabelText('Alter') as HTMLSelectElement;
    const bowTypeSelect = screen.getByLabelText('Bogentyp') as HTMLSelectElement;

    await fireEvent.change(bowTypeSelect, { target: { value: 'RCV' } });
    await fireEvent.change(ageSelect, { target: { value: 'U14' } });

    // Live suggestion updates before submit (per Interaction Specifics step 6).
    await screen.findByText('Vorschlag: RCV-U14');

    const submitButton = screen.getByRole('button', { name: 'Klasse hinzufügen' });
    await fireEvent.click(submitButton);

    const listItem = await screen.findByText('RCV-U14');
    expect(listItem).toBeTruthy();
  });

  it('auto-suffixes with the differing field on name collision', async () => {
    await db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' });

    render(ClassForm);

    const ageSelect = screen.getByLabelText('Alter') as HTMLSelectElement;
    const bowTypeSelect = screen.getByLabelText('Bogentyp') as HTMLSelectElement;
    const distanceSelect = screen.getByLabelText('Entfernung') as HTMLSelectElement;

    await fireEvent.change(bowTypeSelect, { target: { value: 'RCV' } });
    await fireEvent.change(ageSelect, { target: { value: 'U14' } });
    await fireEvent.change(distanceSelect, { target: { value: '25m' } });

    const submitButton = screen.getByRole('button', { name: 'Klasse hinzufügen' });
    await fireEvent.click(submitButton);

    const listItem = await screen.findByText('RCV-U14-25m');
    expect(listItem).toBeTruthy();

    // The pre-existing "RCV-U14" (18m) must remain untouched and distinct.
    expect(screen.getByText('RCV-U14')).toBeTruthy();
  });
});
