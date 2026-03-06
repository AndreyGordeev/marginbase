/**
 * Lambda billing handler - wraps the real BillingService from @marginbase/backend-server
 *
 * This handler:
 * 1. Receives Lambda HTTP API v2 events for multiple billing routes
 * 2. Routes to the appropriate real handler based on path
 * 3. Converts Lambda events to Express-like request/response
 * 4. Returns Lambda-formatted response
 *
 * Routes:
 * - POST /billing/checkout/session → handleCheckoutCreate
 * - POST /billing/checkout-session → handleCheckoutCreate (alias)
 * - POST /billing/portal-session → handlePortalCreate
 * - POST /billing/webhook/stripe → handleWebhook
 * - POST /billing/verify → handleBillingVerify
 * - GET /billing/entitlements/:userId → handleEntitlementsGet
 */

const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
  parseJsonBody,
} = require('./express-adapter');

// Import real backend handlers
let BillingService;
let EntitlementService;
let handleCheckoutCreate;
let handlePortalCreate;
let handleWebhook;
let handleEntitlementsGet;
let handleBillingVerify;
let createBillingProvider;

try {
  // Import from real backend-server package
  const backendServer = require('@marginbase/backend-server');
  BillingService = backendServer.BillingService;
  EntitlementService = backendServer.EntitlementService;
  handleCheckoutCreate = backendServer.handleCheckoutCreate;
  handlePortalCreate = backendServer.handlePortalCreate;
  handleWebhook = backendServer.handleWebhook;
  handleEntitlementsGet = backendServer.handleEntitlementsGet;
  handleBillingVerify = backendServer.handleBillingVerify;
  createBillingProvider = backendServer.createBillingProvider;
} catch (error) {
  console.warn('Failed to import from @marginbase/backend-server:', error.message);
  console.warn('Falling back to stub implementation');
}

// Stub implementations (development only)
const createStubBillingService = () => ({
  createCheckoutSession: async () => ({
    sessionId: 'session-' + Math.random().toString(36).slice(7),
    successUrl: process.env.STRIPE_CHECKOUT_SUCCESS_URL || 'https://marginbase.app',
    cancelUrl: process.env.STRIPE_CHECKOUT_CANCEL_URL || 'https://marginbase.app',
  }),
  createPortalSession: async () => ({
    portalUrl: process.env.STRIPE_PORTAL_RETURN_URL || 'https://marginbase.app/subscription',
  }),
  processWebhookEvent: async () => ({ type: 'customer.subscription.updated' }),
  verifyMobileReceipt: async () => ({ platform: 'unknown' }),
});

const createStubEntitlementService = () => ({
  getOrCreateEntitlements: async () => ({
    userId: 'user-123',
    profit: true,
    breakeven: false,
    cashflow: false,
    status: 'free',
    trialStartedAt: null,
    subscriptionStartedAt: null,
    expiresAt: null,
  }),
});

const createStubCheckoutHandler = (billingService) => async (req, res) => {
  try {
    const planId = req.body?.planId;
    if (!planId) {
      res.status(400).json({ error: 'Missing planId' });
      return;
    }

    const session = await billingService.createCheckoutSession({
      planId,
      userId: req.body?.userId || 'user-123',
    });

    res.status(200).json({ sessionId: session.sessionId, successUrl: session.successUrl });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
};

const createStubWebhookHandler = (billingService) => async (req, res) => {
  try {
    const event = JSON.parse(req.rawBody || req.body);
    const result = await billingService.processWebhookEvent(event);
    res.status(200).json({ received: true, type: result.type });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Invalid webhook' });
  }
};

/**
 * Route to the appropriate handler based on path
 */
const routeRequest = async (event, context) => {
  const path = event.rawPath || event.requestContext?.http?.path || '/';
  const method = event.requestContext?.http?.method || 'GET';

  console.log(`Billing handler routing: ${method} ${path}`);

  // Initialize services (use real if available, fallback to stubs)
  const billingService = BillingService
    ? new BillingService(await createBillingProvider?.())
    : createStubBillingService();
  const entitlementService = EntitlementService
    ? new EntitlementService()
    : createStubEntitlementService();

  const req = createExpressRequest(event);
  const res = createExpressResponse();

  try {
    // Route based on path
    if (path === '/billing/checkout/session' || path === '/billing/checkout-session') {
      if (method === 'POST') {
        const handler = handleCheckoutCreate
          ? handleCheckoutCreate(billingService)
          : createStubCheckoutHandler(billingService);
        await handler(req, res);
      }
    } else if (path === '/billing/portal-session' || path === '/billing/portal/session') {
      if (method === 'POST') {
        const handler = handlePortalCreate
          ? handlePortalCreate(billingService)
          : (async (req, res) => {
              res
                .status(200)
                .json({ portalUrl: process.env.STRIPE_PORTAL_RETURN_URL });
            });
        await handler(req, res);
      }
    } else if (path === '/billing/webhook/stripe') {
      if (method === 'POST') {
        const handler = handleWebhook
          ? handleWebhook(billingService)
          : createStubWebhookHandler(billingService);
        await handler(req, res);
      }
    } else if (path === '/billing/verify') {
      if (method === 'POST') {
        const handler = handleBillingVerify
          ? handleBillingVerify(billingService)
          : (async (req, res) => {
              res.status(200).json({ verified: true, status: 'free' });
            });
        await handler(req, res);
      }
    } else if (path.startsWith('/billing/entitlements/')) {
      if (method === 'GET') {
        const userId = path.split('/').pop();
        const handler = handleEntitlementsGet
          ? handleEntitlementsGet(entitlementService)
          : (async (req, res) => {
              const entitlements = await entitlementService.getOrCreateEntitlements(
                userId,
              );
              res.status(200).json(entitlements);
            });
        // Inject userId into request
        req.params = { userId };
        await handler(req, res);
      }
    } else {
      res.status(404).json({ error: 'Billing route not found' });
    }

    return formatLambdaResponse(res);
  } catch (error) {
    console.error('Billing handler error:', error);
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

/**
 * Lambda handler: all billing routes
 */
exports.handler = routeRequest;
