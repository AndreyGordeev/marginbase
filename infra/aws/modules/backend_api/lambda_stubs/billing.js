const { parseJsonBody, response } = require('./common');
const { getRecord, putRecord, toEntitlementRecord, getWebhookEvent, putWebhookEvent } = require('./billing-store');

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

const planToProductId = (planId) => {
  if (planId === 'profit') {
    return 'profit_monthly';
  }

  if (planId === 'breakeven') {
    return 'breakeven_monthly';
  }

  if (planId === 'cashflow') {
    return 'cashflow_monthly';
  }

  if (planId === 'bundle') {
    return 'bundle_monthly';
  }

  return '';
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
  const eventType = typeof body.type === 'string' ? body.type : 'unknown';
  const payloadObject = typeof body.data?.object === 'object' && body.data?.object !== null ? body.data.object : {};

  const existingEvent = await getWebhookEvent(eventId);
  if (existingEvent) {
    return response(200, {
      received: true,
      processed: false,
      idempotent: true,
      eventId
    });
  }

  const metadata = typeof payloadObject.metadata === 'object' && payloadObject.metadata !== null ? payloadObject.metadata : {};
  const userId =
    (typeof metadata.userId === 'string' && metadata.userId) ||
    (typeof body.userId === 'string' && body.userId) ||
    (typeof payloadObject.client_reference_id === 'string' && payloadObject.client_reference_id) ||
    '';

  const existing = userId ? await getRecord(userId) : null;

  if (userId) {
    let nextStatus = withDefaultStatus(existing?.status);
    let nextEntitlements = existing?.entitlements ?? {
      bundle: false,
      profit: true,
      breakeven: false,
      cashflow: false
    };
    let nextCurrentPeriodEnd = existing?.currentPeriodEnd ?? null;
    let nextTrialEnd = existing?.trialEnd ?? null;

    const objectStatus = withDefaultStatus(payloadObject.status);
    const metadataPlanId = typeof metadata.planId === 'string' ? metadata.planId : '';
    const productId = planToProductId(metadataPlanId);
    const periodEndFromStripe = Number(payloadObject.current_period_end);
    if (Number.isFinite(periodEndFromStripe) && periodEndFromStripe > 0) {
      nextCurrentPeriodEnd = new Date(periodEndFromStripe * 1000).toISOString();
    }

    if (eventType === 'checkout.session.completed') {
      nextStatus = objectStatus === 'trialing' ? 'trialing' : 'active';
      if (productId) {
        nextEntitlements = productToEntitlements(productId, nextEntitlements);
      }
      nextTrialEnd = nextStatus === 'trialing' ? nextCurrentPeriodEnd : null;
    }

    if (eventType === 'customer.subscription.updated' || eventType === 'invoice.paid') {
      nextStatus = objectStatus;
      nextTrialEnd = nextStatus === 'trialing' ? nextCurrentPeriodEnd : null;
    }

    if (eventType === 'invoice.payment_failed') {
      nextStatus = 'past_due';
    }

    if (eventType === 'customer.subscription.deleted') {
      nextStatus = 'canceled';
      nextTrialEnd = null;
      nextEntitlements = {
        bundle: false,
        profit: true,
        breakeven: false,
        cashflow: false
      };
    }

    const updatedAt = nowIso();
    const nextRecord = toEntitlementRecord(userId, {
      lastVerifiedAt: updatedAt,
      entitlements: nextEntitlements,
      status: nextStatus,
      source: 'stripe',
      currentPeriodEnd: nextCurrentPeriodEnd,
      trialEnd: nextTrialEnd,
      trial: {
        active: nextStatus === 'trialing',
        expiresAt: nextTrialEnd ?? nextCurrentPeriodEnd
      },
      subscriptions: existing?.subscriptions ?? [],
      updatedAt
    });

    await putRecord(nextRecord);
  }

  await putWebhookEvent({
    eventId,
    eventType,
    userId,
    processedAt: nowIso()
  });

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