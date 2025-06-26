import { test, expect } from '@playwright/test';

test.describe('Landing Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('should have correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Architex Axis Management Suite/);
  });

  test('should have navigation to key sections', async ({ page }) => {
    // Check for main navigation elements when not logged in
    await expect(page.getByRole('button', { name: /login.*sign up/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /admin portal/i })).toBeVisible();
    
    // Verify logo presence
    await expect(page.getByRole('img', { name: /architex.*logo/i })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('button', { name: /login.*sign up/i }).click();
    await expect(page).toHaveURL('/#/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to admin login page', async ({ page }) => {
    await page.getByRole('button', { name: /admin portal/i }).click();
    await expect(page).toHaveURL('/#/admin-login');
    await expect(page.getByRole('heading', { name: /admin.*sign in/i })).toBeVisible();
  });

  test('should have proper responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('nav')).toBeVisible();
  });
});
