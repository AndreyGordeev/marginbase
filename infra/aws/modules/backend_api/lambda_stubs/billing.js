const { parseJsonBody, response } = require('./common');
const {
  getRecord,
  putRecord,
  toEntitlementRecord,
  getWebhookEvent,
  putWebhookEvent,
  getUserBillingProfile,
  putUserBillingProfile
} = require('./billing-store');

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

const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';

const planToPriceEnvName = {
  profit: 'STRIPE_PRICE_PROFIT',
  breakeven: 'STRIPE_PRICE_BREAKEVEN',
  cashflow: 'STRIPE_PRICE_CASHFLOW',
  bundle: 'STRIPE_PRICE_BUNDLE'
};

const planToFallbackPrice = {
  profit: 'price_profit_monthly',
  breakeven: 'price_breakeven_monthly',
  cashflow: 'price_cashflow_monthly',
  bundle: 'price_bundle_monthly'
};

const getPlanPriceId = (planId) => {
  const envName = planToPriceEnvName[planId];
  if (!envName) {
    return '';
  }

  const envValue = process.env[envName];
  if (typeof envValue === 'string' && envValue.trim().length > 0) {
    return envValue.trim();
  }

  return planToFallbackPrice[planId] ?? '';
};

const getCheckoutSuccessUrl = () => {
  const configured = process.env.STRIPE_CHECKOUT_SUCCESS_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  return 'http://localhost:5173/?checkout=success';
};

const getCheckoutCancelUrl = () => {
  const configured = process.env.STRIPE_CHECKOUT_CANCEL_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  return 'http://localhost:5173/?checkout=cancel';
};

const getBillingPortalReturnUrl = (requestedReturnUrl) => {
  if (typeof requestedReturnUrl === 'string' && requestedReturnUrl.trim().length > 0) {
    return requestedReturnUrl.trim();
  }

  const configured = process.env.STRIPE_PORTAL_RETURN_URL;
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim();
  }

  return 'http://localhost:5173/#/settings';
};

const encodeFormBody = (payload) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }

    params.append(key, String(value));
  }

  return params.toString();
};

const postStripeForm = async (path, payload) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }

  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available for Stripe API call.');
  }

  const stripeResponse = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: encodeFormBody(payload)
  });

  const body = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    const message = typeof body?.error?.message === 'string' ? body.error.message : 'Stripe API request failed.';
    throw new Error(message);
  }

  return body;
};

const upsertBillingProfile = async ({ userId, email, stripeCustomerId, stripeSubscriptionId, stripePriceId, status, currentPeriodEnd, trialEnd }) => {
  const existing = await getUserBillingProfile(userId);
  const now = nowIso();

  const profile = {
    ...(existing ?? {}),
    userId,
    email: email || existing?.email || '',
    stripeCustomerId: stripeCustomerId || existing?.stripeCustomerId || '',
    stripeSubscriptionId: stripeSubscriptionId || existing?.stripeSubscriptionId || '',
    stripePriceId: stripePriceId || existing?.stripePriceId || '',
    status: status || existing?.status || 'active',
    currentPeriodEnd: currentPeriodEnd ?? existing?.currentPeriodEnd ?? null,
    trialEnd: trialEnd ?? existing?.trialEnd ?? null,
    lastVerifiedAt: now,
    updatedAt: now
  };

  await putUserBillingProfile(profile);
  return profile;
};

const ensureStripeCustomerId = async ({ userId, email }) => {
  const existingProfile = await getUserBillingProfile(userId);
  if (existingProfile?.stripeCustomerId) {
    return existingProfile.stripeCustomerId;
  }

  const created = await postStripeForm('/customers', {
    email,
    'metadata[userId]': userId
  });

  const customerId = typeof created?.id === 'string' ? created.id : '';
  if (!customerId) {
    throw new Error('Unable to create Stripe customer.');
  }

  await upsertBillingProfile({
    userId,
    email,
    stripeCustomerId: customerId
  });

  return customerId;
};

const buildFallbackCheckoutUrl = ({ planId, userId }) => {
  return `https://checkout.stripe.com/c/pay/cs_test_${encodeURIComponent(planId)}_${encodeURIComponent(userId)}`;
};

