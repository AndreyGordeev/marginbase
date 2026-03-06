import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EntitlementService } from '../../src/services/entitlement-service';

describe('EntitlementService', () => {
  let entitlementService: EntitlementService;

  beforeEach(() => {
    entitlementService = new EntitlementService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getOrCreateEntitlements', () => {
    it('should create new entitlements with trial for new user', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const result = entitlementService.getOrCreateEntitlements('user-new');

      expect(result).toMatchObject({
        userId: 'user-new',
        bundle: false,
        profit: true,
        breakeven: false,
        cashflow: false,
        status: 'trialing',
        source: 'unknown',
      });
      expect(result.trialEnd).toBeTruthy();
      expect(new Date(result.trialEnd!).getTime()).toBeGreaterThan(
        now.getTime(),
      );
    });

    it('should return existing entitlements for known user', () => {
      const first = entitlementService.getOrCreateEntitlements('user-existing');
      const second =
        entitlementService.getOrCreateEntitlements('user-existing');

      expect(first).toStrictEqual(second);
    });

    it('should set 14-day trial for new users', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const result = entitlementService.getOrCreateEntitlements('user-trial');

      const trialEnd = new Date(result.trialEnd!);
      const expectedEnd = new Date(now);
      expectedEnd.setDate(expectedEnd.getDate() + 14);

      expect(trialEnd.toDateString()).toBe(expectedEnd.toDateString());
    });
  });

  describe('applyBillingStatus', () => {
    it('should grant full access for active subscription', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const result = entitlementService.applyBillingStatus(
        'user-active',
        'active',
        'stripe',
        new Date('2026-04-06T12:00:00Z').toISOString(),
      );

      expect(result).toMatchObject({
        userId: 'user-active',
        bundle: true,
        profit: true,
        breakeven: true,
        cashflow: true,
        status: 'active',
        source: 'stripe',
      });
    });

    it('should grant access during trial', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const result = entitlementService.applyBillingStatus(
        'user-trialing',
        'trialing',
        'stripe',
        new Date('2026-03-20T12:00:00Z').toISOString(),
      );

      expect(result).toMatchObject({
        status: 'trialing',
        bundle: true,
        profit: true,
        breakeven: true,
        cashflow: true,
      });
      expect(result.trialEnd).toBeTruthy();
    });

    it('should maintain access during past_due grace period', () => {
      const result = entitlementService.applyBillingStatus(
        'user-past-due',
        'past_due',
        'stripe',
        new Date('2026-03-10T12:00:00Z').toISOString(),
      );

      expect(result).toMatchObject({
        status: 'past_due',
        bundle: true,
        profit: true,
        breakeven: true,
        cashflow: true,
      });
    });

    it('should revoke access when canceled', () => {
      const result = entitlementService.applyBillingStatus(
        'user-canceled',
        'canceled',
        'stripe',
        null,
      );

      expect(result).toMatchObject({
        status: 'canceled',
        bundle: false,
        profit: true, // Profit always available
        breakeven: false,
        cashflow: false,
      });
    });

    it('should track source as app_store for iOS purchases', () => {
      const result = entitlementService.applyBillingStatus(
        'user-ios',
        'active',
        'app_store',
        new Date('2026-04-06T12:00:00Z').toISOString(),
      );

      expect(result.source).toBe('app_store');
      expect(result.bundle).toBe(true);
    });

    it('should track source as google_play for Android purchases', () => {
      const result = entitlementService.applyBillingStatus(
        'user-android',
        'active',
        'google_play',
        new Date('2026-04-06T12:00:00Z').toISOString(),
      );

      expect(result.source).toBe('google_play');
      expect(result.bundle).toBe(true);
    });
  });

  describe('updateTrialStatus', () => {
    it('should keep trial active if not expired', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      // Create user with future trial end
      entitlementService.applyBillingStatus(
        'user-trial-active',
        'trialing',
        'stripe',
        new Date('2026-03-20T12:00:00Z').toISOString(),
      );

      const result = entitlementService.updateTrialStatus('user-trial-active');

      expect(result.status).toBe('trialing');
      expect(result.bundle).toBe(true);
      expect(result.breakeven).toBe(true);
      expect(result.cashflow).toBe(true);
    });

    it('should expire trial and revoke access when trial ends', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      // Create user with expired trial
      entitlementService.applyBillingStatus(
        'user-trial-expired',
        'trialing',
        'stripe',
        new Date('2026-03-01T12:00:00Z').toISOString(), // Past date
      );

      const result = entitlementService.updateTrialStatus('user-trial-expired');

      expect(result.status).toBe('canceled');
      expect(result.bundle).toBe(false);
      expect(result.profit).toBe(true); // Always available
      expect(result.breakeven).toBe(false);
      expect(result.cashflow).toBe(false);
    });

    it('should not affect active subscriptions', () => {
      entitlementService.applyBillingStatus(
        'user-active-sub',
        'active',
        'stripe',
        new Date('2026-04-06T12:00:00Z').toISOString(),
      );

      const result = entitlementService.updateTrialStatus('user-active-sub');

      expect(result.status).toBe('active');
      expect(result.bundle).toBe(true);
    });

    it('should not affect canceled subscriptions', () => {
      entitlementService.applyBillingStatus(
        'user-canceled-sub',
        'canceled',
        'stripe',
        null,
      );

      const result = entitlementService.updateTrialStatus('user-canceled-sub');

      expect(result.status).toBe('canceled');
      expect(result.bundle).toBe(false);
    });
  });

  describe('toEntitlementsResponse', () => {
    it('should format active user entitlements', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      entitlementService.applyBillingStatus(
        'user-response-active',
        'active',
        'stripe',
        new Date('2026-04-06T12:00:00Z').toISOString(),
      );

      const response = entitlementService.toEntitlementsResponse(
        'user-response-active',
      );

      expect(response).toMatchObject({
        userId: 'user-response-active',
        entitlements: {
          bundle: true,
          profit: true,
          breakeven: true,
          cashflow: true,
        },
        status: 'active',
        source: 'stripe',
      });
      expect(response.trial.active).toBe(false);
    });

    it('should format trialing user entitlements', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      entitlementService.applyBillingStatus(
        'user-response-trial',
        'trialing',
        'stripe',
        new Date('2026-03-20T12:00:00Z').toISOString(),
      );

      const response = entitlementService.toEntitlementsResponse(
        'user-response-trial',
      );

      expect(response.status).toBe('trialing');
      expect(response.trial.active).toBe(true);
      expect(response.trialEnd).toBeTruthy();
    });

    it('should format canceled user entitlements', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      entitlementService.applyBillingStatus(
        'user-response-canceled',
        'canceled',
        'stripe',
        null,
      );

      const response = entitlementService.toEntitlementsResponse(
        'user-response-canceled',
      );

      expect(response).toMatchObject({
        status: 'canceled',
        entitlements: {
          bundle: false,
          profit: true,
          breakeven: false,
          cashflow: false,
        },
      });
      expect(response.trial.active).toBe(false);
    });

    it('should update lastVerifiedAt on each call', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      entitlementService.getOrCreateEntitlements('user-verify-time');

      const response1 =
        entitlementService.toEntitlementsResponse('user-verify-time');

      vi.setSystemTime(new Date('2026-03-06T13:00:00Z'));

      const response2 =
        entitlementService.toEntitlementsResponse('user-verify-time');

      expect(response1.lastVerifiedAt).not.toBe(response2.lastVerifiedAt);
    });
  });

  describe('toBillingVerifyResponse', () => {
    it('should format iOS purchase verification response', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const response = entitlementService.toBillingVerifyResponse(
        'user-ios-verify',
        'ios',
        'com.marginbase.bundle',
      );

      expect(response).toMatchObject({
        verified: true,
        userId: 'user-ios-verify',
        entitlements: {
          bundle: true,
          profit: true,
          breakeven: true,
          cashflow: true,
        },
        subscription: {
          platform: 'ios',
          productId: 'com.marginbase.bundle',
          status: 'active',
        },
      });
    });

    it('should format Android purchase verification response', () => {
      const response = entitlementService.toBillingVerifyResponse(
        'user-android-verify',
        'android',
        'com.marginbase.cashflow',
      );

      expect(response).toMatchObject({
        verified: true,
        subscription: {
          platform: 'android',
          productId: 'com.marginbase.cashflow',
          status: 'active',
        },
      });
    });

    it('should set 30-day expiration for mobile purchases', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      const response = entitlementService.toBillingVerifyResponse(
        'user-expiry',
        'ios',
        'com.marginbase.bundle',
      );

      const expiresAt = new Date(response.subscription.expiresAt);
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 30);

      expect(expiresAt.toDateString()).toBe(expectedExpiry.toDateString());
    });
  });

  describe('deleteEntitlements', () => {
    it('should delete existing user entitlements', () => {
      entitlementService.getOrCreateEntitlements('user-to-delete');

      const deleted = entitlementService.deleteEntitlements('user-to-delete');

      expect(deleted).toBe(true);

      // Should create new entitlements after deletion
      const newEntitlements =
        entitlementService.getOrCreateEntitlements('user-to-delete');
      expect(newEntitlements.status).toBe('trialing');
    });

    it('should return false when deleting non-existent user', () => {
      const deleted =
        entitlementService.deleteEntitlements('user-non-existent');

      expect(deleted).toBe(false);
    });

    it('should reject invalid userId', () => {
      expect(() => entitlementService.deleteEntitlements('')).toThrow(
        'Invalid userId',
      );
    });
  });

  describe('negative-path hardening', () => {
    it('should reject invalid userId for read operations', () => {
      expect(() => entitlementService.getOrCreateEntitlements('   ')).toThrow(
        'Invalid userId',
      );
      expect(() => entitlementService.toEntitlementsResponse('')).toThrow(
        'Invalid userId',
      );
    });

    it('should recover from corrupted in-memory entitlement shape', () => {
      // Simulate storage corruption
      (
        entitlementService as unknown as {
          entitlements: Map<string, Record<string, unknown>>;
        }
      ).entitlements.set('corrupted-user', {
        userId: 'corrupted-user',
        // missing most fields
        profit: true,
      });

      const response =
        entitlementService.toEntitlementsResponse('corrupted-user');
      expect(response.userId).toBe('corrupted-user');
      expect(typeof response.entitlements.bundle).toBe('boolean');
      expect(typeof response.entitlements.profit).toBe('boolean');
      expect(response.lastVerifiedAt).toBeTruthy();
    });

    it('should remain consistent under concurrent entitlement updates', async () => {
      const userId = 'user-concurrent';

      const updates = await Promise.all([
        Promise.resolve(
          entitlementService.applyBillingStatus(
            userId,
            'active',
            'stripe',
            new Date('2026-04-06T12:00:00Z').toISOString(),
          ),
        ),
        Promise.resolve(
          entitlementService.applyBillingStatus(
            userId,
            'past_due',
            'stripe',
            new Date('2026-04-01T12:00:00Z').toISOString(),
          ),
        ),
      ]);

      expect(updates.length).toBe(2);
      const final = entitlementService.toEntitlementsResponse(userId);
      expect(final.entitlements.profit).toBe(true);
      expect(final.status === 'active' || final.status === 'past_due').toBe(
        true,
      );
    });
  });

  describe('profit module always available policy', () => {
    it('should grant profit access to new users', () => {
      const result = entitlementService.getOrCreateEntitlements('user-new');

      expect(result.profit).toBe(true);
      expect(result.breakeven).toBe(false);
      expect(result.cashflow).toBe(false);
    });

    it('should maintain profit access when trial expires', () => {
      const now = new Date('2026-03-06T12:00:00Z');
      vi.setSystemTime(now);

      entitlementService.applyBillingStatus(
        'user-expired',
        'trialing',
        'stripe',
        new Date('2026-03-01T12:00:00Z').toISOString(),
      );

      const result = entitlementService.updateTrialStatus('user-expired');

      expect(result.profit).toBe(true);
      expect(result.breakeven).toBe(false);
      expect(result.cashflow).toBe(false);
    });

    it('should maintain profit access when subscription canceled', () => {
      const result = entitlementService.applyBillingStatus(
        'user-canceled',
        'canceled',
        'stripe',
        null,
      );

      expect(result.profit).toBe(true);
      expect(result.breakeven).toBe(false);
      expect(result.cashflow).toBe(false);
    });
  });
});
