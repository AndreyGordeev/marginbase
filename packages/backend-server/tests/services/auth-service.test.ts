import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../src/services/auth-service';

describe('AuthService', () => {
  let authService: AuthService;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    authService = new AuthService();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('verifyGoogleIdToken', () => {
    describe('production mode (tokeninfo)', () => {
      beforeEach(() => {
        process.env.GOOGLE_VERIFICATION_MODE = 'tokeninfo';
        process.env.GOOGLE_CLIENT_IDS =
          'client1.apps.googleusercontent.com,client2.apps.googleusercontent.com';
      });

      it('should successfully verify valid token from Google', async () => {
        const mockTokenInfo = {
          sub: 'google-user-123',
          email: 'test@example.com',
          email_verified: true,
          aud: 'client1.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenInfo,
        });

        const result = await authService.verifyGoogleIdToken('valid-token');

        expect(result).toEqual({
          userId: 'google-user-123',
          email: 'test@example.com',
          emailVerified: true,
        });
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('tokeninfo'),
          expect.any(Object),
        );
      });

      it('should reject token with invalid audience', async () => {
        const mockTokenInfo = {
          sub: 'google-user-123',
          email: 'test@example.com',
          email_verified: true,
          aud: 'wrong-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenInfo,
        });

        await expect(
          authService.verifyGoogleIdToken('invalid-audience-token'),
        ).rejects.toThrow('audience is not allowed');
      });

      it('should reject token with invalid issuer', async () => {
        const mockTokenInfo = {
          sub: 'google-user-123',
          email: 'test@example.com',
          email_verified: true,
          aud: 'client1.apps.googleusercontent.com',
          iss: 'https://evil-issuer.com',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenInfo,
        });

        await expect(
          authService.verifyGoogleIdToken('invalid-issuer-token'),
        ).rejects.toThrow('verification failed');
      });

      it('should reject token without subject', async () => {
        const mockTokenInfo = {
          email: 'test@example.com',
          aud: 'client1.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenInfo,
        });

        await expect(
          authService.verifyGoogleIdToken('no-subject-token'),
        ).rejects.toThrow('verification failed');
      });

      it('should handle Google tokeninfo API errors', async () => {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => ({ error: 'invalid_token' }),
        });

        await expect(
          authService.verifyGoogleIdToken('bad-token'),
        ).rejects.toThrow();
      });

      it('should handle network errors', async () => {
        global.fetch = vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'));

        await expect(
          authService.verifyGoogleIdToken('network-fail-token'),
        ).rejects.toThrow('Network error');
      });

      it('should accept token when no audiences configured', async () => {
        delete process.env.GOOGLE_CLIENT_IDS;
        delete process.env.VITE_GOOGLE_CLIENT_ID;

        const mockTokenInfo = {
          sub: 'google-user-456',
          email: 'any@example.com',
          email_verified: true,
          aud: 'any-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
          exp: String(Math.floor(Date.now() / 1000) + 3600),
        };

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenInfo,
        });

        const result = await authService.verifyGoogleIdToken('any-token');

        expect(result.userId).toBe('google-user-456');
      });
    });

    describe('development mode', () => {
      it('should decode JWT without verification', async () => {
        process.env.GOOGLE_VERIFICATION_MODE = 'development';
        process.env.GOOGLE_CLIENT_IDS =
          'dev-client.apps.googleusercontent.com';
        const devAuthService = new AuthService();

        // Real JWT structure (header.payload.signature) with base64url encoding
        const header = Buffer.from(
          JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
        ).toString('base64url');
        const payload = Buffer.from(
          JSON.stringify({
            sub: 'dev-user-789',
            email: 'dev@example.com',
            email_verified: true,
            aud: 'dev-client.apps.googleusercontent.com',
            iss: 'https://accounts.google.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ).toString('base64url');
        const signature = 'fake-signature';

        const token = `${header}.${payload}.${signature}`;

        const result = await devAuthService.verifyGoogleIdToken(token);

        expect(result).toEqual({
          userId: 'dev-user-789',
          email: 'dev@example.com',
          emailVerified: true,
        });
      });

      it('should reject malformed JWT in development mode', async () => {
        process.env.GOOGLE_VERIFICATION_MODE = 'development';
        const devAuthService = new AuthService();

        await expect(
          devAuthService.verifyGoogleIdToken('not.a.valid.jwt'),
        ).rejects.toThrow();
      });

      it('should reject JWT with wrong audience in development mode', async () => {
        process.env.GOOGLE_VERIFICATION_MODE = 'development';
        process.env.GOOGLE_CLIENT_IDS =
          'dev-client.apps.googleusercontent.com';
        const devAuthService = new AuthService();
        const header = Buffer.from(
          JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
        ).toString('base64url');
        const payload = Buffer.from(
          JSON.stringify({
            sub: 'dev-user-789',
            email: 'dev@example.com',
            aud: 'wrong-audience',
            iss: 'https://accounts.google.com',
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ).toString('base64url');
        const signature = 'fake-signature';

        const token = `${header}.${payload}.${signature}`;

        await expect(devAuthService.verifyGoogleIdToken(token)).rejects.toThrow(
          'audience is not allowed',
        );
      });
    });
  });
});