const buildFallbackPortalUrl = (userId) => {
  return `https://billing.stripe.com/p/session/test_${encodeURIComponent(userId)}`;
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

const logWebhookFailure = ({ reason, eventId }) => {
  console.error('billing_webhook_failure', {
    reason,
    eventId: typeof eventId === 'string' ? eventId : '',
    timestamp: nowIso()
  });
};

const emitBillingStatusChanged = ({ userId, status, eventType }) => {
  console.info('billing_status_changed', {
    userId,
    status,
    eventType,
    source: 'stripe',
    timestamp: nowIso()
  });
};

const handleCheckoutSession = async (event) => {
  const body = parseJsonBody(event);
  const planId = typeof body.planId === 'string' ? body.planId : '';
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const email = typeof body.email === 'string' ? body.email : '';

  if (!planId || !userId || !email || !planToPriceEnvName[planId]) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'planId, userId and email are required and planId must be supported.'
    });
  }

  const priceId = getPlanPriceId(planId);
  if (!priceId) {
    return response(500, {
      code: 'PRICE_ID_NOT_CONFIGURED',
      message: 'Stripe price id is not configured for selected plan.'
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response(200, {
      checkoutUrl: buildFallbackCheckoutUrl({ planId, userId })
    });
  }

  try {
    const customerId = await ensureStripeCustomerId({ userId, email });
    const checkoutSession = await postStripeForm('/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      success_url: getCheckoutSuccessUrl(),
      cancel_url: getCheckoutCancelUrl(),
      'metadata[userId]': userId,
      'metadata[planId]': planId
    });

    const checkoutUrl = typeof checkoutSession?.url === 'string'
      ? checkoutSession.url
      : buildFallbackCheckoutUrl({ planId, userId });

    await upsertBillingProfile({
      userId,
      email,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      status: 'active'
    });

    return response(200, {
      checkoutUrl
    });
  } catch (error) {
    return response(502, {
      code: 'STRIPE_CHECKOUT_ERROR',
      message: error instanceof Error ? error.message : 'Unable to create Stripe checkout session.'
    });
  }
};

const handlePortalSession = async (event) => {
  const body = parseJsonBody(event);
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const returnUrl = getBillingPortalReturnUrl(body.returnUrl);

  if (!userId) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'userId is required.'
    });
  }

  const profile = await getUserBillingProfile(userId);
  if (!profile?.stripeCustomerId) {
    return response(404, {
      code: 'BILLING_PROFILE_NOT_FOUND',
      message: 'Stripe customer is not linked for this user.'
    });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return response(200, {
      portalUrl: buildFallbackPortalUrl(userId)
    });
  }

  try {
    const portalSession = await postStripeForm('/billing_portal/sessions', {
      customer: profile.stripeCustomerId,
      return_url: returnUrl
    });

    const portalUrl = typeof portalSession?.url === 'string'
      ? portalSession.url
      : buildFallbackPortalUrl(userId);

    return response(200, {
      portalUrl
    });
  } catch (error) {
    return response(502, {
      code: 'STRIPE_PORTAL_ERROR',
      message: error instanceof Error ? error.message : 'Unable to create Stripe billing portal session.'
    });
  }
};

const handleStripeWebhook = async (event) => {
  const signature = event?.headers?.['stripe-signature'] ?? event?.headers?.['Stripe-Signature'] ?? '';
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    logWebhookFailure({
      reason: 'invalid_signature_or_missing_secret'
    });

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
    (typeof metadata.userId === 'string' && metadata.userId)
    || (typeof body.userId === 'string' && body.userId)
    || (typeof payloadObject.client_reference_id === 'string' && payloadObject.client_reference_id)
    || '';

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

    if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated' || eventType === 'invoice.paid') {
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

    await upsertBillingProfile({
      userId,
      email: '',
      stripeCustomerId: typeof payloadObject.customer === 'string' ? payloadObject.customer : undefined,
      stripeSubscriptionId: typeof payloadObject.subscription === 'string'
        ? payloadObject.subscription
        : (typeof payloadObject.id === 'string' && eventType.startsWith('customer.subscription.') ? payloadObject.id : undefined),
      stripePriceId: typeof payloadObject?.plan?.id === 'string' ? payloadObject.plan.id : undefined,
      status: nextStatus,
      currentPeriodEnd: nextCurrentPeriodEnd,
      trialEnd: nextTrialEnd
    });

    emitBillingStatusChanged({
      userId,
      status: nextStatus,
      eventType
    });
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

  if (routeKey === 'POST /billing/checkout/session' || routeKey === 'POST /billing/checkout-session') {
    return handleCheckoutSession(event);
  }

  if (routeKey === 'POST /billing/portal-session') {
    return handlePortalSession(event);
  }

  if (routeKey === 'POST /billing/webhook/stripe') {
    try {
      return await handleStripeWebhook(event);
    } catch (error) {
      const body = parseJsonBody(event);
      const eventId = typeof body.id === 'string' ? body.id : '';

      logWebhookFailure({
        reason: error instanceof Error ? error.message : 'unexpected_error',
        eventId
      });

      return response(500, {
        code: 'WEBHOOK_PROCESSING_ERROR',
        message: 'Unable to process Stripe webhook event.'
      });
    }
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
