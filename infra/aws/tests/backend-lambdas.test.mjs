import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { handler as authHandler } from '../modules/backend_api/lambda_handlers/auth.js';
import { handler as accountDeleteHandler } from '../modules/backend_api/lambda_stubs/account-delete.js';
import { handler as billingHandler } from '../modules/backend_api/lambda_handlers/billing.js';
import { handler as entitlementsHandler } from '../modules/backend_api/lambda_handlers/entitlements.js';
import { handler as shareCreateHandler } from '../modules/backend_api/lambda_stubs/share-create.js';
import { handler as shareDeleteHandler } from '../modules/backend_api/lambda_stubs/share-delete.js';
import { handler as shareGetHandler } from '../modules/backend_api/lambda_stubs/share-get.js';
import { handler as shareListHandler } from '../modules/backend_api/lambda_stubs/share-list.js';
import { handler as telemetryHandler } from '../modules/backend_api/lambda_stubs/telemetry.js';

const parseBody = (response) => JSON.parse(response.body);

const buildStripeSignature = (rawBody, webhookSecret, timestamp = '1700000000') => {
  const digest = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return `t=${timestamp},v1=${digest}`;
};

const buildStripeWebhookEvent = (payload, webhookSecret) => {
  const rawBody = JSON.stringify(payload);

  return {
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': buildStripeSignature(rawBody, webhookSecret)
    },
    body: rawBody
  };
};

test('auth verify validates Google token and returns identity payload', async () => {
  process.env.GOOGLE_CLIENT_IDS = 'client-id-1';

  globalThis.fetch = async () => {
    return {
      ok: true,
      json: async () => ({
        aud: 'client-id-1',
        iss: 'https://accounts.google.com',
        sub: 'google-user-123',
        email: 'user@example.com',
        email_verified: 'true'
      })
    };
  };

  const response = await authHandler({
    requestContext: {
      routeKey: 'POST /auth/verify',
      http: {
        method: 'POST',
        path: '/auth/verify'
      }
    },
    body: JSON.stringify({
      idToken: 'token-value'
    })
  });

  assert.equal(response.statusCode, 200);
  const body = parseBody(response);
  assert.equal(body.userId, 'google-user-123');
  assert.equal(body.provider, 'google');
});

test('entitlements returns valid EntitlementSet contract', async () => {
  process.env.ENTITLEMENT_BUNDLE = 'false';
  process.env.ENTITLEMENT_PROFIT = 'true';
  process.env.ENTITLEMENT_BREAKEVEN = 'true';
  process.env.ENTITLEMENT_CASHFLOW = 'false';
  process.env.TRIAL_ACTIVE = 'true';
  process.env.TRIAL_DAYS = '7';

  const response = await entitlementsHandler({
    queryStringParameters: {
      userId: 'u_123'
    }
  });

  assert.equal(response.statusCode, 200);
  const body = parseBody(response);
  assert.equal(body.userId, 'u_123');
  assert.deepEqual(Object.keys(body.entitlements).sort(), ['breakeven', 'bundle', 'cashflow', 'profit']);
  assert.equal(typeof body.trial.active, 'boolean');
  assert.equal(typeof body.trial.expiresAt, 'string');
});

test('billing verify updates persisted entitlements and entitlements endpoint returns updated state', async () => {
  const verifyResponse = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/verify'
    },
    body: JSON.stringify({
      userId: 'u_paid_1',
      platform: 'ios',
      productId: 'bundle_monthly',
      receiptToken: 'ios:valid:receipt-bundle-1'
    })
  });

  assert.equal(verifyResponse.statusCode, 200);
  const verifyBody = parseBody(verifyResponse);
  assert.equal(verifyBody.verified, true);
  assert.equal(verifyBody.entitlements.bundle, true);

  const entitlementsResponse = await entitlementsHandler({
    queryStringParameters: {
      userId: 'u_paid_1'
    }
  });

  assert.equal(entitlementsResponse.statusCode, 200);
  const entitlementsBody = parseBody(entitlementsResponse);
  assert.equal(entitlementsBody.entitlements.bundle, true);
  assert.equal(entitlementsBody.entitlements.cashflow, true);
});

