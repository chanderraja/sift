// SPDX-License-Identifier: MIT

import { expect, test } from '@playwright/test';

test('app shell loads and exposes the page title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Sift');
});
