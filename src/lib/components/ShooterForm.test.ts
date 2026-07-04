import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitForElementToBeRemoved } from '@testing-library/svelte';
import ShooterForm from './ShooterForm.svelte';
import Registration from '../views/Registration.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';

// Behavior per 02-03-PLAN.md Task 2 <acceptance_criteria> block (REG-01, REG-02).
describe('ShooterForm', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('is a no-op when submitted with an empty name', async () => {
    await db.classes.add({ name: 'RCV-U14' });

    render(ShooterForm);

    const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton);

    expect(screen.queryByText('Schützen zugewiesen')).toBeNull();
    expect(await db.shooters.count()).toBe(0);
  });

  it('opens the auto-assign modal for one shooter and persists it on Speichern', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(ShooterForm);

    // The classes dropdown is populated asynchronously via liveQuery — wait for the
    // option to appear before interacting with it.
    await screen.findByRole('option', { name: 'RCV-U14' });

    const nameInput = screen.getByLabelText('Name');
    await fireEvent.input(nameInput, { target: { value: 'Anna' } });

    const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
    await fireEvent.change(classSelect, { target: { value: String(classId) } });

    const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
    await fireEvent.click(submitButton);

    // Exactly 1 assignment shown in the preview.
    await screen.findByText('1 Schützen werden automatisch zugewiesen:');

    const saveButton = screen.getByRole('button', { name: 'Speichern' });
    await fireEvent.click(saveButton);

    expect(await db.shooters.count()).toBe(1);
    const [shooter] = await db.shooters.toArray();
    expect(shooter.name).toBe('Anna');
    expect(shooter.classId).toBe(classId);
    expect(typeof shooter.lineAssignment).toBe('number');
    expect(shooter.flight === 'A/B' || shooter.flight === 'C/D').toBe(true);
  });
});

describe('Registration mode indicator', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('flips from AB to AB/CD as shooterCount crosses 2 x lineCount', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });

    render(Registration);

    await screen.findByText('Modus: AB');
    await screen.findByRole('option', { name: 'RCV-U14' });

    for (let i = 0; i < 5; i++) {
      const nameInput = screen.getByLabelText('Name');
      await fireEvent.input(nameInput, { target: { value: `Schütze ${i}` } });

      const classSelect = screen.getByLabelText(/Klasse/) as HTMLSelectElement;
      await fireEvent.change(classSelect, { target: { value: String(classId) } });

      const submitButton = screen.getByRole('button', { name: 'Schütze hinzufügen' });
      await fireEvent.click(submitButton);

      const saveButton = await screen.findByRole('button', { name: 'Speichern' });
      await fireEvent.click(saveButton);

      // Wait for the modal to close (and shooter to be persisted) before continuing.
      await waitForElementToBeRemoved(() => screen.queryByRole('button', { name: 'Speichern' }));
    }

    await screen.findByText('Modus: AB/CD');
  });
});
