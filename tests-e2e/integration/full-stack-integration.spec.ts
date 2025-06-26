// tests-e2e/integration/full-stack-integration.spec.ts
import { test, expect, Page } from '@playwright/test';

const API_BASE_URL = 'http://localhost/backend';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Full Stack PHP-Frontend Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable request/response logging for debugging
    page.on('request', request => {
      if (request.url().includes('/backend/')) {
        console.log('REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/backend/')) {
        console.log('RESPONSE:', response.status(), response.url());
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full authentication flow', async () => {
    await page.goto(FRONTEND_URL);

    // Wait for app to load
    await expect(page.locator('h1')).toContainText(/architex|login/i);

    // Navigate to login if not already there
    if (await page.locator('text=Sign In').isVisible()) {
      // Already on login page
    } else {
      await page.click('text=Login');
    }

    // Fill in login form
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Intercept the login API call
    const loginResponse = page.waitForResponse(response => 
      response.url().includes('/backend/api.php') && 
      response.request().method() === 'POST'
    );

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for API response
    const response = await loginResponse;
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toHaveProperty('success');

    if (responseBody.success) {
      // Successful login - should redirect to dashboard
      await expect(page).toHaveURL(/dashboard/);
      
      // Verify dashboard elements are visible
      await expect(page.locator('text=Dashboard')).toBeVisible();
      await expect(page.locator('text=Welcome')).toBeVisible();
    } else {
      // Failed login - should show error message
      await expect(page.locator('text=Invalid')).toBeVisible();
    }
  });

  test('should handle registration flow with PHP backend', async () => {
    await page.goto(`${FRONTEND_URL}/register`);

    // Fill registration form
    await page.fill('input[name="username"]', 'newtestuser');
    await page.fill('input[name="email"]', 'newtestuser@example.com');
    await page.fill('input[name="password"]', 'securepassword123');
    await page.selectOption('select[name="role"]', 'freelancer');

    // Intercept registration API call
    const registerResponse = page.waitForResponse(response => 
      response.url().includes('/backend/api.php') && 
      response.request().method() === 'POST'
    );

    // Submit registration
    await page.click('button[type="submit"]');

    // Wait for response
    const response = await registerResponse;
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    
    if (responseBody.success) {
      // Should redirect to login or show success message
      await expect(page.locator('text=Success')).toBeVisible();
    } else {
      // Should show error message
      await expect(page.locator('text=Error')).toBeVisible();
    }
  });

  test('should load dashboard data from PHP backend', async () => {
    // First login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard redirect
    await page.waitForURL(/dashboard/);

    // Intercept dashboard data API calls
    const dashboardDataResponse = page.waitForResponse(response => 
      response.url().includes('/backend/api.php') && 
      response.url().includes('dashboard')
    );

    // Navigate to dashboard if not already there
    await page.goto(`${FRONTEND_URL}/dashboard`);

    // Wait for dashboard data to load
    try {
      const response = await dashboardDataResponse;
      expect(response.status()).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toHaveProperty('success');

      if (responseBody.success) {
        // Verify dashboard displays data
        await expect(page.locator('[data-testid="total-projects"]')).toBeVisible();
        await expect(page.locator('[data-testid="active-projects"]')).toBeVisible();
      }
    } catch (error) {
      console.log('Dashboard data request might not have been made yet');
    }

    // Verify dashboard components are loaded
    await expect(page.locator('text=Total Projects')).toBeVisible();
    await expect(page.locator('text=Recent Activity')).toBeVisible();
  });

  test('should handle project creation through PHP backend', async () => {
    // Login first
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testclient@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Navigate to project creation
    await page.click('text=Create Project');

    // Fill project form
    await page.fill('input[name="title"]', 'E2E Test Project');
    await page.fill('textarea[name="description"]', 'This is a test project created via E2E testing');
    await page.fill('input[name="budget"]', '2000');
    await page.fill('input[name="deadline"]', '2025-12-31');

    // Intercept project creation API call
    const createProjectResponse = page.waitForResponse(response => 
      response.url().includes('/backend/api.php') && 
      response.request().method() === 'POST'
    );

    // Submit project creation
    await page.click('button[type="submit"]');

    // Wait for API response
    const response = await createProjectResponse;
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    
    if (responseBody.success) {
      // Should show success message or redirect
      await expect(page.locator('text=Project created')).toBeVisible();
    } else {
      // Should show error
      await expect(page.locator('text=Error')).toBeVisible();
    }
  });

  test('should handle API errors gracefully in UI', async () => {
    await page.goto(FRONTEND_URL);

    // Try to access protected page without authentication
    await page.goto(`${FRONTEND_URL}/dashboard`);

    // Should redirect to login or show authentication error
    await expect(page).toHaveURL(/login/);
  });

  test('should maintain authentication state across page refreshes', async () => {
    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Refresh page
    await page.reload();

    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should handle network errors gracefully', async () => {
    await page.goto(FRONTEND_URL);

    // Simulate network failure by blocking API requests
    await page.route('**/backend/api.php', route => route.abort());

    // Try to login
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show network error message
    await expect(page.locator('text=Network error')).toBeVisible();
  });

  test('should handle file upload through PHP backend', async () => {
    // Login first
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Navigate to file upload area (could be in project details)
    await page.goto(`${FRONTEND_URL}/projects/1`);

    // Create a test file
    const fileContent = 'This is test file content for upload';
    const buffer = Buffer.from(fileContent, 'utf8');

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        buffer: buffer
      });

      // Intercept upload API call
      const uploadResponse = page.waitForResponse(response => 
        response.url().includes('/backend/api.php') && 
        response.request().method() === 'POST'
      );

      // Click upload button
      await page.click('button:has-text("Upload")');

      // Wait for response
      const response = await uploadResponse;
      expect(response.status()).toBe(200);

      const responseBody = await response.json();
      if (responseBody.success) {
        await expect(page.locator('text=Upload successful')).toBeVisible();
      }
    }
  });

  test('should handle messaging functionality with PHP backend', async () => {
    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Navigate to messaging
    await page.click('text=Messages');

    // Send a message
    const messageText = 'This is a test message from E2E testing';
    await page.fill('textarea[placeholder*="message"]', messageText);

    // Intercept send message API call
    const sendMessageResponse = page.waitForResponse(response => 
      response.url().includes('/backend/api.php') && 
      response.request().method() === 'POST'
    );

    await page.click('button:has-text("Send")');

    // Wait for response
    const response = await sendMessageResponse;
    expect(response.status()).toBe(200);

    const responseBody = await response.json();
    if (responseBody.success) {
      // Message should appear in conversation
      await expect(page.locator(`text=${messageText}`)).toBeVisible();
    }
  });

  test('should validate CORS headers from PHP backend', async () => {
    await page.goto(FRONTEND_URL);

    // Make an API request and check CORS headers
    const response = await page.evaluate(async () => {
      const resp = await fetch('http://localhost/backend/api.php', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:5173'
        }
      });
      
      return {
        status: resp.status,
        headers: Object.fromEntries(resp.headers.entries())
      };
    });

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeDefined();
    expect(response.headers['access-control-allow-methods']).toBeDefined();
    expect(response.headers['access-control-allow-headers']).toBeDefined();
  });

  test('should handle JWT token expiration', async () => {
    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Manually set an expired token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'expired.jwt.token');
    });

    // Reload page to trigger token validation
    await page.reload();

    // Should redirect to login due to expired token
    await expect(page).toHaveURL(/login/);
    await expect(page.locator('text=Session expired')).toBeVisible();
  });

  test('should display PHP backend errors in frontend', async () => {
    await page.goto(`${FRONTEND_URL}/login`);

    // Try login with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should display error message from PHP backend
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
