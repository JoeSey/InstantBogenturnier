import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/nav.spec.ts's test.describe/test structure. Each test gets a fresh
// browser context, so IndexedDB storage starts empty per test (see
// e2e/presetExportImport.spec.ts's comment) — no shared-state reset step needed.
//
// SCORE-06/07 (D-09/D-10): drives the full setup -> registration -> scoring ->
// finalize flow end-to-end, then proves the permanent lock survives a page reload
// (i.e. persisted in IndexedDB, not just in-memory component state).

async function setUpOneShooterOneArrowTournament(page: Page) {
  // 1440x900: matches e2e/nav.spec.ts's "wide desktop" viewport, wide enough that the
  // sidebar's icon-only rail (below xl/1280px per UI-SPEC) isn't in play, so the nav
  // labels ("Schützen", "Erfassung") are visible text, not hidden behind icons.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Add a class with a single field set (age group) — enough per SETUP-01.
  const classSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Klasse hinzufügen' }),
  });
  await classSection.getByLabel('Alter').selectOption('U14');
  await classSection.getByRole('button', { name: 'Klasse hinzufügen' }).click();

  // 2. Set 1 shooting line.
  const linesSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Schießplätze' }),
  });
  await linesSection.getByLabel('Schießplätze').fill('1');
  await linesSection.getByLabel('Schießplätze').blur();

  // 3. Custom round config: 1 round / 1 passe / 1 arrow.
  const roundsSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Runden und Passen' }),
  });
  await roundsSection.getByText('Benutzerdefiniert').click();
  await roundsSection.getByLabel('Runden').fill('1');
  await roundsSection.getByLabel('Passen pro Runde').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').fill('1');
  await roundsSection.getByRole('button', { name: 'Speichern' }).click();

  // 4. Navigate to Schützen, register 1 shooter with an explicit line (avoids the
  // auto-assign confirmation modal, out of scope for this flow).
  await page.getByTestId('sidebar-nav').getByText('Schützen').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();

  await page.getByLabel('Name').fill('Anna');
  await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
  await page.getByLabel('Schießplatz (optional)').fill('1');
  await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
  await expect(page.getByRole('cell', { name: 'Anna' })).toBeVisible();

  // 5. Navigate to Erfassung.
  await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Erfassung' })).toBeVisible();
  await expect(page.getByText('Anna')).toBeVisible();
}

test.describe('score entry finalize/lock (SCORE-06/07, D-09/D-10)', () => {
  test('completing every cell and confirming Abschließen permanently disables score entry', async ({
    page,
  }) => {
    await setUpOneShooterOneArrowTournament(page);

    // Fill the single arrow cell.
    const arrowButton = page.locator('tbody button').first();
    await arrowButton.click();
    await page.getByRole('button', { name: '8 Punkte' }).click();

    // Abschließen becomes enabled once the only cell is filled.
    const finalizeButton = page.getByRole('button', { name: 'Turnier abschließen' });
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();

    // Non-dismissible confirmation modal.
    await expect(page.getByRole('heading', { name: 'Turnier abschließen?' })).toBeVisible();
    await page.getByRole('button', { name: 'Ja, abschließen' }).click();

    // Locked: message shown, arrow cell disabled, finalize button gone.
    await expect(page.getByText('Erfassung abgeschlossen. Die Ergebnisse sind jetzt gesperrt.')).toBeVisible();
    await expect(arrowButton).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Turnier abschließen' })).toHaveCount(0);
  });

  test('the finalize lock persists across a page reload (IndexedDB, not component state)', async ({
    page,
  }) => {
    await setUpOneShooterOneArrowTournament(page);

    const arrowButton = page.locator('tbody button').first();
    await arrowButton.click();
    await page.getByRole('button', { name: '8 Punkte' }).click();

    const finalizeButton = page.getByRole('button', { name: 'Turnier abschließen' });
    await expect(finalizeButton).toBeEnabled();
    await finalizeButton.click();
    await page.getByRole('button', { name: 'Ja, abschließen' }).click();
    await expect(arrowButton).toBeDisabled();

    // Reload resets in-memory nav state to the default (Einrichtung) view — navigate
    // back to Erfassung to prove the lock itself (not just this navigation state)
    // survived the reload via IndexedDB.
    await page.reload();
    await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
    await expect(page.getByText('Anna')).toBeVisible();
    await expect(page.locator('tbody button').first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Turnier abschließen' })).toHaveCount(0);
  });
});
