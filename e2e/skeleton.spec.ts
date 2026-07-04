import { test, expect } from '@playwright/test';

// Runs against the production `vite preview` build (playwright.config.ts webServer) —
// PWA/offline/theme-boot behavior cannot be validated against `vite dev` (Pitfall 4).

test('app renders the app name in the top app bar', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('InstantBogenturnier')).toBeVisible();
});

test('clicking the theme toggle adds/removes the dark class and updates aria-label', async ({
  page,
}) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: /Zu (Dunkel|Hell)modus wechseln/ });

  const wasDark = (await html.getAttribute('class'))?.includes('dark') ?? false;
  await toggle.click();
  const isDarkAfter = (await html.getAttribute('class'))?.includes('dark') ?? false;
  expect(isDarkAfter).toBe(!wasDark);

  const expectedLabel = isDarkAfter ? 'Zu Hellmodus wechseln' : 'Zu Dunkelmodus wechseln';
  await expect(toggle).toHaveAttribute('aria-label', expectedLabel);
});

test('theme choice persists across reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toggle = page.getByRole('button', { name: /Zu (Dunkel|Hell)modus wechseln/ });

  // Force to dark explicitly regardless of starting state.
  if (!((await html.getAttribute('class'))?.includes('dark') ?? false)) {
    await toggle.click();
  }
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('app shell renders offline after reload (PLAT-01)', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByText('InstantBogenturnier')).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('InstantBogenturnier')).toBeVisible();
  await context.setOffline(false);
});

test('boots with no console errors or uncaught page errors (Dexie opens without error)', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.getByText('InstantBogenturnier')).toBeVisible();

  expect(errors).toEqual([]);
});