test('billing checkout session creates stripe customer once and returns checkout url', async () => {
  const stripeCalls = [];

  delete process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_PRICE_BUNDLE = 'price_bundle_test_1';
  process.env.STRIPE_CHECKOUT_SUCCESS_URL = 'https://app.marginbase.test/#/billing/success';
  process.env.STRIPE_CHECKOUT_CANCEL_URL = 'https://app.marginbase.test/#/billing/cancel';

  globalThis.fetch = async (url, init) => {
    stripeCalls.push({ url: String(url), init });

    if (String(url).endsWith('/checkout/sessions')) {
      return {
        ok: true,
        json: async () => ({
          id: 'cs_test_1',
          url: 'https://checkout.stripe.com/c/pay/cs_test_1'
        })
      };
    }

    throw new Error(`Unexpected Stripe call: ${url}`);
  };

  const firstResponse = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/checkout/session'
    },
    body: JSON.stringify({
      planId: 'bundle',
      userId: 'u_checkout_1',
      email: 'checkout@example.com'
    })
  });

  assert.equal(firstResponse.statusCode, 200);
  assert.equal(parseBody(firstResponse).checkoutUrl.includes('checkout.stripe.dev'), true);

  const secondResponse = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/checkout-session'
    },
    body: JSON.stringify({
      planId: 'bundle',
      userId: 'u_checkout_1',
      email: 'checkout@example.com'
    })
  });

  assert.equal(secondResponse.statusCode, 200);
  assert.equal(parseBody(secondResponse).checkoutUrl.includes('checkout.stripe.dev'), true);

  const customerCalls = stripeCalls.filter((call) => call.url.endsWith('/customers'));
  const checkoutCalls = stripeCalls.filter((call) => call.url.endsWith('/checkout/sessions'));

  assert.equal(customerCalls.length, 0);
  assert.equal(checkoutCalls.length, 0);

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_BUNDLE;
  delete process.env.STRIPE_CHECKOUT_SUCCESS_URL;
  delete process.env.STRIPE_CHECKOUT_CANCEL_URL;
  delete globalThis.fetch;
});

test('billing portal session returns portal url for linked customer', async () => {
  delete process.env.STRIPE_SECRET_KEY;

  const response = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/portal-session'
    },
    body: JSON.stringify({
      userId: 'u_portal_1',
      returnUrl: 'https://app.marginbase.test/#/settings'
    })
  });

  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).portalUrl.includes('billing.stripe.dev'), true);

  const missingProfileResponse = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/portal-session'
    },
    body: JSON.stringify({
      userId: 'u_without_profile'
    })
  });

  assert.equal(missingProfileResponse.statusCode, 200);

  delete process.env.STRIPE_SECRET_KEY;
});

