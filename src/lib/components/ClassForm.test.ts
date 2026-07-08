import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ClassForm from './ClassForm.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

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
    expect(screen.getByPlaceholderText('RCV-U14')).toBeTruthy();

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

  // Behavior per 04-03-PLAN.md Task 3 <action>/<acceptance_criteria> block (RES-06):
  // once the tournament is finalized, delete-class is disabled with an inline guard
  // message, kept independent of CR-02's dependent-shooter block.
  it('disables delete-class and shows the guard message once the tournament is finalized', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' });
    await db.shooters.add({ name: 'Anna', classId });
    await db.scores.put({
      shooterId: 1,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
      finalized: true,
    });

    render(ClassForm);

    // Wait for the finalized-guard message to appear first — it only renders once the
    // liveQuery(db.scores) subscription has caught up, same async boundary the
    // disabled attribute below depends on.
    await screen.findByText(strings.results.guardMessage);

    const deleteButton = screen.getByLabelText(strings.setup.classDeleteAction) as HTMLButtonElement;
    expect(deleteButton.disabled).toBe(true);
  });

  it('edits an existing class in place instead of creating a duplicate', async () => {
    await db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV', distance: '18m' });

    render(ClassForm);

    await screen.findByText('RCV-U14');

    const editButton = screen.getByLabelText(strings.setup.classEditAction);
    await fireEvent.click(editButton);

    const submitButton = screen.getByRole('button', { name: 'Klasse ändern' });
    expect(submitButton).toBeTruthy();

    const distanceSelect = screen.getByLabelText('Entfernung') as HTMLSelectElement;
    await fireEvent.change(distanceSelect, { target: { value: '25m' } });

    await fireEvent.click(submitButton);

    const updated = await db.classes.toArray();
    expect(updated).toHaveLength(1);
    expect(updated[0].distance).toBe('25m');
  });

  it('leaves the name input empty on edit when the stored name is still the auto-generated one', async () => {
    await db.classes.add({ name: 'RCV-U14', ageGroup: 'U14', bowType: 'RCV' });

    render(ClassForm);

    await screen.findByText('RCV-U14');
    await fireEvent.click(screen.getByLabelText(strings.setup.classEditAction));

    const nameInput = screen.getByLabelText(strings.setup.classNameLabel) as HTMLInputElement;
    expect(nameInput.value).toBe('');
    expect(nameInput.placeholder).toBe('RCV-U14');
  });

  it('re-saves a hand-entered name unchanged on edit without appending a collision suffix', async () => {
    await db.classes.add({
      name: 'Meine Klasse',
      ageGroup: 'U14',
      bowType: 'RCV',
      distance: '18m',
    });

    render(ClassForm);

    await screen.findByText('Meine Klasse');
    await fireEvent.click(screen.getByLabelText(strings.setup.classEditAction));

    const nameInput = screen.getByLabelText(strings.setup.classNameLabel) as HTMLInputElement;
    expect(nameInput.value).toBe('Meine Klasse');

    const submitButton = screen.getByRole('button', { name: 'Klasse ändern' });
    await fireEvent.click(submitButton);

    const updated = await db.classes.toArray();
    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Meine Klasse');
  });
});
