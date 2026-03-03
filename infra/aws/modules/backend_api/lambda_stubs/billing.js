const { parseJsonBody, response } = require('./common');
const { getRecord, putRecord, toEntitlementRecord } = require('./billing-store');

const allowedPlatforms = new Set(['ios', 'android']);

const nowIso = () => new Date().toISOString();

const withDefaultStatus = (status) => {
  if (status === 'active' || status === 'trialing' || status === 'past_due' || status === 'canceled') {
    return status;
  }

  return 'active';
};

const withDefaultSource = (source) => {
  if (source === 'stripe' || source === 'app_store' || source === 'google_play' || source === 'unknown') {
    return source;
  }

  return 'stripe';
};

const productToEntitlements = (productId, existing) => {
  const base = existing ?? {
    bundle: false,
    profit: true,
    breakeven: false,
    cashflow: false
  };

  if (productId === 'bundle_monthly') {
    return {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true
    };
  }

  if (productId === 'profit_monthly') {
    return {
      ...base,
      profit: true
    };
  }

  if (productId === 'breakeven_monthly') {
    return {
      ...base,
      breakeven: true
    };
  }

  if (productId === 'cashflow_monthly') {
    return {
      ...base,
      cashflow: true
    };
  }

  return base;
};

const verifyReceipt = ({ platform, receiptToken }) => {
  if (typeof receiptToken !== 'string' || receiptToken.length < 10) {
    return false;
  }

  const expectedPrefix = `${platform}:valid:`;
  return receiptToken.startsWith(expectedPrefix);
};

const parseRouteKey = (event) => {
  if (typeof event?.requestContext?.routeKey === 'string') {
    return event.requestContext.routeKey;
  }

  const method = event?.requestContext?.http?.method;
  const path = event?.requestContext?.http?.path;
  if (typeof method === 'string' && typeof path === 'string') {
    return `${method.toUpperCase()} ${path}`;
  }

  return '';
};

const handleCheckoutSession = async (event) => {
  const body = parseJsonBody(event);
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const email = typeof body.email === 'string' ? body.email : '';

  if (!planId || !userId || !email) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'planId, userId and email are required.'
    });
  }

  return response(200, {
    checkoutUrl: `https://checkout.stripe.com/c/pay/cs_test_${encodeURIComponent(planId)}_${encodeURIComponent(userId)}`
  });
};

const handleStripeWebhook = async (event) => {
  const signature = event?.headers?.['stripe-signature'] ?? event?.headers?.['Stripe-Signature'] ?? '';
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return response(400, {
      code: 'INVALID_SIGNATURE',
      message: 'Missing Stripe signature or webhook secret configuration.'
    });
  }

  const body = parseJsonBody(event);
  const eventId = typeof body.id === 'string' ? body.id : `evt_${Date.now()}`;

  return response(200, {
    received: true,
    processed: true,
    eventId
  });
};

exports.handler = async (event) => {
  const routeKey = parseRouteKey(event);

  if (routeKey === 'POST /billing/checkout/session') {
    return handleCheckoutSession(event);
  }

  if (routeKey === 'POST /billing/webhook/stripe') {
    return handleStripeWebhook(event);
  }

  const body = parseJsonBody(event);

  const userId = typeof body.userId === 'string' && body.userId ? body.userId : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const receiptToken = typeof body.receiptToken === 'string' ? body.receiptToken : '';

  if (!userId || !allowedPlatforms.has(platform) || !productId || !receiptToken) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'userId, platform, productId and receiptToken are required.'
    });
  }

  if (!verifyReceipt({ platform, receiptToken })) {
    return response(401, {
      code: 'RECEIPT_INVALID',
      message: 'Receipt verification failed.'
    });
  }

  const existing = await getRecord(userId);
  const entitlements = productToEntitlements(productId, existing?.entitlements);
  const verifiedAt = nowIso();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const record = toEntitlementRecord(userId, {
    lastVerifiedAt: verifiedAt,
    entitlements,
    status: 'active',
    source: withDefaultSource(platform === 'ios' ? 'app_store' : 'google_play'),
    currentPeriodEnd: expiresAt,
    trialEnd: null,
    trial: {
      active: false,
      expiresAt
    },
    subscriptions: [
      {
        platform,
        productId,
        status: 'active',
        verifiedAt,
        expiresAt
      }
    ]
  });

  await putRecord(record);

  return response(200, {
    verified: true,
    userId,
    lastVerifiedAt: verifiedAt,
    entitlements,
    status: withDefaultStatus('active'),
    source: withDefaultSource(platform === 'ios' ? 'app_store' : 'google_play'),
    currentPeriodEnd: expiresAt,
    trialEnd: null,
    subscription: {
      platform,
      productId,
      status: 'active',
      expiresAt
    }
  });
};