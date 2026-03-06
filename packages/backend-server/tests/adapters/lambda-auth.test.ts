import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAuthLambdaEvent } from '../../src/adapters/lambda';
import type { AuthVerifyResponse } from '@marginbase/api-client';

describe('handleAuthLambdaEvent', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.GOOGLE_VERIFICATION_MODE = 'development';
    process.env.GOOGLE_CLIENT_IDS = 'test-client.apps.googleusercontent.com';
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('token extraction from Lambda event', () => {
    it('should extract token from body', async () => {
      const event = {
        body: JSON.stringify({ idToken: 'test-token-from-body' }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      // Mock JWT for dev mode
      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;
      event.body = JSON.stringify({ idToken: devModeToken });

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as AuthVerifyResponse;
      expect(body.userId).toBe('user-123');
      expect(body.email).toBe('test@example.com');
      expect(body.provider).toBe('google');
    });

    it('should extract token from Authorization header', async () => {
      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'user-456',
          email: 'header@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: '',
        headers: {
          authorization: `Bearer ${devModeToken}`,
        },
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as AuthVerifyResponse;
      expect(body.userId).toBe('user-456');
    });

    it('should return 400 when no token provided', async () => {
      const event = {
        body: '{}',
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Missing or invalid');
    });
  });

  describe('response format', () => {
    it('should return proper Lambda response structure', async () => {
      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'user-789',
          email: 'format@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: JSON.stringify({ idToken: devModeToken }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('headers');
      expect(response).toHaveProperty('body');
      expect(response.headers['content-type']).toBe('application/json');
      expect(typeof response.body).toBe('string');
    });

    it('should return valid JSON in body', async () => {
      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'user-abc',
          email: 'json@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: JSON.stringify({ idToken: devModeToken }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(() => JSON.parse(response.body)).not.toThrow();
      const parsedBody = JSON.parse(response.body);
      expect(parsedBody).toHaveProperty('userId');
    });
  });

  describe('error handling', () => {
    it('should handle malformed JWT', async () => {
      const event = {
        body: JSON.stringify({ idToken: 'not.a.valid.jwt.token' }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing subject in token', async () => {
      const mockToken = Buffer.from(
        JSON.stringify({
          // Missing 'sub' claim
          email: 'nosub@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: JSON.stringify({ idToken: devModeToken }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid audience', async () => {
      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'user-wrong-aud',
          email: 'wrongaud@example.com',
          email_verified: true,
          aud: 'wrong-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: JSON.stringify({ idToken: devModeToken }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('audience');
    });
  });

  describe('development mode', () => {
    it('should accept tokens in development mode without Google verification', async () => {
      process.env.GOOGLE_VERIFICATION_MODE = 'development';

      const mockToken = Buffer.from(
        JSON.stringify({
          sub: 'dev-user-123',
          email: 'dev@example.com',
          email_verified: true,
          aud: 'test-client.apps.googleusercontent.com',
          iss: 'https://accounts.google.com',
        }),
      ).toString('base64');

      const devModeToken = `header.${mockToken}.signature`;

      const event = {
        body: JSON.stringify({ idToken: devModeToken }),
        headers: {},
        requestContext: {
          http: {
            method: 'POST',
            path: '/auth/verify',
          },
        },
      };

      const response = await handleAuthLambdaEvent(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as AuthVerifyResponse;
      expect(body.userId).toBe('dev-user-123');
    });
  });
});
