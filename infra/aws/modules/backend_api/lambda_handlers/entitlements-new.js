/**
 * Lambda entitlements handler - wraps the real EntitlementService from @marginbase/backend-server
 *
 * This handler:
 * 1. Receives Lambda HTTP API v2 events for entitlements
 * 2. Converts them to Express-like request/response
 * 3. Calls the real EntitlementService from packages/backend-server
 * 4. Returns Lambda-formatted response
 *
 * Routes:
 * - GET /entitlements → get current user's entitlements
 */

const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
} = require('./express-adapter');

// Import real backend handlers
let EntitlementService;
let handleEntitlementsGet;

try {
  // Import from real backend-server package
  const backendServer = require('@marginbase/backend-server');
  EntitlementService = backendServer.EntitlementService;
  handleEntitlementsGet = backendServer.handleEntitlementsGet;
} catch (error) {
  console.warn('Failed to import from @marginbase/backend-server:', error.message);
  console.warn('Falling back to stub implementation');
}

// Stub implementation (development only)
const createStubEntitlementService = () => ({
  getOrCreateEntitlements: async (userId) => ({
    userId: userId || 'user-123',
    profit: true,
    breakeven: false,
    cashflow: false,
    bundle: false,
    status: 'free',
    trial: null,
    subscription: null,
    refreshedAt: new Date().toISOString(),
  }),
});

const createStubHandler = (entitlementService) => async (req, res) => {
  try {
    // Get userId from authorization header or request context
    const userId =
      req.headers['x-user-id'] ||
      req.headers['x-marginbase-user-id'] ||
      req.body?.userId ||
      'anonymous';

    const entitlements = await entitlementService.getOrCreateEntitlements(userId);

    res.status(200).json(entitlements);
  } catch (error) {
    console.error('Entitlements handler error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

/**
 * Lambda handler: GET /entitlements
 */
exports.handler = async (event) => {
  console.log('Entitlements handler invoked');

  try {
    // Use real service if available, otherwise fall back to stub
    const entitlementService = EntitlementService
      ? new EntitlementService()
      : createStubEntitlementService();
    const handler = handleEntitlementsGet
      ? handleEntitlementsGet(entitlementService)
      : createStubHandler(entitlementService);

    // Convert Lambda event to Express format
    const req = createExpressRequest(event);
    const res = createExpressResponse();

    // Call the handler
    await handler(req, res);

    // Format response for Lambda
    return formatLambdaResponse(res);
  } catch (error) {
    console.error('Unhandled error in entitlements handler:', error);
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
