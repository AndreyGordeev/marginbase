import test from 'node:test';
import assert from 'node:assert/strict';

import { handler as authHandler } from '../modules/backend_api/lambda_handlers/auth.js';
import { handler as billingHandler } from '../modules/backend_api/lambda_handlers/billing.js';
import { handler as entitlementsHandler } from '../modules/backend_api/lambda_handlers/entitlements.js';

test('auth handler delegates to backend export', async () => {
  let called = false;

  globalThis.__backendServerModule = {
    handleAuthLambdaEvent: async (event) => {
      called = true;
      assert.equal(event.requestContext.routeKey, 'POST /auth/verify');
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delegated: 'auth' }),
      };
    },
  };

  const response = await authHandler({
    requestContext: { routeKey: 'POST /auth/verify' },
  });

  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).delegated, 'auth');

  delete globalThis.__backendServerModule;
});

test('billing handler delegates to backend export', async () => {
  let called = false;

  globalThis.__backendServerModule = {
    handleBillingLambdaEvent: async (event) => {
      called = true;
      assert.equal(event.requestContext.routeKey, 'POST /billing/verify');
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delegated: 'billing' }),
      };
    },
  };

  const response = await billingHandler({
    requestContext: { routeKey: 'POST /billing/verify' },
  });

  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).delegated, 'billing');

  delete globalThis.__backendServerModule;
});

test('entitlements handler delegates to backend export', async () => {
  let called = false;

  globalThis.__backendServerModule = {
    handleEntitlementsLambdaEvent: async (event) => {
      called = true;
      assert.equal(event.requestContext.routeKey, 'GET /entitlements');
      return {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delegated: 'entitlements' }),
      };
    },
  };

  const response = await entitlementsHandler({
    requestContext: { routeKey: 'GET /entitlements' },
  });

  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
  assert.equal(JSON.parse(response.body).delegated, 'entitlements');

  delete globalThis.__backendServerModule;
});
