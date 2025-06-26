import { test, expect } from '@playwright/test';

const freelancer = {
    username: 'freelancer',
    password: 'password'
};

const client = {
    username: 'client',
    password: 'password'
}

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test.describe('as a Freelancer', () => {
    test.beforeEach(async ({ page }) => {
        await page.fill('input[name="username"]', freelancer.username);
        await page.fill('input[name="password"]', freelancer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');
    });

    test('should be able to browse projects', async ({ page }) => {
      await page.click('text=Browse Projects');
      await expect(page).toHaveURL('http://localhost:5173/dashboard/freelancer/projects');
      await expect(page.locator('h2:has-text("Browse Projects")')).toBeVisible();
      // Assuming there are projects seeded in the database
      const projectCount = await page.locator('.project-card').count();
      expect(projectCount).toBeGreaterThan(0);
    });

    test('should be able to apply for a project', async ({ page }) => {
        await page.click('text=Browse Projects');
        // click on the first project card
        await page.locator('.project-card').first().click();
        await page.click('button:has-text("Apply")');
        await expect(page.locator('text=Application submitted successfully')).toBeVisible();
    });

    test('should be able to view project details and send messages', async ({ page }) => {
        await page.click('text=Browse Projects');
        await page.locator('.project-card').first().click();
        await expect(page.locator('h2:has-text("Project Details")')).toBeVisible();
        
        // Messaging
        await page.fill('textarea[name="message"]', 'Hello, I am interested in this project.');
        await page.click('button:has-text("Send")');
        await expect(page.locator('text=Hello, I am interested in this project.')).toBeVisible();
    });
  });

  test.describe('as a Client', () => {
    test.beforeEach(async ({ page }) => {
        await page.fill('input[name="username"]', client.username);
        await page.fill('input[name="password"]', client.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');
    });

    test('should be able to create a project', async ({ page }) => {
        await page.click('text=Create Project');
        await page.fill('input[name="title"]', 'New E2E Project');
        await page.fill('textarea[name="description"]', 'This is a test project created by an E2E test.');
        await page.click('button[type="submit"]');
        await expect(page.locator('text=Project created successfully')).toBeVisible();
    });

    test('should be able to see their own projects', async ({ page }) => {
        await page.click('text=My Projects');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/client/projects');
        await expect(page.locator('h2:has-text("My Projects")')).toBeVisible();
        await expect(page.locator('.project-card:has-text("New E2E Project")')).toBeVisible();
    });
  });
});
