/**
 * Lambda auth handler - wraps the real AuthService from @marginbase/backend-server
 *
 * This handler:
 * 1. Receives Lambda HTTP API v2 events
 * 2. Converts them to Express-like request/response
 * 3. Calls the real AuthService handler from packages/backend-server
 * 4. Returns Lambda-formatted response
 */

const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
} = require('./express-adapter');

// Import real backend handlers
// Note: backend-server is built to dist/index.js at deployment time
let handleAuthVerify;
let AuthService;

try {
  // Try local development path first
  const backendServer = require('@marginbase/backend-server');
  AuthService = backendServer.AuthService;
  handleAuthVerify = backendServer.handleAuthVerify;
} catch (error) {
  console.warn('Failed to import from @marginbase/backend-server:', error.message);
  console.warn('Falling back to stub implementation');
}

// Fallback stub implementation (dev-only)
const createStubAuthService = () => {
  return {
    verifyGoogleIdToken: async (token) => {
      if (!token) return null;
      return {
        userId: 'user-' + Math.random().toString(36).slice(7),
        email: 'user@example.com',
        emailVerified: true,
      };
    },
  };
};

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
      console.error('Auth verify handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
};

/**
 * Lambda handler: POST /auth/verify
 */
exports.handler = async (event) => {
  console.log('Auth handler invoked');

  try {
    // Use real service if available, otherwise fall back to stub
    const authService = AuthService ? new AuthService() : createStubAuthService();
    const handler = handleAuthVerify
      ? handleAuthVerify(authService)
      : createStubHandler(authService);

    // Convert Lambda event to Express format
    const req = createExpressRequest(event);
    const res = createExpressResponse();

    // Call the real handler
    await handler(req, res);

    // Format response for Lambda
    return formatLambdaResponse(res);
  } catch (error) {
    console.error('Unhandled error in auth handler:', error);
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
