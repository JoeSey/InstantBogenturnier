import { test, expect } from '@playwright/test';

// Setup is the app's default view (App.svelte: activeSection = $state<SectionId>('setup')),
// so no nav click is needed — just navigate and query the grid directly.

test.describe('Setup page responsive grid', () => {
  test('2 columns at 1024px (md breakpoint and above)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Klassen' })).toBeVisible();
    const trackCount = await page
      .getByTestId('setup-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(' ').length);
    expect(trackCount).toBe(2);
  });

  test('1 column below md breakpoint (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Klassen' })).toBeVisible();
    const trackCount = await page
      .getByTestId('setup-grid')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.trim().split(' ').length);
    expect(trackCount).toBe(1);
  });
});
