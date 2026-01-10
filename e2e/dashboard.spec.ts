import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 * 
 * Verifies the main dashboard loads and displays facility data correctly.
 * These are smoke tests to catch regressions.
 */

test.describe('Dashboard', () => {
  test('loads and displays facility count', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('text=Data Center', { timeout: 30000 });
    
    // Check that facility count is displayed (should be > 0)
    const totalText = await page.textContent('body');
    expect(totalText).toContain('Total');
    
    // Should not show "$0 / 0 facilities" (indicates data load failure)
    expect(totalText).not.toContain('$0 / 0 facilities');
  });

  test('displays subsidy gap', async ({ page }) => {
    await page.goto('/');
    
    // Wait for data to load
    await page.waitForSelector('text=TOTAL SUBSIDY GAP', { timeout: 30000 });
    
    // Subsidy gap should be visible and > $0
    const subsidyText = await page.textContent('body');
    expect(subsidyText).toMatch(/\$[\d.]+[BMK]/); // Matches $5.53B, $4.75M, etc.
  });

  test('has working navigation tabs', async ({ page }) => {
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForSelector('text=Overview', { timeout: 30000 });
    
    // Check that main tabs exist (use role to avoid duplicates)
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Facilities' })).toBeVisible();
  });
});
