/**
 * BillingProvider interface - abstraction for payment processing
 * Allows switching between live Stripe and dev/test providers
 */
export interface BillingProvider {
  /**
   * Create a checkout session for subscription purchase
   */
  createCheckoutSession(params: {
    priceId: string;
    userId: string;
    email: string;
    planId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;

  /**
   * Create a billing portal session for subscription management
   */
  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;

  /**
   * Verify webhook signature for idempotent event processing
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
    secret: string,
  ): boolean;
}

/**
 * Factory function to create appropriate billing provider
 * based on environment configuration
 */
export const createBillingProvider = async (): Promise<BillingProvider> => {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (stripeSecretKey) {
    const { StripeBillingProvider } = await import('./stripe-billing-provider');
    console.info('🔐 Using LIVE Stripe billing provider');
    return new StripeBillingProvider(stripeSecretKey);
  }

  const { DevBillingProvider } = await import('./dev-billing-provider');
  console.info('⚠️  Using DEV billing provider (Stripe credentials not configured)');
  return new DevBillingProvider();
};
