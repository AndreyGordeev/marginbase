/**
 * Lambda auth handler - uses real AuthService from @marginbase/backend-server
 *
 * This handler now delegates to the real backend-server implementation.
 * If backend-server is not available, falls back to inline stub.
 */

const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
} = require('./express-adapter');

// Dynamic import fallback
let AuthService;
let handleAuthVerify;
let backendAvailable = false;

try {
  // Try to require from backend-server in node_modules or locally
  const backend = require('@marginbase/backend-server');
  AuthService = backend.AuthService;
  handleAuthVerify = backend.handleAuthVerify;
  backendAvailable = true;
  console.log('✓ Using real AuthService from @marginbase/backend-server');
} catch (error) {
  console.warn(
    '[STUB MODE] Backend-server not available, using development stub:',
    error.message
  );
}

// Development stub implementation
const createStubAuthService = () => {
  const DEFAULT_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

  const isTrustedIssuer = (issuer) => {
    return issuer === 'accounts.google.com' || issuer === 'https://accounts.google.com';
  };

  const verifyWithGoogleTokenInfo = async (idToken) => {
    const tokenInfoUrl = process.env.GOOGLE_TOKENINFO_URL ?? DEFAULT_TOKENINFO_URL;
    const requestUrl = `${tokenInfoUrl}?id_token=${encodeURIComponent(idToken)}`;

    const verificationResponse = await fetch(requestUrl, {
      method: 'GET',
    });

    if (!verificationResponse.ok) {
      return null;
    }

    return verificationResponse.json();
  };

  return {
    verifyGoogleIdToken: async (idToken) => {
      const tokenInfo = await verifyWithGoogleTokenInfo(idToken);
      if (!tokenInfo) {
        return null;
      }

      const audience = tokenInfo?.aud;
      const issuer = tokenInfo?.iss;
      const subject = tokenInfo?.sub;

      if (!subject || !audience || !isTrustedIssuer(issuer)) {
        return null;
      }

      const allowedAudiences = (process.env.GOOGLE_CLIENT_IDS ?? '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      if (allowedAudiences.length > 0 && !allowedAudiences.includes(audience)) {
        return null;
      }

      return {
        userId: subject,
        email: tokenInfo.email ?? null,
        emailVerified: tokenInfo.email_verified === 'true',
      };
    },
  };
};

// Stub handler factory
const createStubHandler = (authService) => {
  return async (req, res) => {
    try {
      const bodyToken = req.body?.idToken || req.body?.googleIdToken;
      const idToken = bodyToken;

      if (typeof idToken !== 'string' || !idToken.trim()) {
        res.status(400).json({ error: 'Missing or invalid idToken' });
        return;
      }

      const verified = await authService.verifyGoogleIdToken(idToken);

      if (!verified) {
        res.status(401).json({ error: 'Invalid or expired token' });
        return;
      }

      const response = {
        userId: verified.userId,
        email: verified.email,
        emailVerified: verified.emailVerified,
        provider: 'google',
        verifiedAt: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Auth handler error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
};

/**
 * Lambda handler: POST /auth/verify
 * Uses real backend if available, otherwise development stub
 */
exports.handler = async (event) => {
  console.log('[auth.handler] Invoked');

  try {
    // Create service (real or stub)
    const authService = AuthService ? new AuthService() : createStubAuthService();

    // Create handler (real or stub)
    const handler = handleAuthVerify
      ? handleAuthVerify(authService)
      : createStubHandler(authService);

    // Convert Lambda event to Express format
    const req = createExpressRequest(event);
    const res = createExpressResponse();

    // Call the handler
    await handler(req, res);

    // Format response for Lambda
    return formatLambdaResponse(res);
  } catch (error) {
    console.error('[auth.handler] unhandled error:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
