import test from 'node:test';
import assert from 'node:assert/strict';

import { handler as authHandler } from '../modules/backend_api/lambda_stubs/auth.js';
import { handler as entitlementsHandler } from '../modules/backend_api/lambda_stubs/entitlements.js';
import { handler as telemetryHandler } from '../modules/backend_api/lambda_stubs/telemetry.js';

const parseBody = (response) => JSON.parse(response.body);

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
    headers: {
      authorization: 'Bearer token-value'
    }
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