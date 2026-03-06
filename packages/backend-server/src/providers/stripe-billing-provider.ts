import crypto from 'node:crypto';
import type { BillingProvider } from './billing-provider';

const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Live Stripe integration - requires STRIPE_SECRET_KEY
 */
export class StripeBillingProvider implements BillingProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCheckoutSession(params: {
    priceId: string;
    userId: string;
    email: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const response = await fetch(`${STRIPE_API_BASE_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': params.priceId,
        'line_items[0][quantity]': '1',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        'metadata[userId]': params.userId,
        'metadata[planId]': params.planId,
        customer_email: params.email,
        client_reference_id: params.userId,
      }).toString(),
    });

    const parsed = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(parsed.error?.message || 'Stripe API request failed.');
    }

    if (typeof parsed.url !== 'string') {
      throw new Error('Stripe checkout session did not return URL.');
    }

    return { url: parsed.url };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const response = await fetch(
      `${STRIPE_API_BASE_URL}/billing_portal/sessions`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          customer: params.customerId,
          return_url: params.returnUrl,
        }).toString(),
      },
    );

    const parsed = (await response.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(parsed.error?.message || 'Stripe API request failed.');
    }

    if (typeof parsed.url !== 'string') {
      throw new Error('Stripe portal session did not return URL.');
    }

    return { url: parsed.url };
  }

  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret: string,
  ): boolean {
    const parsed = this.parseStripeSignatureHeader(signature);
    if (!parsed.timestamp || parsed.signatures.length === 0) {
      return false;
    }

    const timestampSeconds = Number(parsed.timestamp);
    if (!Number.isFinite(timestampSeconds)) {
      return false;
    }

    const driftSeconds = Math.abs(Date.now() / 1000 - timestampSeconds);
    if (driftSeconds > STRIPE_SIGNATURE_TOLERANCE_SECONDS) {
      return false;
    }

    const signedPayload = `${parsed.timestamp}.${rawBody}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return parsed.signatures.some((candidate) => {
      try {
        const left = Buffer.from(candidate, 'utf8');
        const right = Buffer.from(expected, 'utf8');
        return (
          left.length === right.length && crypto.timingSafeEqual(left, right)
        );
      } catch {
        return false;
      }
    });
  }

  private parseStripeSignatureHeader(headerValue: string): {
    timestamp: string;
    signatures: string[];
  } {
    const parts = headerValue
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    let timestamp = '';
    const signatures: string[] = [];

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't' && value) {
        timestamp = value;
      }
      if (key === 'v1' && value) {
        signatures.push(value);
      }
    }

    return { timestamp, signatures };
  }
}
