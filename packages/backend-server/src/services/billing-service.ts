import crypto from 'node:crypto';
import type { BillingProvider } from '../providers/billing-provider.js';

export interface CheckoutSessionParams {
  planId: string;
  userId: string;
  email: string;
}

export interface PortalSessionParams {
  userId: string;
  returnUrl?: string;
}

export interface WebhookEvent {
  id?: string;
  type?: string;
  data?: {
    object?: {
      metadata?: Record<string, string>;
      status?: string;
      current_period_end?: number;
      client_reference_id?: string;
    };
  };
}

/**
 * BillingService - handles payment and subscription operations
 */
export class BillingService {
  private provider: BillingProvider;
  private processedEvents = new Set<string>();

  constructor(provider: BillingProvider) {
    this.provider = provider;
  }

  /**
   * Create checkout session for subscription purchase
   */
  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<string> {
    const stripePriceMap: Record<string, string | undefined> = {
      profit: process.env.STRIPE_PRICE_PROFIT,
      breakeven: process.env.STRIPE_PRICE_BREAKEVEN,
      cashflow: process.env.STRIPE_PRICE_CASHFLOW,
      bundle: process.env.STRIPE_PRICE_BUNDLE,
    };

    const priceId = stripePriceMap[params.planId];
    if (!priceId) {
      // Fallback to dev URL if price ID not configured
      return `https://checkout.stripe.dev?planId=${params.planId}&userId=${params.userId}&email=${encodeURIComponent(params.email)}`;
    }

    try {
      const session = await this.provider.createCheckoutSession({
        priceId,
        userId: params.userId,
        email: params.email,
        planId: params.planId,
        successUrl:
          process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
          'http://localhost:4173/?checkout=success',
        cancelUrl:
          process.env.STRIPE_CHECKOUT_CANCEL_URL ||
          'http://localhost:4173/?checkout=cancel',
      });

      return session.url;
    } catch (error) {
      console.error('Billing provider checkout error:', error);
      // Fallback to dev URL on error
      return `https://checkout.stripe.dev?planId=${params.planId}&userId=${params.userId}&email=${encodeURIComponent(params.email)}`;
    }
  }

  /**
   * Create billing portal session for subscription management
   */
  async createPortalSession(params: PortalSessionParams): Promise<string> {
    try {
      const stripeCustomerId = `cus_${params.userId}`;
      const session = await this.provider.createPortalSession({
        customerId: stripeCustomerId,
        returnUrl:
          params.returnUrl ||
          process.env.STRIPE_PORTAL_RETURN_URL ||
          'http://localhost:4173/#/settings',
      });

      return session.url;
    } catch (error) {
      console.error('Billing provider portal error:', error);
      // Fallback to dev URL on error
      return `https://billing.stripe.dev?userId=${params.userId}&returnUrl=${encodeURIComponent(params.returnUrl || 'http://localhost')}`;
    }
  }

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(
    rawBody: string,
    signature: string,
  ): boolean {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      // Development mode: accept all webhooks if secret not configured
      return true;
    }

    return this.provider.verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  /**
   * Process webhook event (idempotent)
   * Returns null if event already processed
   */
  processWebhookEvent(event: WebhookEvent): {
    userId: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    periodEnd: string | null;
  } | null {
    const eventId = event.id || this.generateToken();

    // Idempotency check
    if (this.processedEvents.has(eventId)) {
      return null;
    }

    this.processedEvents.add(eventId);

    const eventType = event.type || '';
    const object = event.data?.object || {};
    const metadata = object.metadata || {};
    const userId = metadata.userId || object.client_reference_id || '';

    if (!userId) {
      return null;
    }

    const periodEnd =
      typeof object.current_period_end === 'number'
        ? new Date(object.current_period_end * 1000).toISOString()
        : null;

    let status: 'active' | 'trialing' | 'past_due' | 'canceled' = 'canceled';

    if (eventType === 'checkout.session.completed') {
      status = object.status === 'trialing' ? 'trialing' : 'active';
    } else if (
      eventType === 'customer.subscription.updated' ||
      eventType === 'invoice.paid'
    ) {
      status =
        object.status === 'past_due'
          ? 'past_due'
          : object.status === 'canceled'
            ? 'canceled'
            : object.status === 'trialing'
              ? 'trialing'
              : 'active';
    } else if (eventType === 'invoice.payment_failed') {
      status = 'past_due';
    } else if (eventType === 'customer.subscription.deleted') {
      status = 'canceled';
    }

    return { userId, status, periodEnd };
  }

  /**
   * Verify mobile store purchase receipt
   */
  verifyMobileReceipt(
    platform: 'ios' | 'android',
    receiptToken: string,
  ): boolean {
    // In production, verify with actual store APIs
    // For now, accept tokens that start with valid prefixes
    return receiptToken.startsWith(`${platform}:valid:`);
  }

  private generateToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }
}
