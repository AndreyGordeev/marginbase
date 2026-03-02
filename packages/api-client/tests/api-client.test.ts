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
});