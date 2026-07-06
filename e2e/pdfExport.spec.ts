import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/presetExportImport.spec.ts's download-round-trip pattern. Each test gets
// a fresh browser context, so IndexedDB storage starts empty per test — no
// shared-state reset step needed.
//
// PDF-01/04/05/06/07: drives setup -> registration -> scoring -> Ergebnisse ->
// "PDF exportieren" and proves a real download fires with the correct filename,
// including with the browser fully offline (D-06/zero network dependency).

async function setUpTournamentWithResults(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Add a class.
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

  // 3. Custom round config: 1 round / 1 passe / 1 arrow — complete scores are trivial.
  const roundsSection = page.locator('section', {
    has: page.getByRole('heading', { name: 'Runden und Passen' }),
  });
  await roundsSection.getByText('Benutzerdefiniert').click();
  await roundsSection.getByLabel('Runden').fill('1');
  await roundsSection.getByLabel('Passen pro Runde').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').fill('1');
  await roundsSection.getByLabel('Pfeile pro Passe').blur();

  // 4. Register 1 shooter with an explicit line (avoids the auto-assign modal).
  await page.getByTestId('sidebar-nav').getByText('Schützen').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();

  await page.getByLabel('Name').fill('Anna');
  await page.getByLabel('Klasse (erforderlich)').selectOption({ index: 1 });
  await page.getByLabel('Schießplatz (optional)').fill('1');
  await page.getByRole('button', { name: 'Schütze hinzufügen' }).click();
  await expect(page.getByRole('cell', { name: 'Anna' })).toBeVisible();

  // 5. Enter the single arrow's score so the shooter is complete.
  await page.getByTestId('sidebar-nav').getByText('Erfassung').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Erfassung' })).toBeVisible();
  await page.locator('tbody button').first().click();
  await page.getByRole('button', { name: '9 Punkte' }).click();

  // 6. Navigate to Ergebnisse.
  await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ergebnisse' })).toBeVisible();
}

test.describe('PDF export (PDF-01/04/05/06/07)', () => {
  test('clicking "PDF exportieren" downloads a correctly-named PDF file', async ({ page }) => {
    await setUpTournamentWithResults(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF exportieren' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Ergebnisse_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('PDF export succeeds with zero network connectivity (offline)', async ({ page, context }) => {
    await setUpTournamentWithResults(page);

    await context.setOffline(true);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF exportieren' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Ergebnisse_\d{4}-\d{2}-\d{2}\.pdf$/);

    await context.setOffline(false);
  });
});
