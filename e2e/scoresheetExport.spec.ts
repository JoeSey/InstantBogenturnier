import { test, expect, type Page } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// mirrors e2e/pdfExport.spec.ts's download-round-trip pattern. Each test gets a fresh
// browser context, so IndexedDB storage starts empty per test — no shared-state reset
// step needed.
//
// SHEET-01/07: drives Einrichtung (Setup) -> "Schießformular (PDF) drucken" and proves a
// real download fires with the correct filename, including with the browser fully
// offline (zero network dependency), and after a custom rounds/passes config change.

async function setUpTournament(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Einrichtung' })).toBeVisible();
}

test.describe('Scoresheet PDF export (SHEET-01/02/07)', () => {
  test('clicking "Schießformular (PDF) drucken" downloads a correctly-named PDF', async ({
    page,
  }) => {
    await setUpTournament(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);
  });

  test('scoresheet export succeeds with zero network connectivity (offline)', async ({
    page,
    context,
  }) => {
    await setUpTournament(page);

    await context.setOffline(true);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);

    await context.setOffline(false);
  });

  test('scoresheet grid reflects a custom rounds/passes/arrows configuration', async ({
    page,
  }) => {
    await setUpTournament(page);

    const roundsSection = page.locator('section', {
      has: page.getByRole('heading', { name: 'Runden und Passen' }),
    });
    await roundsSection.getByText('Benutzerdefiniert').click();
    await roundsSection.getByLabel('Runden').fill('2');
    await roundsSection.getByLabel('Passen pro Runde').fill('5');
    await roundsSection.getByLabel('Pfeile pro Passe').fill('4');
    await roundsSection.getByLabel('Pfeile pro Passe').blur();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Schießformular (PDF) drucken' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^Schießformular_\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});
