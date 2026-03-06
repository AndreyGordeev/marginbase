import type { BillingProvider } from './billing-provider';

/**
 * Development/Test billing provider - no credentials required
 * Returns mock URLs and accepts all webhook signatures
 */
export class DevBillingProvider implements BillingProvider {
  async createCheckoutSession(params: {
    priceId: string;
    userId: string;
    email: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const url = `https://checkout.stripe.dev?planId=${params.planId}&userId=${params.userId}&email=${encodeURIComponent(params.email)}`;
    return { url };
  }

  async createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    const url = `https://billing.stripe.dev?customer=${params.customerId}&returnUrl=${encodeURIComponent(params.returnUrl)}`;
    return { url };
  }

  verifyWebhookSignature(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _rawBody: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _signature: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _secret: string,
  ): boolean {
    // Development mode: accept all webhooks
    return true;
  }
}
