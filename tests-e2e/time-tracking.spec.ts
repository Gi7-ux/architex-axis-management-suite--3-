import { test, expect } from '@playwright/test';

const freelancer = {
    username: 'freelancer',
    password: 'password'
};

const client = {
    username: 'client',
    password: 'password'
}

const admin = {
    username: 'admin',
    password: 'password'
}

test.describe('Time Tracking', () => {
  test.describe('as a Freelancer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', freelancer.username);
        await page.fill('input[name="password"]', freelancer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');
    });

    test('should be able to log time for a project', async ({ page }) => {
      await page.click('text=Time Tracking');
      await expect(page).toHaveURL('http://localhost:5173/dashboard/freelancer/time-tracking');
      
      // Assuming there is a project to track time against
      await page.selectOption('select[name="project"]', { label: 'Test Project' });
      await page.click('button:has-text("Start Timer")');
      // wait for a few seconds
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Stop Timer")');

      await expect(page.locator('text=Time logged successfully')).toBeVisible();
      // Check if the new time log appears in the list
      await expect(page.locator('.time-log-entry:has-text("Test Project")')).toBeVisible();
    });
  });

  test.describe('as a Client', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', client.username);
        await page.fill('input[name="password"]', client.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');
    });

    test('should be able to view time logs for their projects', async ({ page }) => {
        await page.click('text=Project Time Logs');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/client/time-logs');
        // Assuming the freelancer has logged time on a project owned by this client
        await expect(page.locator('.time-log-entry:has-text("Test Project")')).toBeVisible();
    });
  });

  test.describe('as an Admin', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', admin.username);
        await page.fill('input[name="password"]', admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard/admin');
    });

    test('should be able to see all time logs in reports', async ({ page }) => {
        await page.click('text=Time Log Reports');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/admin/reports/time-logs');
        await expect(page.locator('h2:has-text("Time Log Reports")')).toBeVisible();
        // Check for the time log created by the freelancer
        await expect(page.locator('.time-log-row:has-text("freelancer")')).toBeVisible();
        await expect(page.locator('.time-log-row:has-text("Test Project")')).toBeVisible();
    });
  });
});
