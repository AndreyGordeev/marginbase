import type { Request, Response } from 'express';
import type { AuthVerifyResponse } from '@marginbase/api-client';
import { AuthService } from '../services/auth-service';

/**
 * POST /auth/verify - Verify Google ID token
 */
export function handleAuthVerify(authService: AuthService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      // Support both request body fields and Authorization header
      const bodyToken = (req.body as { idToken?: string; googleIdToken?: string }).idToken
        || (req.body as { idToken?: string; googleIdToken?: string }).googleIdToken;
      const headerToken = (req as { idToken?: string }).idToken; // From bearerTokenMiddleware
      const idToken = bodyToken || headerToken;

      if (typeof idToken !== 'string' || !idToken.trim()) {
        res.status(400).json({ error: 'Missing or invalid idToken' });
        return;
      }

      const verified = await authService.verifyGoogleIdToken(idToken);

      if (!verified) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const response: AuthVerifyResponse = {
        userId: verified.userId,
        email: verified.email,
        emailVerified: verified.emailVerified,
        provider: 'google',
        verifiedAt: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Auth verify handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}
