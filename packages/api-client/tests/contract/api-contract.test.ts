import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, MarginbaseApiClient } from '../../src';
import { findForbiddenKeyPaths } from '../../../../scripts/privacy-forbidden-keys';

const jsonResponse = (status: number, body: unknown): Response => {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as Response;
};

describe('api contracts', () => {
  it('uses canonical endpoint paths and methods', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/verify')) {
        return jsonResponse(200, {
          userId: 'u_1',
          email: 'user@example.com',
          emailVerified: true,
          provider: 'google',
          verifiedAt: '2026-03-04T10:00:00.000Z'
        });
      }

      if (url.endsWith('/entitlements')) {
        return jsonResponse(200, {
          userId: 'u_1',
          lastVerifiedAt: '2026-03-04T10:00:00.000Z',
          entitlements: { bundle: true, profit: true, breakeven: false, cashflow: false },
          status: 'trialing',
          source: 'stripe',
          currentPeriodEnd: '2026-04-04T10:00:00.000Z',
          trialEnd: '2026-03-11T10:00:00.000Z',
          trial: { active: true, expiresAt: '2026-03-11T10:00:00.000Z' }
        });
      }

      if (url.endsWith('/telemetry/batch')) {
        return jsonResponse(200, {
          accepted: true,
          count: 1,
          objectKey: 'telemetry/obj_1.json'
        });
      }

      if (url.endsWith('/billing/verify')) {
        return jsonResponse(200, {
          verified: true,
          userId: 'u_1',
          lastVerifiedAt: '2026-03-04T10:00:00.000Z',
          entitlements: { bundle: true, profit: true, breakeven: true, cashflow: true },
          subscription: {
            platform: 'ios',
            productId: 'bundle_monthly',
            status: 'active',
            expiresAt: '2026-04-04T10:00:00.000Z'
          }
        });
      }

      if (url.endsWith('/billing/checkout/session')) {
        return jsonResponse(200, {
          checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123'
        });
      }

      if (url.endsWith('/billing/portal-session')) {
        return jsonResponse(200, {
          portalUrl: 'https://billing.stripe.com/p/session/test_123'
        });
      }

      if (url.endsWith('/account/delete')) {
        return jsonResponse(200, {
          deleted: true,
          userId: 'u_1',
          deletedEntitlements: true,
          deletedUserProfile: true
        });
      }

      if (url.endsWith('/share/create')) {
        return jsonResponse(200, {
          token: 'share_1',
          expiresAt: '2026-03-11T10:00:00.000Z'
        });
      }

      if (url.includes('/share/list?userId=')) {
        return jsonResponse(200, {
          items: [
            {
              token: 'share_1',
              module: 'profit',
              createdAt: '2026-03-04T10:00:00.000Z',
              expiresAt: '2026-03-11T10:00:00.000Z'
            }
          ]
        });
      }

      if (url.includes('/share/')) {
        return jsonResponse(200, {
          encryptedSnapshot: {
            schemaVersion: 1,
            algorithm: 'A256GCM',
            ivBase64Url: 'iv',
            ciphertextBase64Url: 'cipher'
          }
        });
      }

      return jsonResponse(404, { code: 'NOT_FOUND', message: 'not found' });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });

    await client.verifyAuthToken({ googleIdToken: 'google-token' });
    await client.refreshEntitlements('google-token');
    await client.sendTelemetryBatch({ userId: 'u_1', events: [{ name: 'app_opened', timestamp: '2026-03-04T10:00:00.000Z' }] });
    await client.verifyBillingPurchase({
      userId: 'u_1',
      platform: 'ios',
      productId: 'bundle_monthly',
      receiptToken: 'receipt_1'
    });
    await client.createCheckoutSession({ planId: 'bundle', userId: 'u_1', email: 'user@example.com' });
    await client.createBillingPortalSession({ userId: 'u_1', returnUrl: 'https://marginbase.com/account' });
    await client.deleteAccount({ userId: 'u_1' });
    await client.createShareSnapshot({
      encryptedSnapshot: {
        schemaVersion: 1,
        algorithm: 'A256GCM',
        ivBase64Url: 'iv',
        ciphertextBase64Url: 'cipher'
      },
      expiresInDays: 7,
      ownerUserId: 'u_1'
    });
    await client.getShareSnapshot('share_1');
    await client.deleteShareSnapshot('share_1', 'google-token');
    await client.listShareSnapshots('u_1');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/auth/verify',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/entitlements',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/telemetry/batch',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/billing/verify',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/billing/checkout/session',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/billing/portal-session',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/account/delete',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/share/create',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/share/share_1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/share/share_1',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.marginbase.test/share/list?userId=u_1',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('sends bearer authorization only for authenticated flows', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/entitlements')) {
        return jsonResponse(200, {
          userId: 'u_1',
          lastVerifiedAt: '2026-03-04T10:00:00.000Z',
          entitlements: { bundle: true, profit: true, breakeven: false, cashflow: false },
          status: 'active',
          source: 'stripe',
          currentPeriodEnd: null,
          trialEnd: null,
          trial: { active: false, expiresAt: '2026-03-04T10:00:00.000Z' }
        });
      }

      if (url.includes('/share/share_1')) {
        return jsonResponse(200, {
          revoked: true,
          token: 'share_1'
        });
      }

      return jsonResponse(200, {
        userId: 'u_1',
        email: 'user@example.com',
        emailVerified: true,
        provider: 'google',
        verifiedAt: '2026-03-04T10:00:00.000Z'
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });

    await client.verifyAuthToken({ googleIdToken: 'id-token-1' });
    await client.refreshEntitlements('id-token-2');
    await client.deleteShareSnapshot('share_1', 'id-token-3');

    const authVerifyCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/auth/verify'));
    const entitlementsCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/entitlements'));
    const deleteShareCall = fetchMock.mock.calls.find(
      (call) => String(call[0]).includes('/share/share_1') && (call[1] as { method?: string })?.method === 'DELETE'
    );

    expect((authVerifyCall?.[1] as { headers?: Record<string, string> }).headers?.authorization).toBe('Bearer id-token-1');
    expect((entitlementsCall?.[1] as { headers?: Record<string, string> }).headers?.authorization).toBe('Bearer id-token-2');
    expect((deleteShareCall?.[1] as { headers?: Record<string, string> }).headers?.authorization).toBe('Bearer id-token-3');
  });

  it('maps error response shape consistently for 401/403/429/500', async () => {
    const statuses = [401, 403, 429, 500];

    for (const status of statuses) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          return jsonResponse(status, {
            code: `ERR_${status}`,
            message: `Failure ${status}`
          });
        })
      );

      const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });
      await expect(client.refreshEntitlements('token')).rejects.toMatchObject<ApiClientError>({
        status,
        code: `ERR_${status}`,
        message: `Failure ${status}`
      });
    }
  });

  it('posts encrypted share payload without plaintext snapshot fields', async () => {
    const fetchMock = vi.fn(async () => {
      return jsonResponse(200, {
        token: 'share_1',
        expiresAt: '2026-03-11T10:00:00.000Z'
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });

    await client.createShareSnapshot({
      encryptedSnapshot: {
        schemaVersion: 1,
        algorithm: 'A256GCM',
        ivBase64Url: 'iv',
        ciphertextBase64Url: 'cipher'
      },
      ownerUserId: 'u_1',
      expiresInDays: 7
    });

    const createCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith('/share/create'));
    const body = JSON.parse((createCall?.[1] as { body?: string }).body ?? '{}') as Record<string, unknown>;

    expect(body.encryptedSnapshot).toBeDefined();
    expect(body.snapshot).toBeUndefined();
    expect(body.inputData).toBeUndefined();
  });

  it('keeps request bodies free of forbidden financial key names', async () => {
    const capturedBodies: Array<Record<string, unknown>> = [];
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body;
      if (typeof body === 'string' && body.trim().startsWith('{')) {
        capturedBodies.push(JSON.parse(body) as Record<string, unknown>);
      }

      return jsonResponse(200, {
        checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123',
        portalUrl: 'https://billing.stripe.com/p/session/test_123',
        accepted: true,
        count: 1,
        objectKey: 'telemetry/obj_1.json',
        token: 'share_1',
        expiresAt: '2026-03-11T10:00:00.000Z'
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = new MarginbaseApiClient({ baseUrl: 'https://api.marginbase.test' });

    await client.createCheckoutSession({
      planId: 'bundle',
      userId: 'u_1',
      email: 'user@example.com'
    });

    await client.createBillingPortalSession({
      userId: 'u_1',
      returnUrl: 'https://marginbase.com/account'
    });

    await client.sendTelemetryBatch({
      userId: 'u_1',
      events: [
        {
          name: 'module_opened',
          timestamp: '2026-03-04T10:00:00.000Z',
          attributes: { moduleId: 'profit' }
        }
      ]
    });

    await client.createShareSnapshot({
      encryptedSnapshot: {
        schemaVersion: 1,
        algorithm: 'A256GCM',
        ivBase64Url: 'iv',
        ciphertextBase64Url: 'cipher'
      },
      ownerUserId: 'u_1',
      expiresInDays: 7
    });

    expect(capturedBodies.length).toBeGreaterThan(0);

    for (const body of capturedBodies) {
      const forbiddenPaths = findForbiddenKeyPaths(body);
      expect(forbiddenPaths).toEqual([]);
    }
  });
});
