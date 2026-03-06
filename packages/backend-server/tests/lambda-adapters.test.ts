import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  handleAuthLambdaEvent,
  handleBillingLambdaEvent,
  handleEntitlementsLambdaEvent,
  resetBackendRuntimeForTests,
} from '../src';

describe('backend lambda adapters', () => {
  beforeEach(() => {
    process.env.GOOGLE_VERIFICATION_MODE = 'development';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    resetBackendRuntimeForTests();
  });

  afterEach(() => {
    delete process.env.GOOGLE_VERIFICATION_MODE;
    resetBackendRuntimeForTests();
  });

  it('handles /auth/verify through backend adapter', async () => {
    const header = Buffer.from(
      JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'lambda-user-1',
        email: 'lambda@example.com',
        email_verified: true,
        aud: 'dev-client',
        iss: 'https://accounts.google.com',
      }),
    ).toString('base64url');

    const response = await handleAuthLambdaEvent({
      requestContext: {
        routeKey: 'POST /auth/verify',
        http: {
          method: 'POST',
          path: '/auth/verify',
        },
      },
      body: JSON.stringify({
        idToken: `${header}.${payload}.signature`,
      }),
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toMatchObject({
      userId: 'lambda-user-1',
      provider: 'google',
    });
  });

  it('handles /billing/verify and /billing/entitlements/:userId via backend adapter', async () => {
    const verifyResponse = await handleBillingLambdaEvent({
      requestContext: {
        routeKey: 'POST /billing/verify',
        http: {
          method: 'POST',
          path: '/billing/verify',
        },
      },
      body: JSON.stringify({
        userId: 'lambda-paid-user',
        platform: 'ios',
        productId: 'bundle_monthly',
        receiptToken: 'ios:valid:receipt-1234567890',
      }),
    });

    expect(verifyResponse.statusCode).toBe(200);
    expect(JSON.parse(verifyResponse.body).verified).toBe(true);

    const entitlementsResponse = await handleBillingLambdaEvent({
      requestContext: {
        routeKey: 'GET /billing/entitlements/{userId}',
        http: {
          method: 'GET',
          path: '/billing/entitlements/lambda-paid-user',
        },
      },
      rawPath: '/billing/entitlements/lambda-paid-user',
      pathParameters: {
        userId: 'lambda-paid-user',
      },
    });

    expect(entitlementsResponse.statusCode).toBe(200);
    const body = JSON.parse(entitlementsResponse.body);
    expect(body.entitlements.bundle).toBe(true);
    expect(body.entitlements.cashflow).toBe(true);
  });

  it('handles /entitlements with query userId via backend adapter', async () => {
    const response = await handleEntitlementsLambdaEvent({
      requestContext: {
        routeKey: 'GET /entitlements',
        http: {
          method: 'GET',
          path: '/entitlements',
        },
      },
      queryStringParameters: {
        userId: 'query-user-1',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.userId).toBe('query-user-1');
    expect(body.status).toBe('trialing');
  });

  it('returns 404 for unsupported billing route', async () => {
    const response = await handleBillingLambdaEvent({
      requestContext: {
        routeKey: 'GET /billing/unknown',
        http: {
          method: 'GET',
          path: '/billing/unknown',
        },
      },
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toBe('Route not found');
  });
});