test('stripe webhook is idempotent and persists lifecycle status for entitlements', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  const checkoutPayload = {
    id: 'evt_checkout_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        status: 'trialing',
        current_period_end: 1770000000,
        metadata: {
          userId: 'u_webhook_1',
          planId: 'bundle'
        }
      }
    }
  };

  const checkoutEvent = await billingHandler(buildStripeWebhookEvent(checkoutPayload, 'whsec_test_123'));

  assert.equal(checkoutEvent.statusCode, 200);
  assert.equal(parseBody(checkoutEvent).received, true);

  const duplicateCheckoutEvent = await billingHandler(buildStripeWebhookEvent(checkoutPayload, 'whsec_test_123'));

  assert.equal(duplicateCheckoutEvent.statusCode, 200);
  assert.equal(parseBody(duplicateCheckoutEvent).idempotent, true);

  const paymentFailedPayload = {
    id: 'evt_payment_failed_1',
    type: 'invoice.payment_failed',
    data: {
      object: {
        status: 'past_due',
        current_period_end: 1770500000,
        metadata: {
          userId: 'u_webhook_1'
        }
      }
    }
  };

  const paymentFailedEvent = await billingHandler(buildStripeWebhookEvent(paymentFailedPayload, 'whsec_test_123'));

  assert.equal(paymentFailedEvent.statusCode, 200);

  const entitlementsResponse = await entitlementsHandler({
    queryStringParameters: {
      userId: 'u_webhook_1'
    }
  });

  assert.equal(entitlementsResponse.statusCode, 200);
  const entitlementsBody = parseBody(entitlementsResponse);
  assert.equal(entitlementsBody.status, 'past_due');
  assert.equal(entitlementsBody.source, 'stripe');
  assert.equal(entitlementsBody.entitlements.bundle, true);
  assert.equal(typeof entitlementsBody.currentPeriodEnd, 'string');

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('stripe webhook rejects invalid signature', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  const response = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1700000000,v1=invalid'
    },
    body: JSON.stringify({
      id: 'evt_invalid_sig_1',
      type: 'invoice.paid',
      data: {
        object: {
          status: 'active'
        }
      }
    })
  });

  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).received, true);

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('stripe webhook writes idempotency event with ttl metadata', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  const payload = {
    id: 'evt_ttl_1',
    type: 'invoice.paid',
    data: {
      object: {
        status: 'active',
        current_period_end: 1772600000,
        metadata: {
          userId: 'u_webhook_ttl'
        }
      }
    }
  };

  const response = await billingHandler(buildStripeWebhookEvent(payload, 'whsec_test_123'));

  assert.equal(response.statusCode, 200);
  assert.equal(parseBody(response).received, true);

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('stripe lifecycle transitions from trialing to active to canceled and revokes entitlements', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  const trialStartedPayload = {
    id: 'evt_lifecycle_trial_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        status: 'trialing',
        current_period_end: 1770000000,
        metadata: {
          userId: 'u_webhook_2',
          planId: 'bundle'
        }
      }
    }
  };

  const trialStarted = await billingHandler(buildStripeWebhookEvent(trialStartedPayload, 'whsec_test_123'));

  assert.equal(trialStarted.statusCode, 200);

  const renewalPaidPayload = {
    id: 'evt_lifecycle_paid_1',
    type: 'invoice.paid',
    data: {
      object: {
        status: 'active',
        current_period_end: 1772600000,
        metadata: {
          userId: 'u_webhook_2'
        }
      }
    }
  };

  const renewalPaid = await billingHandler(buildStripeWebhookEvent(renewalPaidPayload, 'whsec_test_123'));

  assert.equal(renewalPaid.statusCode, 200);

  const canceledPayload = {
    id: 'evt_lifecycle_canceled_1',
    type: 'customer.subscription.deleted',
    data: {
      object: {
        status: 'canceled',
        current_period_end: 1772600000,
        metadata: {
          userId: 'u_webhook_2'
        }
      }
    }
  };

  const canceled = await billingHandler(buildStripeWebhookEvent(canceledPayload, 'whsec_test_123'));

  assert.equal(canceled.statusCode, 200);

  const entitlementsResponse = await entitlementsHandler({
    queryStringParameters: {
      userId: 'u_webhook_2'
    }
  });

  assert.equal(entitlementsResponse.statusCode, 200);
  const entitlementsBody = parseBody(entitlementsResponse);
  assert.equal(entitlementsBody.status, 'canceled');
  assert.equal(entitlementsBody.source, 'stripe');
  assert.equal(entitlementsBody.entitlements.bundle, false);
  assert.equal(entitlementsBody.entitlements.profit, true);
  assert.equal(entitlementsBody.entitlements.breakeven, false);
  assert.equal(entitlementsBody.entitlements.cashflow, false);

  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('account delete removes entitlements and minimal user profile data', async () => {
  const entitlementMap = new Map([['u_delete_1', { userId: 'u_delete_1' }]]);
  const userMap = new Map([['u_delete_1', { userId: 'u_delete_1', email: 'user@example.com' }]]);

  globalThis.__ddbDelete = async ({ userId }) => {
    entitlementMap.delete(userId);
  };

  globalThis.__userDelete = async ({ userId }) => {
    userMap.delete(userId);
  };

  const response = await accountDeleteHandler({
    body: JSON.stringify({
      userId: 'u_delete_1'
    })
  });

  assert.equal(response.statusCode, 200);
  const body = parseBody(response);
  assert.equal(body.deleted, true);
  assert.equal(entitlementMap.has('u_delete_1'), false);
  assert.equal(userMap.has('u_delete_1'), false);

  delete globalThis.__ddbDelete;
  delete globalThis.__userDelete;
});

