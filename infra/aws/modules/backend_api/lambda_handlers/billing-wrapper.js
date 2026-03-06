/**
 * Lambda billing handler - delegates to real @marginbase/backend-server
 *
 * This handler processes multiple billing routes by delegating to the real
 * backend services when available, with fallback to existing implementation.
 *
 * Routes handled:
 * - POST /billing/checkout/session
 * - POST /billing/checkout-session (alias)
 * - POST /billing/portal-session
 * - POST /billing/webhook/stripe
 * - POST /billing/verify
 * - GET /billing/entitlements/:userId
 */

const crypto = require('node:crypto');
const { parseJsonBody, response } = require('./common');
const {
  getRecord,
  putRecord,
  toEntitlementRecord,
  getWebhookEvent,
  putWebhookEvent,
  getUserBillingProfile,
  putUserBillingProfile,
} = require('./billing-store');
const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
} = require('./express-adapter');

// Try to load real backend services
let BillingService;
let EntitlementService;
let createBillingProvider;
let realHandlers;
let backendAvailable = false;

try {
  const backend = require('@marginbase/backend-server');
  BillingService = backend.BillingService;
  EntitlementService = backend.EntitlementService;
  createBillingProvider = backend.createBillingProvider;
  realHandlers = {
    handleCheckoutCreate: backend.handleCheckoutCreate,
    handlePortalCreate: backend.handlePortalCreate,
    handleWebhook: backend.handleWebhook,
    handleEntitlementsGet: backend.handleEntitlementsGet,
    handleBillingVerify: backend.handleBillingVerify,
  };
  backendAvailable = !!BillingService;
  if (backendAvailable) {
    console.log('[billing.handler] Using real @marginbase/backend-server');
  }
} catch (error) {
  console.warn('[billing.handler] Backend-server not available, using fallback:', error.message);
}

// Existing stub implementations (keep for compatibility)
const nowIso = () => new Date().toISOString();

const planToProductId = (planId) => {
  if (planId === 'profit') return 'profit_monthly';
  if (planId === 'breakeven') return 'breakeven_monthly';
  if (planId === 'cashflow') return 'cashflow_monthly';
  if (planId === 'bundle') return 'bundle_monthly';
  return '';
};

const getPlanPriceId = (planId) => {
  const envMap = {
    profit: 'STRIPE_PRICE_PROFIT',
    breakeven: 'STRIPE_PRICE_BREAKEVEN',
    cashflow: 'STRIPE_PRICE_CASHFLOW',
    bundle: 'STRIPE_PRICE_BUNDLE',
  };

  const envName = envMap[planId];
  if (!envName) return '';

  const value = process.env[envName];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
};

const getCheckoutSuccessUrl = () => {
  const value = process.env.STRIPE_CHECKOUT_SUCCESS_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:5173/?checkout=success';
};

const getCheckoutCancelUrl = () => {
  const value = process.env.STRIPE_CHECKOUT_CANCEL_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:5173/?checkout=cancel';
};

const getBillingPortalReturnUrl = (requested) => {
  if (typeof requested === 'string' && requested.trim()) return requested.trim();
  const value = process.env.STRIPE_PORTAL_RETURN_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : 'http://localhost:5173/#/settings';
};

const buildFallbackCheckoutUrl = ({ planId, userId }) => {
  return `https://checkout.stripe.com/c/pay/cs_test_${encodeURIComponent(planId)}_${encodeURIComponent(userId)}`;
};

// Fallback handlers for when backend-server is not available
const fallbackHandleCheckoutSession = async (event) => {
  const body = parseJsonBody(event);
  const { planId, userId, email } = body;

  if (!planId || !userId || !email) {
    return response(400, { error: 'Missing planId, userId, or email' });
  }

  // If no Stripe key, return fallback URL
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('[billing.handler] Using development fallback checkout URL');
    return response(200, {
      checkoutUrl: buildFallbackCheckoutUrl({ planId, userId }),
    });
  }

  // Would normally call Stripe here, but delegating to real backend
  return response(500, { error: 'Real backend-server required for Stripe integration' });
};

