import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveURL('/#/login');
    await page.waitForSelector('input[name="email"]');
  });

  const TEST_USER = {
    email: 'testuser@example.com',
    password: 'password123'
  };

  test('should allow a user to log in successfully', async ({ page }) => {
    await page.locator('input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /Sign In/i }).click();

    try {
      await page.waitForURL('/#/dashboard/overview', { timeout: 5000 });
      await expect(page).toHaveURL('/#/dashboard/overview');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    } catch (e) {
      const errorElement = page.locator('p.text-red-600');
      if (await errorElement.isVisible()) {
        throw new Error(`Login failed: ${await errorElement.textContent()}`);
      }
      throw e;
    }
  });

  test('should show an error message for invalid credentials', async ({ page }) => {
    await page.locator('input[name="email"]').fill('invaliduser@example.com');
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /Sign In/i }).click();

    const errorMessage = page.locator('p.text-red-600');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(errorMessage).toContainText(/Login failed|Invalid login credentials|Please enter both email and password/i);
  });

  test('should allow user to logout successfully', async ({ page }) => {
    // First login
    await page.locator('input[name="email"]').fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL('/#/dashboard/overview');

    // Find and click logout button/link
    await page.getByRole('button', { name: /logout/i }).click();

    // Verify redirect to login page
    await expect(page).toHaveURL('/#/login');
    // Verify login form is visible again
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should show error for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    const errorMessage = page.locator('p.text-red-600');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    await expect(errorMessage).toContainText(/please enter both email and password/i);
  });

  test('should validate email format', async ({ page }) => {
    await page.locator('input[name="email"]').fill('invalid-email-format');
    await page.locator('input[name="password"]').fill('password123');
    await page.getByRole('button', { name: /Sign In/i }).click();
    
    const errorMessage = page.locator('p.text-red-600');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    await expect(errorMessage).toContainText(/invalid email format|please enter a valid email/i);
  });
});
