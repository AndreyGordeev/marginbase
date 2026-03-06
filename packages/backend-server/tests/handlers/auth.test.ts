import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { handleAuthVerify } from '../../src/handlers/auth';
import { AuthService } from '../../src/services/auth-service';

describe('handleAuthVerify', () => {
  let authService: AuthService;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    authService = new AuthService();
    mockJson = vi.fn().mockReturnThis();
    mockStatus = vi.fn().mockReturnThis();

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    mockRequest = {
      body: {},
      headers: {},
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('token extraction', () => {
    it('should extract token from request body idToken field', async () => {
      mockRequest.body = { idToken: 'body-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(authService.verifyGoogleIdToken).toHaveBeenCalledWith(
        'body-token',
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should extract token from request body googleIdToken field', async () => {
      mockRequest.body = { googleIdToken: 'google-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(authService.verifyGoogleIdToken).toHaveBeenCalledWith(
        'google-token',
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should extract token from Authorization header via middleware', async () => {
      (mockRequest as { idToken?: string }).idToken = 'header-token';
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(authService.verifyGoogleIdToken).toHaveBeenCalledWith(
        'header-token',
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
    });

    it('should prefer body token over header token', async () => {
      mockRequest.body = { idToken: 'body-token' };
      (mockRequest as { idToken?: string }).idToken = 'header-token';
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(authService.verifyGoogleIdToken).toHaveBeenCalledWith(
        'body-token',
      );
    });
  });

  describe('validation', () => {
    it('should return 400 when no token is provided', async () => {
      mockRequest.body = {};

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing or invalid idToken',
      });
    });

    it('should return 400 when token is empty string', async () => {
      mockRequest.body = { idToken: '' };

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing or invalid idToken',
      });
    });

    it('should return 400 when token is whitespace only', async () => {
      mockRequest.body = { idToken: '   ' };

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing or invalid idToken',
      });
    });

    it('should return 400 when token is not a string', async () => {
      mockRequest.body = { idToken: 123 };

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Missing or invalid idToken',
      });
    });
  });

  describe('successful verification', () => {
    it('should return 200 with user data on successful verification', async () => {
      mockRequest.body = { idToken: 'valid-token' };
      const mockVerificationResult = {
        userId: 'google-user-123',
        email: 'john@example.com',
        emailVerified: true,
      };

      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue(
        mockVerificationResult,
      );

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        userId: 'google-user-123',
        email: 'john@example.com',
        emailVerified: true,
        provider: 'google',
        verifiedAt: expect.any(String),
      });
    });

    it('should include ISO timestamp in response', async () => {
      mockRequest.body = { idToken: 'valid-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.verifiedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });

    it('should handle null email in verification result', async () => {
      mockRequest.body = { idToken: 'valid-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue({
        userId: 'user-456',
        email: null,
        emailVerified: false,
      });

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      const responseData = mockJson.mock.calls[0][0];
      expect(responseData.email).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return 500 when AuthService throws an error', async () => {
      mockRequest.body = { idToken: 'invalid-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockRejectedValue(
        new Error('Token verification failed'),
      );

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Token verification failed',
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockRequest.body = { idToken: 'bad-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockRejectedValue(
        'String error',
      );

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Unknown error',
      });
    });

    it('should log error to console', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockRequest.body = { idToken: 'error-token' };
      const testError = new Error('Verification service unavailable');
      vi.spyOn(authService, 'verifyGoogleIdToken').mockRejectedValue(testError);

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Auth verify handler error:',
        testError,
      );
    });

    it('should return 401 when AuthService returns null/undefined', async () => {
      mockRequest.body = { idToken: 'expired-token' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockResolvedValue(
        null as never,
      );

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });
  });

  describe('security', () => {
    it('should not leak token in error messages', async () => {
      mockRequest.body = { idToken: 'secret-token-12345' };
      vi.spyOn(authService, 'verifyGoogleIdToken').mockRejectedValue(
        new Error('Invalid signature'),
      );

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      const responseData = mockJson.mock.calls[0][0];
      expect(JSON.stringify(responseData)).not.toContain('secret-token-12345');
    });

    it('should validate token before calling AuthService', async () => {
      mockRequest.body = { idToken: null };
      const verifySpy = vi.spyOn(authService, 'verifyGoogleIdToken');

      const handler = handleAuthVerify(authService);
      await handler(mockRequest as Request, mockResponse as Response);

      expect(verifySpy).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });
});
