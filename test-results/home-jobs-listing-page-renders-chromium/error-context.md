# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home.spec.ts >> jobs listing page renders
- Location: e2e/home.spec.ts:17:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 400
Received:   500
```

# Page snapshot

```yaml
- generic [active]:
  - button "Open Next.js Dev Tools" [ref=e6] [cursor=pointer]:
    - img [ref=e7]
  - alert [ref=e10]
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | /**
  4  |  * Smoke test — verifies the homepage is reachable and renders job-board
  5  |  * content without a JavaScript error.  Runs against a live dev/preview
  6  |  * server; skipped in unit-test-only CI environments via the `e2e` Vitest
  7  |  * exclusion pattern.
  8  |  */
  9  | test('homepage loads without error', async ({ page }) => {
  10 |   const response = await page.goto('/');
  11 |   expect(response?.status()).toBeLessThan(400);
  12 | 
  13 |   // The page title should be present
  14 |   await expect(page).toHaveTitle(/.+/);
  15 | });
  16 | 
  17 | test('jobs listing page renders', async ({ page }) => {
  18 |   const response = await page.goto('/jobs');
> 19 |   expect(response?.status()).toBeLessThan(400);
     |                              ^ Error: expect(received).toBeLessThan(expected)
  20 | });
  21 | 
```