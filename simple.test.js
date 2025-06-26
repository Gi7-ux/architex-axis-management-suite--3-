const { test, expect } = require('@playwright/test');

test('should click the button', async ({ page }) => {
  await page.goto('http://localhost:5173/simple.html');
  await page.click('#test-button');
});
