import test from 'node:test';
import assert from 'node:assert/strict';

import { handler as authHandler } from '../modules/backend_api/lambda_stubs/auth.js';
import { handler as accountDeleteHandler } from '../modules/backend_api/lambda_stubs/account-delete.js';
import { handler as billingHandler } from '../modules/backend_api/lambda_stubs/billing.js';
import { handler as entitlementsHandler } from '../modules/backend_api/lambda_stubs/entitlements.js';
import { handler as telemetryHandler } from '../modules/backend_api/lambda_stubs/telemetry.js';

const parseBody = (response) => JSON.parse(response.body);

test('auth verify validates Google token and returns identity payload', async () => {
  process.env.GOOGLE_CLIENT_IDS = 'client-id-1';

  let storedProfile = null;
  globalThis.__userPut = async ({ profile }) => {
    storedProfile = profile;
  };

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
    headers: {
      authorization: 'Bearer token-value'
    }
  });

  assert.equal(response.statusCode, 200);
  const body = parseBody(response);
  assert.equal(body.userId, 'google-user-123');
  assert.equal(body.provider, 'google');
  assert.equal(storedProfile.userId, 'google-user-123');

  delete globalThis.__userPut;
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
  const tableData = new Map();

  process.env.ENTITLEMENTS_TABLE_NAME = 'entitlements-table';
  globalThis.__ddbPut = async ({ tableName, record }) => {
    assert.equal(tableName, 'entitlements-table');
    tableData.set(record.userId, record);
  };

  globalThis.__ddbGet = async ({ tableName, userId }) => {
    assert.equal(tableName, 'entitlements-table');
    return tableData.get(userId) ?? null;
  };

  const verifyResponse = await billingHandler({
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

  delete globalThis.__ddbPut;
  delete globalThis.__ddbGet;
});

test('stripe webhook is idempotent and persists lifecycle status for entitlements', async () => {
  const tableData = new Map();

  process.env.ENTITLEMENTS_TABLE_NAME = 'entitlements-table';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  globalThis.__ddbPut = async ({ tableName, record }) => {
    assert.equal(tableName, 'entitlements-table');
    tableData.set(record.userId, record);
  };

  globalThis.__ddbGet = async ({ tableName, userId }) => {
    assert.equal(tableName, 'entitlements-table');
    return tableData.get(userId) ?? null;
  };

  const checkoutEvent = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

  assert.equal(checkoutEvent.statusCode, 200);
  assert.equal(parseBody(checkoutEvent).processed, true);

  const duplicateCheckoutEvent = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

  assert.equal(duplicateCheckoutEvent.statusCode, 200);
  assert.equal(parseBody(duplicateCheckoutEvent).idempotent, true);
  assert.equal(parseBody(duplicateCheckoutEvent).processed, false);

  const paymentFailedEvent = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

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

  delete globalThis.__ddbPut;
  delete globalThis.__ddbGet;
  delete process.env.STRIPE_WEBHOOK_SECRET;
});

test('stripe lifecycle transitions from trialing to active to canceled and revokes entitlements', async () => {
  const tableData = new Map();

  process.env.ENTITLEMENTS_TABLE_NAME = 'entitlements-table';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';

  globalThis.__ddbPut = async ({ tableName, record }) => {
    assert.equal(tableName, 'entitlements-table');
    tableData.set(record.userId, record);
  };

  globalThis.__ddbGet = async ({ tableName, userId }) => {
    assert.equal(tableName, 'entitlements-table');
    return tableData.get(userId) ?? null;
  };

  const trialStarted = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

  assert.equal(trialStarted.statusCode, 200);

  const renewalPaid = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

  assert.equal(renewalPaid.statusCode, 200);

  const canceled = await billingHandler({
    requestContext: {
      routeKey: 'POST /billing/webhook/stripe'
    },
    headers: {
      'stripe-signature': 't=1,v1=testsig'
    },
    body: JSON.stringify({
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
    })
  });

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

  delete globalThis.__ddbPut;
  delete globalThis.__ddbGet;
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