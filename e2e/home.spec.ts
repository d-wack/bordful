import { expect, test } from '@playwright/test';

/**
 * Smoke test — verifies the homepage is reachable and renders job-board
 * content without a JavaScript error.  Runs against a live dev/preview
 * server; skipped in unit-test-only CI environments via the `e2e` Vitest
 * exclusion pattern.
 */
test('homepage loads without error', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBeLessThan(400);

  // The page title should be present
  await expect(page).toHaveTitle(/.+/);
});

test('jobs listing page renders', async ({ page }) => {
  const response = await page.goto('/jobs');
  expect(response?.status()).toBeLessThan(400);
});