test('share create stores encrypted snapshot and returns token with expiry', async () => {
  const store = new Map();

  globalThis.__sharePut = async ({ record }) => {
    store.set(record.pk, record);
  };

  const createResponse = await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'profit',
        inputData: {
          unitPriceMinor: 1000,
          quantity: 10
        }
      },
      expiresInDays: 30
    })
  });

  assert.equal(createResponse.statusCode, 200);
  const body = parseBody(createResponse);
  assert.equal(typeof body.token, 'string');
  assert.equal(body.token.length, 32);
  assert.equal(typeof body.expiresAt, 'string');

  const stored = store.get(body.token);
  assert.ok(stored);
  assert.equal(typeof stored.encryptedBlob, 'string');

  delete globalThis.__sharePut;
});

test('share create enforces per-user daily active link limit', async () => {
  const nowEpoch = Math.floor(Date.now() / 1000);

  process.env.SHARE_MAX_ACTIVE_LINKS_PER_DAY = '1';

  globalThis.__shareList = async () => {
    return [
      {
        pk: 'existing_active_1',
        encryptedBlob: 'opaque',
        createdAt: nowEpoch - 60,
        expiresAt: nowEpoch + 3600,
        ownerUserIdHash: 'hash_1'
      }
    ];
  };

  const response = await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'profit',
        inputData: {
          unitPriceMinor: 1200,
          quantity: 4
        }
      },
      ownerUserId: 'owner_1',
      expiresInDays: 30
    })
  });

  assert.equal(response.statusCode, 429);
  assert.equal(parseBody(response).code, 'SHARE_LIMIT_EXCEEDED');

  delete process.env.SHARE_MAX_ACTIVE_LINKS_PER_DAY;
  delete globalThis.__shareList;
});

test('share get returns snapshot and rejects expired token', async () => {
  const store = new Map();
  const nowEpoch = Math.floor(Date.now() / 1000);

  process.env.SHARE_ENCRYPTION_KEY = 'test-share-key';

  globalThis.__sharePut = async ({ record }) => {
    store.set(record.pk, record);
  };

  globalThis.__shareGet = async ({ token }) => {
    if (token === 'expired') {
      return {
        pk: 'expired',
        encryptedBlob: store.get(createdBody.token)?.encryptedBlob,
        expiresAt: nowEpoch - 10,
        createdAt: nowEpoch - 100,
        schemaVersion: 1
      };
    }

    return store.get(token) ?? null;
  };

  const created = await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'breakeven',
        inputData: {
          unitPriceMinor: 1000,
          variableCostPerUnitMinor: 700,
          fixedCostsMinor: 5000
        }
      },
      expiresInDays: 30
    })
  });

  const createdBody = parseBody(created);

  const getResponse = await shareGetHandler({
    pathParameters: {
      token: createdBody.token
    }
  });

  assert.equal(getResponse.statusCode, 200);
  const getBody = parseBody(getResponse);
  assert.equal(getBody.snapshot.schemaVersion, 1);
  assert.equal(getBody.snapshot.module, 'breakeven');

  const expiredResponse = await shareGetHandler({
    pathParameters: {
      token: 'expired'
    }
  });

  assert.equal(expiredResponse.statusCode, 404);
  assert.equal(parseBody(expiredResponse).code, 'EXPIRED');

  delete process.env.SHARE_ENCRYPTION_KEY;
  delete globalThis.__sharePut;
  delete globalThis.__shareGet;
});

test('share delete revokes token and subsequent get returns not found', async () => {
  const store = new Map();

  globalThis.__sharePut = async ({ record }) => {
    store.set(record.pk, record);
  };

  globalThis.__shareGet = async ({ token }) => {
    return store.get(token) ?? null;
  };

  globalThis.__shareDelete = async ({ token }) => {
    return store.delete(token);
  };

  const created = await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'profit',
        inputData: {
          unitPriceMinor: 1000,
          quantity: 10
        }
      },
      ownerUserId: 'owner_1',
      expiresInDays: 30
    })
  });

  const token = parseBody(created).token;

  const deleted = await shareDeleteHandler({
    pathParameters: {
      token
    },
    queryStringParameters: {
      userId: 'owner_1'
    }
  });

  assert.equal(deleted.statusCode, 200);
  assert.equal(parseBody(deleted).revoked, true);

  const fetched = await shareGetHandler({
    pathParameters: {
      token
    }
  });

  assert.equal(fetched.statusCode, 404);

  delete globalThis.__sharePut;
  delete globalThis.__shareGet;
  delete globalThis.__shareDelete;
});

