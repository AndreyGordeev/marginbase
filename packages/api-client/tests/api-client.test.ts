import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, MarginbaseApiClient } from '../src';

const jsonResponse = (status: number, body: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
};

describe('MarginbaseApiClient', () => {
  it('refreshes entitlements successfully', async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse(200, {
        userId: 'u-1',
        lastVerifiedAt: '2026-03-02T10:00:00.000Z',
        entitlements: {
          bundle: true,
          profit: true,
          breakeven: true,
          cashflow: true
        },
        status: 'trialing',
        source: 'stripe',
        currentPeriodEnd: '2026-04-02T10:00:00.000Z',
        trialEnd: '2026-04-01T10:00:00.000Z',
        trial: {
          active: false,
          expiresAt: '2026-03-16T10:00:00.000Z'
        }
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });
    const result = await client.refreshEntitlements('google-token');

    expect(result.entitlements.bundle).toBe(true);
    expect(result.status).toBe('trialing');
    expect(result.source).toBe('stripe');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/entitlements',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('verifies auth token and returns user profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return jsonResponse(200, {
          userId: 'google-sub',
          email: 'user@example.com',
          emailVerified: true,
          provider: 'google',
          verifiedAt: '2026-03-02T10:00:00.000Z'
        });
      })
    );

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test/' });
    const result = await client.verifyAuthToken({ googleIdToken: 'token-value' });

    expect(result.userId).toBe('google-sub');
    expect(result.provider).toBe('google');
  });

  it('throws typed errors on API failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return jsonResponse(401, {
          code: 'UNAUTHORIZED',
          message: 'Google token verification failed.'
        });
      })
    );

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });

    await expect(client.verifyAuthToken({ googleIdToken: 'bad-token' })).rejects.toMatchObject<ApiClientError>({
      status: 401,
      code: 'UNAUTHORIZED'
    });
  });

  it('verifies billing purchase and returns entitlement update payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return jsonResponse(200, {
          verified: true,
          userId: 'u-2',
          lastVerifiedAt: '2026-03-02T10:00:00.000Z',
          entitlements: {
            bundle: true,
            profit: true,
            breakeven: true,
            cashflow: true
          },
          subscription: {
            platform: 'ios',
            productId: 'bundle_monthly',
            status: 'active',
            expiresAt: '2026-04-01T10:00:00.000Z'
          }
        });
      })
    );

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });
    const result = await client.verifyBillingPurchase({
      userId: 'u-2',
      platform: 'ios',
      productId: 'bundle_monthly',
      receiptToken: 'ios:valid:receipt-1'
    });

    expect(result.verified).toBe(true);
    expect(result.subscription.platform).toBe('ios');
    expect(result.entitlements.bundle).toBe(true);
  });

  it('creates stripe checkout session and returns checkout url', async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse(200, {
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123'
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });
    const result = await client.createCheckoutSession({
      planId: 'bundle',
      userId: 'u-2',
      email: 'user@example.com'
    });

    expect(result.checkoutUrl).toContain('checkout.stripe.com');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/billing/checkout/session',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('deletes account and returns deletion flags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return jsonResponse(200, {
          deleted: true,
          userId: 'u-2',
          deletedEntitlements: true,
          deletedUserProfile: true
        });
      })
    );

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });
    const result = await client.deleteAccount({ userId: 'u-2' });

    expect(result.deleted).toBe(true);
    expect(result.deletedEntitlements).toBe(true);
    expect(result.deletedUserProfile).toBe(true);
  });
});