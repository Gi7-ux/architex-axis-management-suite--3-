import { test, expect } from '@playwright/test';

test.describe('Authentication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test('should allow a user to register', async ({ page }) => {
    await page.click('text=Register');
    await page.fill('input[name="username"]', 'e2e_user_register');
    await page.fill('input[name="email"]', 'e2e_register@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.selectOption('select[name="role"]', 'freelancer');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('http://localhost:5173/login');
  });

  test('should allow a user to log in and log out', async ({ page }) => {
    // First, register a user to ensure the user exists
    await page.click('text=Register');
    await page.fill('input[name="username"]', 'e2e_user_login');
    await page.fill('input[name="email"]', 'e2e_login@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.fill('input[name="confirmPassword"]', 'password');
    await page.selectOption('select[name="role"]', 'freelancer');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/login');

    // Now, log in
    await page.fill('input[name="username"]', 'e2e_user_login');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/dashboard');

    // Log out
    await page.click('text=Logout');
    await expect(page).toHaveURL('http://localhost:5173/login');
  });

  test('should show an error message for invalid credentials', async ({ page }) => {
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid username or password')).toBeVisible();
  });

  test.describe('Role-based routing', () => {
    // To test role-based routing, we need to have users with different roles in the database.
    // We will assume these users are seeded in the test database.

    test('should redirect admin to admin dashboard', async ({ page }) => {
      await page.fill('input[name="username"]', 'admin'); // seeded admin
      await page.fill('input[name="password"]', 'password'); // seeded admin password
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('http://localhost:5173/dashboard/admin');
      await expect(page.locator('h2:has-text("Admin Dashboard")')).toBeVisible();
    });

    test('should redirect freelancer to freelancer dashboard', async ({ page }) => {
        await page.fill('input[name="username"]', 'freelancer'); // seeded freelancer
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/dashboard');
        await expect(page.locator('h2:has-text("Freelancer Dashboard")')).toBeVisible();
    });

    test('should redirect client to client dashboard', async ({ page }) => {
        await page.fill('input[name="username"]', 'client'); // seeded client
        await page.fill('input[name="password"]', 'password');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/dashboard');
        await expect(page.locator('h2:has-text("Client Dashboard")')).toBeVisible();
    });
  });
});
