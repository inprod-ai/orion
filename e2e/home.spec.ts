import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/orion/i)
})

test('can enter repo URL', async ({ page }) => {
  await page.goto('/')
  const input = page.getByPlaceholder(/github/i)
  await expect(input).toBeVisible()
})

