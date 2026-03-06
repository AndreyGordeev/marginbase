import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createBackendServer } from '../src/server';

let baseUrl = '';
let closeServer: (() => Promise<void>) | null = null;

beforeAll(async () => {
  process.env.GOOGLE_VERIFICATION_MODE = 'development';
  const app = createBackendServer();
  const server = app.listen(0);

  await new Promise<void>((resolve) => {
    server.once('listening', () => resolve());
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeServer = async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };
});

afterAll(async () => {
  if (closeServer) {
    await closeServer();
  }
});

const createJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' }))
    .toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

describe('backend auth + billing handlers', () => {
  it('verifies auth token and returns user session', async () => {
    const token = createJwt({
      sub: 'user_123',
      iss: 'https://accounts.google.com',
      aud: 'marginbase-web',
      email: 'test@marginbase.app',
      email_verified: true,
    });

    const response = await fetch(`${baseUrl}/auth/verify`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ googleIdToken: token }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { userId: string; email: string };
    expect(body.userId).toBe('user_123');
    expect(body.email).toBe('test@marginbase.app');
  });

  it('returns checkout url from billing checkout endpoint', async () => {
    const response = await fetch(`${baseUrl}/billing/checkout/session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        planId: 'bundle',
        userId: 'user_123',
        email: 'test@marginbase.app',
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkoutUrl: string };
    expect(body.checkoutUrl.length).toBeGreaterThan(0);
  });

  it('processes webhook idempotently on /billing/webhook', async () => {
    const payload = {
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {
            userId: 'user_123',
          },
        },
      },
    };

    const first = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const second = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const secondBody = (await second.json()) as { idempotent?: boolean };
    expect(secondBody.idempotent).toBe(true);
  });
});
