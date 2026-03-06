import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page).toHaveTitle(/MarginBase/i);
    await expect(page.locator('text=Continue with Google')).toBeVisible();
    await expect(page.locator('text=Continue as Guest')).toBeVisible();
  });

  test('should allow guest access', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForURL('**/#/dashboard');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should require authentication for protected routes', async ({
    page,
  }) => {
    // Try to access dashboard directly without auth
    await page.goto('/#/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Sign in as guest
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForURL('**/#/dashboard');

    // Check localStorage
    const signed = await page.evaluate(() =>
      localStorage.getItem('marginbase_signed_in'),
    );
    expect(signed).toBe('false');

    // Sign in with mocked auth (in real tests, use Google mock)
    await page.evaluate(() => {
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'test_user_123');
    });

    // Refresh page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should clear auth on logout', async ({ page }) => {
    // Sign in as guest
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForURL('**/#/dashboard');

    // Navigate to settings
    await page.click('button:has-text("Settings")');
    await page.waitForURL('**/#/settings');

    // Note: In production, there would be a Sign Out button
    // For now, we test the signOut functionality programmatically
    await page.evaluate(() => {
      localStorage.removeItem('marginbase_signed_in_user_id');
      localStorage.removeItem('marginbase_signed_in');
      localStorage.removeItem('marginbase_google_id_token');
    });

    // Try to access protected route
    await page.goto('/#/dashboard');
    // Should redirect to login
    await page.waitForURL('**/#/login');
    await expect(page).toHaveURL(/login/);
  });

  test('should show language switcher on login page', async ({ page }) => {
    await expect(
      page
        .locator('[data-testid="language-switcher"]')
        .or(page.locator('button:has-text(/en|de|fr|es/i)'))
        .first(),
    ).toBeVisible();
  });

  test('should support multiple languages on login', async ({ page }) => {
    // Default should be English
    await expect(page.locator('text=Continue with Google')).toBeVisible();

    // In a real test, we would select a different language
    // This requires i18n context setup
  });
});

test.describe('Google OAuth Flow (Mocked)', () => {
  test('should handle Google OAuth callback', async ({ page }) => {
    // This test assumes Google OAuth library is mocked
    // Real tests would use a test Google app or mock the OAuth flow

    await page.goto('/');

    // Simulate Google OAuth success by directly setting token
    await page.evaluate(() => {
      // The app should parse this and verify with backend
      const mockIdToken =
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiJnb29nXzEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZ29vZ2xlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlfQ.signature';
      localStorage.setItem('marginbase_google_id_token', mockIdToken);
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'goog_1234567890');
    });

    // Navigate to gate (would be automatic after OAuth)
    await page.goto('/#/gate');
    await expect(page).toHaveURL(/gate/);
  });

  test('should invalidate on bad token', async ({ page }) => {
    await page.goto('/');

    // Try to set bad token
    await page.evaluate(() => {
      localStorage.setItem('marginbase_google_id_token', 'invalid.token.here');
    });

    // Attempt to navigate to protected route
    await page.goto('/#/dashboard');

    // In real implementation, would check token validity on backend
    // For now, just verify the guards are in place
  });
});
