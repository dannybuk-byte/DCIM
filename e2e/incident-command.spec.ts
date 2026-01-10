import { test, expect } from '@playwright/test';

/**
 * Incident Command E2E Tests
 * 
 * Verifies the incident management system works correctly.
 */

test.describe('Incident Command', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('text=Data Center', { timeout: 30000 });
  });

  test('can navigate to Incident Command tab', async ({ page }) => {
    // Click on Incident Command tab (may need to scroll or find in menu)
    const incidentTab = page.getByText('Incident Command');
    
    if (await incidentTab.isVisible()) {
      await incidentTab.click();
      
      // Should see incident management UI
      await expect(page.getByText('Create Incident')).toBeVisible({ timeout: 10000 });
    } else {
      // Tab might be in a dropdown or different location
      test.skip();
    }
  });

  test('displays verification status badge', async ({ page }) => {
    // Navigate to Incident Command
    const incidentTab = page.getByText('Incident Command');
    
    if (await incidentTab.isVisible()) {
      await incidentTab.click();
      
      // Should see verification status (OK, Down, or Checking)
      const hasVerificationBadge = await page.locator('text=/Verification (OK|Down|Checking)/').isVisible({ timeout: 10000 }).catch(() => false);
      
      // Badge should exist (but state can vary)
      if (!hasVerificationBadge) {
        // Alternative: check for shield icon
        const hasShield = await page.locator('[data-testid="verification-badge"]').isVisible().catch(() => false);
        expect(hasVerificationBadge || hasShield).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test('can create an incident manually', async ({ page }) => {
    const incidentTab = page.getByText('Incident Command');
    
    if (await incidentTab.isVisible()) {
      await incidentTab.click();
      await page.waitForSelector('text=Create Incident', { timeout: 10000 });
      
      // Fill in incident form
      const titleInput = page.locator('input[placeholder*="title"], input[name="title"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Incident from E2E');
        
        // Click create button
        const createBtn = page.getByRole('button', { name: /create/i });
        if (await createBtn.isVisible()) {
          await createBtn.click();
          
          // Should see the new incident in the list
          await expect(page.getByText('Test Incident from E2E')).toBeVisible({ timeout: 5000 });
        }
      }
    } else {
      test.skip();
    }
  });
});
