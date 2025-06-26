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

test.describe('User Management', () => {

  test.describe('Profile Management', () => {
    test('a freelancer should be able to update their profile', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', freelancer.username);
        await page.fill('input[name="password"]', freelancer.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');

        await page.click('text=My Profile');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/profile');

        await page.fill('input[name="name"]', 'Freelancer New Name');
        await page.click('button:has-text("Update Profile")');

        await expect(page.locator('text=Profile updated successfully')).toBeVisible();
        await expect(page.locator('input[value="Freelancer New Name"]')).toBeVisible();
    });

    test('a client should be able to update their profile', async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', client.username);
        await page.fill('input[name="password"]', client.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard');

        await page.click('text=My Profile');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/profile');

        await page.fill('input[name="name"]', 'Client New Name');
        await page.click('button:has-text("Update Profile")');

        await expect(page.locator('text=Profile updated successfully')).toBeVisible();
        await expect(page.locator('input[value="Client New Name"]')).toBeVisible();
    });
  });

  test.describe('Admin User Oversight', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173/login');
        await page.fill('input[name="username"]', admin.username);
        await page.fill('input[name="password"]', admin.password);
        await page.click('button[type="submit"]');
        await page.waitForURL('http://localhost:5173/dashboard/admin');
    });

    test('should be able to view all users', async ({ page }) => {
        await page.click('text=User Management');
        await expect(page).toHaveURL('http://localhost:5173/dashboard/admin/users');
        await expect(page.locator('h2:has-text("User Management")')).toBeVisible();

        // Check that we see the users we know exist
        await expect(page.locator('.user-row:has-text("freelancer")')).toBeVisible();
        await expect(page.locator('.user-row:has-text("client")')).toBeVisible();
        await expect(page.locator('.user-row:has-text("admin")')).toBeVisible();
    });

    test('should be able to change a user\'s role', async ({ page }) => {
        await page.click('text=User Management');
        
        // Find the freelancer user and change their role to client
        const freelancerRow = page.locator('.user-row:has-text("freelancer")');
        await freelancerRow.locator('select[name="role"]').selectOption('client');
        await freelancerRow.locator('button:has-text("Update")').click();

        await expect(page.locator('text=User role updated successfully')).toBeVisible();

        // Log out and log in as the user to verify the role change
        await page.click('text=Logout');
        await page.fill('input[name="username"]', freelancer.username);
        await page.fill('input[name="password"]', freelancer.password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL('http://localhost:5173/dashboard');
        await expect(page.locator('h2:has-text("Client Dashboard")')).toBeVisible();
    });
  });
});
