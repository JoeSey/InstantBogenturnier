import { test, expect } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// nav/placeholder/update-banner behavior cannot be validated against `vite dev` (Pitfall 4).
//
// These tests MUST fail (RED) until Tasks 2-3 build the nav shell, placeholder views, and
// UpdateBanner — nothing under test exists yet on the current App.svelte shell.

test.describe('responsive nav breakpoint (768px)', () => {
  test('phone width (375px): bottom tab bar visible, sidebar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/');
    await expect(page.getByTestId('bottom-tab-bar')).toBeVisible();
    await expect(page.getByTestId('sidebar-nav')).toBeHidden();
  });

  test('desktop width (1024px): sidebar visible, bottom tab bar hidden', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('sidebar-nav')).toBeVisible();
    await expect(page.getByTestId('bottom-tab-bar')).toBeHidden();
  });
});

test.describe('nav sections', () => {
  test('shows exactly the four nav labels', async ({ page }) => {
    // Wide desktop viewport so the sidebar's icon-only rail (below xl/1280px per UI-SPEC)
    // isn't in play for this assertion.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const sidebar = page.getByTestId('sidebar-nav');
    await expect(sidebar.getByText('Einrichtung')).toBeVisible();
    await expect(sidebar.getByText('Schützen')).toBeVisible();
    await expect(sidebar.getByText('Erfassung')).toBeVisible();
    await expect(sidebar.getByText('Ergebnisse')).toBeVisible();
  });

  test('clicking Schützen shows the Registration view', async ({ page }) => {
    // Phase 2 (02-03) replaced RegistrationPlaceholder with the real Registration view —
    // its <h1> reads "Schützen" (strings.registration.heading), not the Phase 1
    // "Schützen kommt bald" placeholder text.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('sidebar-nav').getByText('Schützen').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Schützen' })).toBeVisible();
  });

  test('clicking Ergebnisse shows the Ergebnisse view', async ({ page }) => {
    // Phase 4 (04-01) replaced ResultsPlaceholder with the real Results view — its
    // <h1> reads "Ergebnisse" (strings.results.heading), not the Phase 1
    // "Ergebnisse kommt bald" placeholder text. With no shooters registered, the
    // empty state (strings.results.emptyHeading) renders below the heading.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('sidebar-nav').getByText('Ergebnisse').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Ergebnisse' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Noch keine Ergebnisse' })).toBeVisible();
  });
});

test.describe('update banner', () => {
  test('is not shown on normal load', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Ein Update ist verfügbar.')).toHaveCount(0);
  });

  test('appears when updateAvailable is set, and Später dismisses it for the session', async ({
    page,
  }) => {
    // Deterministic test hook (no runtime attack surface for normal use — gated behind an
    // explicit `?e2e=1` opt-in query param, see App.svelte / T-01-06): flips the
    // `updateAvailable` store directly instead of publishing two real builds mid-test.
    await page.goto('/?e2e=1');
    await expect(page.getByText('Ein Update ist verfügbar.')).toHaveCount(0);

    await page.evaluate(() => {
      (
        window as unknown as { __setUpdateAvailable: (value: boolean) => void }
      ).__setUpdateAvailable(true);
    });

    await expect(page.getByText('Ein Update ist verfügbar.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aktualisieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Später' })).toBeVisible();

    await page.getByRole('button', { name: 'Später' }).click();
    await expect(page.getByText('Ein Update ist verfügbar.')).toHaveCount(0);
  });
});
