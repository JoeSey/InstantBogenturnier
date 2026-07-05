import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import ScoreEntry from './ScoreEntry.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

// Behavior per 03-01-PLAN.md Task 2 <acceptance_criteria> block (SCORE-01/02/03/05).
describe('ScoreEntry', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the shooter name, class name, and line number once configured', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.shootingLines.put({ id: 1, count: 2 });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 3 });

    render(ScoreEntry);

    await screen.findByText('Anna');
    await screen.findByText('RCV-U14');
    await screen.findByText('3');
  });

  it('opens the picker on cell tap and autosaves the selected value', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    const arrowButtons = container.querySelectorAll('tbody button');
    expect(arrowButtons.length).toBe(2);
    await fireEvent.click(arrowButtons[0]);

    const eightButton = await screen.findByRole('button', { name: '8 Punkte' });
    await fireEvent.click(eightButton);

    // Picker closes.
    expect(screen.queryByRole('button', { name: '8 Punkte' })).toBeNull();

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(1);
    });
    const [record] = await db.scores.toArray();
    expect(record).toMatchObject({
      shooterId,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
    });
  });

  it('shows sumIncomplete until every arrow is filled, then sums with M=0/X=10 treatment', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    await screen.findByText(strings.scoring.sumIncomplete);

    // First arrow: M (miss) -> 0.
    let arrowButtons = container.querySelectorAll('tbody button');
    await fireEvent.click(arrowButtons[0]);
    const missButton = await screen.findByRole('button', { name: strings.scoring.pickerAriaMiss });
    await fireEvent.click(missButton);

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(1);
    });

    // Sum still incomplete — only 1 of 2 arrows filled.
    await screen.findByText(strings.scoring.sumIncomplete);

    // Second arrow: X (inner-ten) -> 10.
    arrowButtons = container.querySelectorAll('tbody button');
    await fireEvent.click(arrowButtons[1]);
    const xButton = await screen.findByRole('button', { name: strings.scoring.pickerAriaX });
    await fireEvent.click(xButton);

    await waitFor(async () => {
      expect(await db.scores.count()).toBe(2);
    });

    // Sum: M(0) + X(10) = 10.
    await screen.findByText('10', { selector: 'td' });
  });

  it('shows the not-configured message instead of the table when no rounds config exists', async () => {
    await db.classes.add({ name: 'RCV-U14' });

    render(ScoreEntry);

    await screen.findByText(strings.scoring.notConfiguredHeading);
    expect(screen.queryByRole('table')).toBeNull();
  });

  // Behavior per 03-02-PLAN.md Task 2 <acceptance_criteria> (SCORE-04).
  it('sorts rows by clicking column headers, toggling direction, and switching columns', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 1,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Bob', classId, lineAssignment: 1 });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 2 });

    const { container } = render(ScoreEntry);
    await screen.findByText('Anna');

    const bodyNameCell = () =>
      container.querySelectorAll('tbody tr td:nth-child(2)')[0]?.textContent;

    // Default sort: by Linie ascending -> Bob (line 1) before Anna (line 2).
    expect(bodyNameCell()).toBe('Bob');

    const nameHeaderButton = screen.getByRole('button', { name: strings.scoring.columnName });
    await fireEvent.click(nameHeaderButton);

    // Ascending by Name -> Anna before Bob.
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Anna');
    });
    const nameHeaderTh = container.querySelector('thead th:nth-child(2)');
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('ascending');

    await fireEvent.click(nameHeaderButton);

    // Second click reverses to descending -> Bob before Anna.
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Bob');
    });
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('descending');

    const lineHeaderButton = screen.getByRole('button', { name: strings.scoring.columnLine });
    await fireEvent.click(lineHeaderButton);

    // Switching to Linie resets to ascending -> Bob (line 1) before Anna (line 2).
    await waitFor(() => {
      expect(bodyNameCell()).toBe('Bob');
    });
    const lineHeaderTh = container.querySelector('thead th:nth-child(1)');
    expect(lineHeaderTh?.getAttribute('aria-sort')).toBe('ascending');
    expect(nameHeaderTh?.getAttribute('aria-sort')).toBe('none');
  });
});
