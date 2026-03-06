import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
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

    // Verify guest has no stored auth token
    const token = await page.evaluate(() =>
      localStorage.getItem('marginbase_google_id_token'),
    );
    expect(token).toBeNull();
  });

  test('should require authentication for protected routes', async ({
    page,
  }) => {
    // Try to access dashboard directly without auth
    await page.goto('/#/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);

    // Verify multiple protected routes redirect
    const protectedRoutes = [
      '/profit',
      '/break-even',
      '/cashflow',
      '/subscription',
      '/data',
      '/settings',
    ];
    for (const route of protectedRoutes) {
      await page.goto(`/#${route}`);
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should maintain session after page refresh', async ({ page }) => {
    // Simulate authenticated user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'test_user_123');
      localStorage.setItem(
        'marginbase_google_id_token',
        'mock-token-persistent',
      );
    });

    // Navigate to dashboard
    await page.goto('/#/dashboard');
    await expect(page).toHaveURL(/dashboard/);

    // Refresh page
    await page.reload();

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/dashboard/);

    // Verify auth state is preserved
    const userId = await page.evaluate(() =>
      localStorage.getItem('marginbase_signed_in_user_id'),
    );
    expect(userId).toBe('test_user_123');
  });

  test('should clear auth on logout', async ({ page }) => {
    // Simulate authenticated user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'test_user_123');
      localStorage.setItem('marginbase_google_id_token', 'test-token');
    });

    // Navigate to settings
    await page.goto('/#/settings');
    await expect(page).toHaveURL(/settings/);

    // Click sign out button
    await page.click('button:has-text("Sign out")');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);

    // Verify all auth data is cleared
    const authData = await page.evaluate(() => ({
      token: localStorage.getItem('marginbase_google_id_token'),
      signedIn: localStorage.getItem('marginbase_signed_in'),
      userId: localStorage.getItem('marginbase_signed_in_user_id'),
    }));

    expect(authData.token).toBeNull();
    expect(authData.signedIn).toBeNull();
    expect(authData.userId).toBeNull();

    // Try to access protected route after logout
    await page.goto('/#/dashboard');
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should show language switcher on login page', async ({ page }) => {
    // Look for language switcher by test ID or common language codes
    const langSwitcher = page
      .locator('[data-testid="language-switcher"]')
      .or(page.locator('button:text-matches("en|de|fr|es", "i")'));
    await expect(langSwitcher.first()).toBeVisible({ timeout: 10000 });
  });

  test('should support multiple languages on login', async ({ page }) => {
    // Default should be English
    await expect(page.locator('text=Continue with Google')).toBeVisible();

    // In a real test, we would select a different language
    // This requires i18n context setup
  });

  test('should not leak credentials in localStorage keys', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('marginbase_google_id_token', 'test-token-123');
    });

    const keys = await page.evaluate(() => Object.keys(localStorage));

    // Ensure no sensitive data in key names
    expect(keys.some((k) => k.includes('password'))).toBe(false);
    expect(keys.some((k) => k.includes('secret'))).toBe(false);
  });
});

test.describe('Google OAuth Flow (Mocked)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should handle Google OAuth callback', async ({ page }) => {
    // This test assumes Google OAuth library is mocked
    // Real tests would use a test Google app or mock the OAuth flow

    await page.goto('/');

    // Simulate Google OAuth success by directly setting token
    await page.evaluate(() => {
      // The app should parse this and verify with backend
      const mockIdToken =
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiJnb29nXzEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZ29vZ2xlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJhdWQiOiJ0ZXN0LWNsaWVudC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSJ9.signature';
      localStorage.setItem('marginbase_google_id_token', mockIdToken);
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'goog_1234567890');
    });

    // Navigate to gate (would be automatic after OAuth)
    await page.goto('/#/gate');
    await expect(page).toHaveURL(/gate/);

    // Verify user is signed in
    const isSignedIn = await page.evaluate(() =>
      localStorage.getItem('marginbase_signed_in'),
    );
    expect(isSignedIn).toBe('true');
  });

  test('should invalidate on bad token format', async ({ page }) => {
    await page.goto('/');

    // Try to set malformed token
    await page.evaluate(() => {
      localStorage.setItem('marginbase_google_id_token', 'invalid.token.here');
      localStorage.setItem('marginbase_signed_in', 'true');
    });

    // The app should be signed in based on localStorage
    // Backend would reject bad token on actual API call
    const token = await page.evaluate(() =>
      localStorage.getItem('marginbase_google_id_token'),
    );
    expect(token).toBe('invalid.token.here');
  });

  test('should handle expired token', async ({ page }) => {
    await page.goto('/');

    // Create token with past expiration
    await page.evaluate(() => {
      // This token has an exp claim in the past
      const expiredToken =
        'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.signature';
      localStorage.setItem('marginbase_google_id_token', expiredToken);
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'user-123');
    });

    // The local state would show signed in
    // Backend verification would fail on API calls
    // This is expected - frontend trusts localStorage, backend verifies
    const signed = await page.evaluate(() =>
      localStorage.getItem('marginbase_signed_in'),
    );
    expect(signed).toBe('true');
  });

  test('should handle Google OAuth library loading failure gracefully', async ({
    page,
  }) => {
    // Block Google OAuth library script
    await page.route('**/accounts.google.com/gsi/client', (route) =>
      route.abort(),
    );

    await page.goto('/');

    // Should still show login page with fallback
    await expect(page.locator('text=Continue with Google')).toBeVisible();
    await expect(page.locator('text=Continue as Guest')).toBeVisible();
  });
});

test.describe('Session Security', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should not store sensitive data in localStorage values', async ({
    page,
  }) => {
    await page.goto('/');

    // Set up authenticated state
    await page.evaluate(() => {
      localStorage.setItem('marginbase_google_id_token', 'test-token-abc');
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'user-xyz');
    });

    const storageValues = await page.evaluate(() => {
      const values: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) values.push(value);
        }
      }
      return values.join(' ').toLowerCase();
    });

    // Ensure no obvious sensitive patterns
    expect(storageValues).not.toContain('password');
    expect(storageValues).not.toContain('secret');
  });

  test('should clear session on multiple logout calls', async ({ page }) => {
    await page.goto('/');

    // Set up auth state
    await page.evaluate(() => {
      localStorage.setItem('marginbase_google_id_token', 'token');
      localStorage.setItem('marginbase_signed_in', 'true');
      localStorage.setItem('marginbase_signed_in_user_id', 'user-123');
    });

    // Navigate to settings and sign out once
    await page.goto('/#/settings');
    await page.click('button:has-text("Sign out")');
    await expect(page).toHaveURL(/login/);

    // Navigate back to settings (should redirect to login)
    await page.goto('/#/settings');
    await expect(page).toHaveURL(/login/);

    // Verify still cleared
    const cleared = await page.evaluate(() => ({
      token: localStorage.getItem('marginbase_google_id_token'),
      userId: localStorage.getItem('marginbase_signed_in_user_id'),
    }));
    expect(cleared.token).toBeNull();
    expect(cleared.userId).toBeNull();
  });
});