const fallbackHandleWebhook = async (event) => {
  const body = parseJsonBody(event);
  console.log('[billing.handler] Webhook received (fallback)');

  // Just acknowledge receipt
  return response(200, { received: true });
};

const fallbackGetEntitlements = async (event, userId) => {
  try {
    const record = await getRecord(userId);
    if (!record) {
      return response(404, { error: 'User not found' });
    }

    return response(200, record);
  } catch (error) {
    console.error('Error fetching entitlements:', error);
    return response(500, { error: 'Failed to fetch entitlements' });
  }
};

/**
 * Route the request to the appropriate handler
 */
const routeRequest = async (event) => {
  const method = event.requestContext?.http?.method || 'GET';
  const path = event.rawPath || event.requestContext?.http?.path || '/';

  console.log(`[billing.handler] ${method} ${path}`);

  // Try to use real backend first
  if (backendAvailable) {
    try {
      const req = createExpressRequest(event);
      const res = createExpressResponse();

      // Initialize services
      const provider = await createBillingProvider?.();
      const billingService = new BillingService(provider);
      const entitlementService = new EntitlementService();

      // Route to handler
      if (path === '/billing/checkout/session' || path === '/billing/checkout-session') {
        if (method === 'POST' && realHandlers.handleCheckoutCreate) {
          const handler = realHandlers.handleCheckoutCreate(billingService);
          await handler(req, res);
          return formatLambdaResponse(res);
        }
      } else if (path === '/billing/portal-session' || path === '/billing/portal/session') {
        if (method === 'POST' && realHandlers.handlePortalCreate) {
          const handler = realHandlers.handlePortalCreate(billingService);
          await handler(req, res);
          return formatLambdaResponse(res);
        }
      } else if (path === '/billing/webhook/stripe') {
        if (method === 'POST' && realHandlers.handleWebhook) {
          const handler = realHandlers.handleWebhook(billingService);
          await handler(req, res);
          return formatLambdaResponse(res);
        }
      } else if (path === '/billing/verify') {
        if (method === 'POST' && realHandlers.handleBillingVerify) {
          const handler = realHandlers.handleBillingVerify(billingService);
          await handler(req, res);
          return formatLambdaResponse(res);
        }
      } else if (path.startsWith('/billing/entitlements/')) {
        if (method === 'GET' && realHandlers.handleEntitlementsGet) {
          const userId = path.split('/').pop();
          req.params = { userId };
          const handler = realHandlers.handleEntitlementsGet(entitlementService);
          await handler(req, res);
          return formatLambdaResponse(res);
        }
      }
    } catch (error) {
      console.error('[billing.handler] Real backend error, falling back:', error.message);
      // Fall through to fallback handlers
    }
  }

  // Fallback handlers
  if (path === '/billing/checkout/session' || path === '/billing/checkout-session') {
    if (method === 'POST') {
      return await fallbackHandleCheckoutSession(event);
    }
  } else if (path === '/billing/portal-session' || path === '/billing/portal/session') {
    if (method === 'POST') {
      return response(200, {
        portalUrl: getBillingPortalReturnUrl(
          parseJsonBody(event)?.returnUrl,
        ),
      });
    }
  } else if (path === '/billing/webhook/stripe') {
    if (method === 'POST') {
      return await fallbackHandleWebhook(event);
    }
  } else if (path === '/billing/verify') {
    if (method === 'POST') {
      return response(200, { verified: true, status: 'free' });
    }
  } else if (path.startsWith('/billing/entitlements/')) {
    if (method === 'GET') {
      const userId = path.split('/').pop();
      return await fallbackGetEntitlements(event, userId);
    }
  }

  return response(404, { error: 'Route not found' });
};

/**
 * Lambda handler: all billing routes
 */
exports.handler = async (event) => {
  try {
    const result = await routeRequest(event);
    return result;
  } catch (error) {
    console.error('[billing.handler] Unhandled error:', error);
    return response(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
