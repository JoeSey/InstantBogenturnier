import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import Results from './Results.svelte';
import { db } from '../db/schema';
import { resetDb } from '../db/testHelpers';
import { strings } from '../i18n/strings.de';

// Behavior per 04-01-PLAN.md Task 3 <acceptance_criteria> block (RES-01–RES-04, D-01/D-04).
describe('Results', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('renders the empty state when no shooters exist', async () => {
    render(Results);

    await screen.findByText(strings.results.emptyHeading);
    await screen.findByText(strings.results.emptyBody);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders classesWithResults in alphabetical order regardless of db insertion order', async () => {
    // Insert classes out of alphabetical order.
    const classBId = await db.classes.add({ name: 'RCV-U16' });
    const classAId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 1,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Bob', classId: classBId, lineAssignment: 1 });
    await db.shooters.add({ name: 'Anna', classId: classAId, lineAssignment: 2 });

    const { container } = render(Results);
    await screen.findAllByText('Anna');

    const gridWrapper = container.querySelector('.md\\:grid') as HTMLElement;
    const headings = Array.from(gridWrapper.querySelectorAll('h2')).map((h) => h.textContent);
    expect(headings).toEqual(['RCV-U14', 'RCV-U16']);
  });

  it('phone wrapper carries md:hidden and grid wrapper carries hidden + md:grid', async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 1,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });

    const { container } = render(Results);
    await screen.findAllByText('Anna');

    const phoneWrapper = container.querySelector('.md\\:hidden');
    expect(phoneWrapper).not.toBeNull();
    expect(phoneWrapper?.className).toContain('md:hidden');

    const gridWrapper = container.querySelector('.md\\:grid');
    expect(gridWrapper).not.toBeNull();
    expect(gridWrapper?.className).toContain('hidden');
    expect(gridWrapper?.className).toContain('md:grid');
  });

  it("shows the in-progress marker end-to-end for an incomplete shooter's row", async () => {
    const classId = await db.classes.add({ name: 'RCV-U14' });
    await db.rounds.put({
      id: 1,
      arrowsPerPasse: 2,
      passesPerRound: 1,
      numberOfRounds: 1,
      distance: '18m',
    });
    await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
    await db.scores.add({
      shooterId: (await db.shooters.toArray())[0].id!,
      roundIndex: 0,
      passeIndex: 0,
      arrowIndex: 0,
      value: '8',
      finalized: false,
    });

    render(Results);
    await screen.findAllByText('Anna');

    await waitFor(() => {
      expect(screen.getAllByText(strings.results.inProgressAria).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(strings.results.inProgressLegend).length).toBeGreaterThan(0);
  });

  describe('reset (RES-05, D-10)', () => {
    async function seedTournament() {
      const classId = await db.classes.add({ name: 'RCV-U14' });
      await db.rounds.put({
        id: 1,
        arrowsPerPasse: 1,
        passesPerRound: 1,
        numberOfRounds: 1,
        distance: '18m',
      });
      const shooterId = await db.shooters.add({ name: 'Anna', classId, lineAssignment: 1 });
      await db.scores.add({
        shooterId,
        roundIndex: 0,
        passeIndex: 0,
        arrowIndex: 0,
        value: '8',
        finalized: false,
      });
    }

    it('cancel leaves shooters and scores unchanged', async () => {
      await seedTournament();
      render(Results);
      await screen.findAllByText('Anna');

      await fireEvent.click(screen.getByRole('button', { name: strings.results.resetButton }));
      await screen.findByText(strings.results.resetConfirmTitle);

      await fireEvent.click(screen.getByRole('button', { name: strings.results.resetConfirmCancel }));

      expect(await db.shooters.count()).toBe(1);
      expect(await db.scores.count()).toBe(1);
    });

    it('confirming clears only shooters/scores, leaves classes/rounds intact, and shows success', async () => {
      await seedTournament();
      render(Results);
      await screen.findAllByText('Anna');

      await fireEvent.click(screen.getByRole('button', { name: strings.results.resetButton }));
      await screen.findByText(strings.results.resetConfirmTitle);

      await fireEvent.click(screen.getByRole('button', { name: strings.results.resetConfirmYes }));

      await waitFor(async () => {
        expect(await db.shooters.count()).toBe(0);
      });
      expect(await db.scores.count()).toBe(0);
      expect(await db.classes.count()).toBe(1);
      expect(await db.rounds.get(1)).toBeDefined();

      await screen.findByText(strings.results.emptyHeading);
      await screen.findByText(strings.results.resetSuccess);
    });
  });
});