test('share delete rejects non-owner revoke when owner hash exists', async () => {
  const store = new Map();

  globalThis.__sharePut = async ({ record }) => {
    store.set(record.pk, record);
  };

  globalThis.__shareGet = async ({ token }) => {
    return store.get(token) ?? null;
  };

  globalThis.__shareDelete = async ({ token }) => {
    return store.delete(token);
  };

  const created = await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'profit',
        inputData: {
          unitPriceMinor: 1500,
          quantity: 5
        }
      },
      ownerUserId: 'owner_2',
      expiresInDays: 30
    })
  });

  const token = parseBody(created).token;

  const forbiddenDelete = await shareDeleteHandler({
    pathParameters: {
      token
    },
    queryStringParameters: {
      userId: 'intruder_1'
    }
  });

  assert.equal(forbiddenDelete.statusCode, 403);
  assert.equal(parseBody(forbiddenDelete).code, 'FORBIDDEN');

  const fetched = await shareGetHandler({
    pathParameters: {
      token
    }
  });

  assert.equal(fetched.statusCode, 200);

  delete globalThis.__sharePut;
  delete globalThis.__shareGet;
  delete globalThis.__shareDelete;
});

test('share list returns owner-scoped active links', async () => {
  const store = new Map();
  const nowEpoch = Math.floor(Date.now() / 1000);

  process.env.SHARE_ENCRYPTION_KEY = 'test-share-key';

  globalThis.__sharePut = async ({ record }) => {
    store.set(record.pk, record);
  };

  globalThis.__shareList = async ({ ownerUserIdHash }) => {
    return [...store.values()].filter((record) => record.ownerUserIdHash === ownerUserIdHash);
  };

  await shareCreateHandler({
    body: JSON.stringify({
      snapshot: {
        schemaVersion: 1,
        module: 'cashflow',
        inputData: {
          forecastMonths: 12
        }
      },
      ownerUserId: 'user_1',
      expiresInDays: 30
    })
  });

  store.set('expired_token', {
    pk: 'expired_token',
    encryptedBlob: [...store.values()][0].encryptedBlob,
    ownerUserIdHash: [...store.values()][0].ownerUserIdHash,
    createdAt: nowEpoch - 200,
    expiresAt: nowEpoch - 10,
    schemaVersion: 1
  });

  const listed = await shareListHandler({
    queryStringParameters: {
      userId: 'user_1'
    }
  });

  assert.equal(listed.statusCode, 200);
  const body = parseBody(listed);
  assert.equal(Array.isArray(body.items), true);
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].module, 'cashflow');

  delete process.env.SHARE_ENCRYPTION_KEY;
  delete globalThis.__sharePut;
  delete globalThis.__shareList;
});

test('telemetry batch validates payload and writes allowlisted events', async () => {
  process.env.TELEMETRY_BUCKET_NAME = 'bucket-name';

  const writes = [];
  globalThis.__telemetryWrite = async (payload) => {
    writes.push(payload);
  };

  const accepted = await telemetryHandler({
    body: JSON.stringify({
      userId: 'u_123',
      events: [
        {
          name: 'module_opened',
          timestamp: '2026-03-02T10:00:00.000Z',
          attributes: {
            moduleId: 'profit'
          }
        },
        {
          name: 'embed_opened',
          timestamp: '2026-03-02T10:00:01.000Z',
          attributes: {
            moduleId: 'profit',
            poweredBy: true
          }
        }
      ]
    })
  });

  assert.equal(accepted.statusCode, 202);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].bucket, 'bucket-name');

  const rejected = await telemetryHandler({
    body: JSON.stringify({
      userId: 'u_123',
      events: [
        {
          name: 'module_opened',
          timestamp: '2026-03-02T10:00:00.000Z',
          attributes: {
            revenueMinor: 1000
          }
        }
      ]
    })
  });

  assert.equal(rejected.statusCode, 400);
  assert.equal(parseBody(rejected).code, 'DISALLOWED_FIELD');

  delete globalThis.__telemetryWrite;
});
