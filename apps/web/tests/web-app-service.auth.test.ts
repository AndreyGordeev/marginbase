import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebAppService } from '../src/web-app-service';
import type {
  AuthVerifyResponse,
  EntitlementsResponse,
} from '@marginbase/api-client';

const createMockToken = (expiresInSeconds: number): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .toString('base64')
    .replace(/=/g, '');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'user-123',
      email: 'test@example.com',
      exp,
    }),
  )
    .toString('base64')
    .replace(/=/g, '');
  return `${header}.${payload}.signature`;
};

describe('WebAppService - Authentication', () => {
  let service: WebAppService;
  let mockApiClient: {
    verifyAuthToken: ReturnType<typeof vi.fn>;
    refreshEntitlements: ReturnType<typeof vi.fn>;
    deleteAccount: ReturnType<typeof vi.fn>;
  };

  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage[key] || null,
        setItem: (key: string, value: string) => {
          mockLocalStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockLocalStorage[key];
        },
        clear: () => {
          Object.keys(mockLocalStorage).forEach(
            (key) => delete mockLocalStorage[key],
          );
        },
      },
      writable: true,
    });

    // Create mock API client
    mockApiClient = {
      verifyAuthToken: vi.fn(),
      refreshEntitlements: vi.fn(),
      deleteAccount: vi.fn(),
    };

    // Create service with mock API client
    const mockRepository = {
      upsertScenario: vi.fn(),
      getScenario: vi.fn(),
      listAllScenarios: vi.fn().mockResolvedValue([]),
      deleteScenario: vi.fn(),
      replaceAllScenarios: vi.fn(),
    };

    service = new WebAppService(
      mockRepository as never,
      mockApiClient as never,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach(
      (key) => delete mockLocalStorage[key],
    );
  });

  describe('isSignedIn', () => {
    it('should return false when no token is stored', () => {
      expect(service.isSignedIn()).toBe(false);
    });

    it('should return true when Google ID token is stored and not expired', () => {
      const token = createMockToken(3600);
      mockLocalStorage['marginbase_google_id_token'] = token;
      expect(service.isSignedIn()).toBe(true);
    });

    it('should return true when legacy signed_in flag is set', () => {
      mockLocalStorage['marginbase_signed_in'] = 'true';
      expect(service.isSignedIn()).toBe(true);
    });

    it('should return false for empty token string', () => {
      mockLocalStorage['marginbase_google_id_token'] = '  ';
      expect(service.isSignedIn()).toBe(false);
    });

    it('should return false and clear state for expired token', () => {
      const expiredToken = createMockToken(-3600);
      mockLocalStorage['marginbase_google_id_token'] = expiredToken;
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.isSignedIn()).toBe(false);
      expect(mockLocalStorage['marginbase_google_id_token']).toBeUndefined();
    });
  });

  describe('signInWithGoogle', () => {
    const mockIdToken = createMockToken(3600);
    const mockAuthResponse: AuthVerifyResponse = {
      userId: 'google-user-123',
      email: 'john@example.com',
      emailVerified: true,
      provider: 'google',
      verifiedAt: '2026-03-06T12:00:00Z',
    };
    const mockEntitlementsResponse: EntitlementsResponse = {
      userId: 'google-user-123',
      lastVerifiedAt: '2026-03-06T12:00:00Z',
      entitlements: {
        bundle: false,
        profit: true,
        breakeven: true,
        cashflow: false,
      },
      status: 'active',
      source: 'stripe',
      currentPeriodEnd: '2026-04-06T12:00:00Z',
      trialEnd: null,
      trial: {
        active: false,
        expiresAt: '2026-03-13T12:00:00Z',
      },
    };

    it('should successfully sign in with valid Google token', async () => {
      mockApiClient.verifyAuthToken.mockResolvedValue(mockAuthResponse);
      mockApiClient.refreshEntitlements.mockResolvedValue(
        mockEntitlementsResponse,
      );

      const result = await service.signInWithGoogle(mockIdToken);

      expect(result).toEqual({
        userId: 'google-user-123',
        email: 'john@example.com',
      });
      expect(mockApiClient.verifyAuthToken).toHaveBeenCalledWith({
        googleIdToken: mockIdToken,
      });
      expect(mockApiClient.refreshEntitlements).toHaveBeenCalledWith(
        mockIdToken,
      );
      expect(mockLocalStorage['marginbase_google_id_token']).toBe(mockIdToken);
      expect(mockLocalStorage['marginbase_signed_in']).toBe('true');
      expect(mockLocalStorage['marginbase_signed_in_user_id']).toBe(
        'google-user-123',
      );
    });

    it('should throw error when backend auth verification fails', async () => {
      mockApiClient.verifyAuthToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.signInWithGoogle(mockIdToken)).rejects.toThrow(
        'Invalid token',
      );
      expect(mockLocalStorage['marginbase_google_id_token']).toBeUndefined();
    });

    it('should handle null email in auth response', async () => {
      const responseWithoutEmail: AuthVerifyResponse = {
        ...mockAuthResponse,
        email: null,
      };
      mockApiClient.verifyAuthToken.mockResolvedValue(responseWithoutEmail);
      mockApiClient.refreshEntitlements.mockResolvedValue(
        mockEntitlementsResponse,
      );

      const result = await service.signInWithGoogle(mockIdToken);

      expect(result.email).toBeNull();
    });
  });

  describe('signOut', () => {
    beforeEach(() => {
      const token = createMockToken(3600);
      mockLocalStorage['marginbase_google_id_token'] = token;
      mockLocalStorage['marginbase_signed_in'] = 'true';
      mockLocalStorage['marginbase_signed_in_user_id'] = 'user-123';
    });

    it('should clear all auth data from localStorage', () => {
      service.signOut();

      expect(mockLocalStorage['marginbase_google_id_token']).toBeUndefined();
      expect(mockLocalStorage['marginbase_signed_in']).toBeUndefined();
      expect(mockLocalStorage['marginbase_signed_in_user_id']).toBeUndefined();
    });

    it('should reset entitlement cache to default', () => {
      service.signOut();

      const cache = service.getEntitlementCache();
      // Default entitlement includes profit (free tier)
      expect(cache.entitlementSet.bundle).toBe(false);
      expect(cache.entitlementSet.profit).toBe(true);
      expect(cache.entitlementSet.breakeven).toBe(false);
      expect(cache.entitlementSet.cashflow).toBe(false);
    });

    it('should result in isSignedIn returning false', () => {
      service.signOut();

      expect(service.isSignedIn()).toBe(false);
    });
  });

  describe('getIdToken', () => {
    it('should return null when no token is stored', () => {
      expect(service.getIdToken()).toBeNull();
    });

    it('should return token when stored and not expired', () => {
      const validToken = createMockToken(3600);
      mockLocalStorage['marginbase_google_id_token'] = validToken;
      expect(service.getIdToken()).toBe(validToken);
    });

    it('should return null and clear state for expired token', () => {
      const expiredToken = createMockToken(-100);
      mockLocalStorage['marginbase_google_id_token'] = expiredToken;
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.getIdToken()).toBeNull();
      expect(mockLocalStorage['marginbase_signed_in']).toBeUndefined();
    });
  });

  describe('token expiration and validation', () => {
    it('should detect expired token', () => {
      const expiredToken = createMockToken(-3600);
      mockLocalStorage['marginbase_google_id_token'] = expiredToken;
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.isSignedIn()).toBe(false);
    });

    it('should handle token without expiration claim', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256' }))
        .toString('base64')
        .replace(/=/g, '');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'user-no-exp',
          email: 'noexp@example.com',
        }),
      )
        .toString('base64')
        .replace(/=/g, '');
      const tokenWithoutExp = `${header}.${payload}.signature`;

      mockLocalStorage['marginbase_google_id_token'] = tokenWithoutExp;
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.isSignedIn()).toBe(true);
    });

    it('should consider token expired 60 seconds before actual expiration', () => {
      const almostExpiredToken = createMockToken(30);
      mockLocalStorage['marginbase_google_id_token'] = almostExpiredToken;
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.isSignedIn()).toBe(false);
    });

    it('should handle malformed token gracefully', () => {
      mockLocalStorage['marginbase_google_id_token'] = 'not.a.valid.jwt';
      mockLocalStorage['marginbase_signed_in'] = 'true';

      expect(service.isSignedIn()).toBe(false);
    });
  });

  describe('integration with entitlements', () => {
    it('should refresh entitlements after successful sign-in', async () => {
      const mockIdToken = createMockToken(3600);
      const mockAuthResponse: AuthVerifyResponse = {
        userId: 'entitled-user',
        email: 'entitled@example.com',
        emailVerified: true,
        provider: 'google',
        verifiedAt: '2026-03-06T12:00:00Z',
      };
      const mockEntitlementsResponse: EntitlementsResponse = {
        userId: 'entitled-user',
        lastVerifiedAt: '2026-03-06T12:00:00Z',
        entitlements: {
          bundle: true,
          profit: true,
          breakeven: true,
          cashflow: true,
        },
        status: 'active',
        source: 'stripe',
        currentPeriodEnd: '2027-03-06T12:00:00Z',
        trialEnd: null,
        trial: {
          active: false,
          expiresAt: '2026-03-13T12:00:00Z',
        },
      };

      mockApiClient.verifyAuthToken.mockResolvedValue(mockAuthResponse);
      mockApiClient.refreshEntitlements.mockResolvedValue(
        mockEntitlementsResponse,
      );

      await service.signInWithGoogle(mockIdToken);

      const cache = service.getEntitlementCache();
      expect(cache.entitlementSet.bundle).toBe(true);
      expect(cache.entitlementSet.profit).toBe(true);
      expect(cache.entitlementSet.breakeven).toBe(true);
      expect(cache.entitlementSet.cashflow).toBe(true);
    });

    it('should allow module access based on refreshed entitlements', async () => {
      const mockIdToken = createMockToken(3600);
      const mockAuthResponse: AuthVerifyResponse = {
        userId: 'entitled-user',
        email: 'entitled@example.com',
        emailVerified: true,
        provider: 'google',
        verifiedAt: '2026-03-06T12:00:00Z',
      };
      const mockEntitlementsResponse: EntitlementsResponse = {
        userId: 'entitled-user',
        lastVerifiedAt: '2026-03-06T12:00:00Z',
        entitlements: {
          bundle: false,
          profit: true,
          breakeven: true,
          cashflow: false,
        },
        status: 'active',
        source: 'stripe',
        currentPeriodEnd: '2027-03-06T12:00:00Z',
        trialEnd: null,
        trial: {
          active: false,
          expiresAt: '2026-03-13T12:00:00Z',
        },
      };

      mockApiClient.verifyAuthToken.mockResolvedValue(mockAuthResponse);
      mockApiClient.refreshEntitlements.mockResolvedValue(
        mockEntitlementsResponse,
      );

      await service.signInWithGoogle(mockIdToken);

      expect(service.canOpenModule('profit')).toBe(true);
      expect(service.canOpenModule('breakeven')).toBe(true);
      expect(service.canOpenModule('cashflow')).toBe(false);
    });
  });
});
