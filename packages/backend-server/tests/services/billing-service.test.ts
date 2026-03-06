import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BillingService } from '../../src/services/billing-service';
import type { BillingProvider } from '../../src/providers/billing-provider';

describe('BillingService', () => {
  let billingService: BillingService;
  let mockProvider: BillingProvider;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };

    mockProvider = {
      createCheckoutSession: vi.fn(),
      createPortalSession: vi.fn(),
      verifyWebhookSignature: vi.fn(),
    };

    billingService = new BillingService(mockProvider);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('createCheckoutSession', () => {
    beforeEach(() => {
      process.env.STRIPE_PRICE_PROFIT = 'price_profit_123';
      process.env.STRIPE_PRICE_BREAKEVEN = 'price_breakeven_456';
      process.env.STRIPE_PRICE_CASHFLOW = 'price_cashflow_789';
      process.env.STRIPE_PRICE_BUNDLE = 'price_bundle_bundle';
      process.env.STRIPE_CHECKOUT_SUCCESS_URL = 'https://app.test/success';
      process.env.STRIPE_CHECKOUT_CANCEL_URL = 'https://app.test/cancel';
    });

    it('should create checkout session for profit plan', async () => {
      vi.mocked(mockProvider.createCheckoutSession).mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/session_abc',
      });

      const url = await billingService.createCheckoutSession({
        planId: 'profit',
        userId: 'user-123',
        email: 'test@example.com',
      });

      expect(url).toBe('https://checkout.stripe.com/session_abc');
      expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith({
        priceId: 'price_profit_123',
        userId: 'user-123',
        email: 'test@example.com',
        planId: 'profit',
        successUrl: 'https://app.test/success',
        cancelUrl: 'https://app.test/cancel',
      });
    });

    it('should create checkout session for bundle plan', async () => {
      vi.mocked(mockProvider.createCheckoutSession).mockResolvedValueOnce({
        url: 'https://checkout.stripe.com/session_bundle',
      });

      const url = await billingService.createCheckoutSession({
        planId: 'bundle',
        userId: 'user-456',
        email: 'bundle@example.com',
      });

      expect(url).toBe('https://checkout.stripe.com/session_bundle');
      expect(mockProvider.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_bundle_bundle',
          planId: 'bundle',
        }),
      );
    });

    it('should fallback to dev URL when price ID not configured', async () => {
      delete process.env.STRIPE_PRICE_PROFIT;

      const url = await billingService.createCheckoutSession({
        planId: 'profit',
        userId: 'user-789',
        email: 'fallback@example.com',
      });

      expect(url).toContain('checkout.stripe.dev');
      expect(url).toContain('planId=profit');
      expect(url).toContain('userId=user-789');
      expect(mockProvider.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should fallback to dev URL on provider error', async () => {
      vi.mocked(mockProvider.createCheckoutSession).mockRejectedValueOnce(
        new Error('Stripe API error'),
      );

      const url = await billingService.createCheckoutSession({
        planId: 'breakeven',
        userId: 'user-error',
        email: 'error@example.com',
      });

      expect(url).toContain('checkout.stripe.dev');
      expect(url).toContain('planId=breakeven');
    });

    it('should fallback for unknown plan (price mismatch scenario)', async () => {
      const url = await billingService.createCheckoutSession({
        planId: 'unknown_plan',
        userId: 'user-price-mismatch',
        email: 'price@example.com',
      });

      expect(url).toContain('checkout.stripe.dev');
      expect(url).toContain('planId=unknown_plan');
      expect(mockProvider.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe('createPortalSession', () => {
    beforeEach(() => {
      process.env.STRIPE_PORTAL_RETURN_URL = 'https://app.test/settings';
    });

    it('should create portal session with custom return URL', async () => {
      vi.mocked(mockProvider.createPortalSession).mockResolvedValueOnce({
        url: 'https://billing.stripe.com/portal_xyz',
      });

      const url = await billingService.createPortalSession({
        userId: 'user-portal',
        returnUrl: 'https://app.test/dashboard',
      });

      expect(url).toBe('https://billing.stripe.com/portal_xyz');
      expect(mockProvider.createPortalSession).toHaveBeenCalledWith({
        customerId: 'cus_user-portal',
        returnUrl: 'https://app.test/dashboard',
      });
    });

    it('should create portal session with default return URL', async () => {
      vi.mocked(mockProvider.createPortalSession).mockResolvedValueOnce({
        url: 'https://billing.stripe.com/portal_default',
      });

      const url = await billingService.createPortalSession({
        userId: 'user-default',
      });

      expect(url).toBe('https://billing.stripe.com/portal_default');
      expect(mockProvider.createPortalSession).toHaveBeenCalledWith({
        customerId: 'cus_user-default',
        returnUrl: 'https://app.test/settings',
      });
    });

    it('should fallback to dev URL on provider error', async () => {
      vi.mocked(mockProvider.createPortalSession).mockRejectedValueOnce(
        new Error('Portal API error'),
      );

      const url = await billingService.createPortalSession({
        userId: 'user-portal-error',
        returnUrl: 'https://app.test/home',
      });

      expect(url).toContain('billing.stripe.dev');
      expect(url).toContain('userId=user-portal-error');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      vi.mocked(mockProvider.verifyWebhookSignature).mockReturnValueOnce(true);

      const result = billingService.verifyWebhookSignature(
        '{"event":"test"}',
        't=123,v1=abc',
      );

      expect(result).toBe(true);
      expect(mockProvider.verifyWebhookSignature).toHaveBeenCalledWith(
        '{"event":"test"}',
        't=123,v1=abc',
        'whsec_test_secret',
      );
    });

    it('should reject invalid webhook signature', () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
      vi.mocked(mockProvider.verifyWebhookSignature).mockReturnValueOnce(false);

      const result = billingService.verifyWebhookSignature(
        '{"event":"test"}',
        't=123,v1=wrong',
      );

      expect(result).toBe(false);
    });

    it('should accept all webhooks when secret not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      const result = billingService.verifyWebhookSignature(
        '{"event":"test"}',
        't=123,v1=any',
      );

      expect(result).toBe(true);
      expect(mockProvider.verifyWebhookSignature).not.toHaveBeenCalled();
    });
  });

  describe('processWebhookEvent', () => {
    it('should process checkout.session.completed event', () => {
      const event = {
        id: 'evt_checkout_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-checkout' },
            status: 'complete',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result).toEqual({
        userId: 'user-checkout',
        status: 'active',
        periodEnd: expect.any(String),
      });
    });

    it('should process customer.subscription.updated event', () => {
      const event = {
        id: 'evt_sub_update_456',
        type: 'customer.subscription.updated',
        data: {
          object: {
            metadata: { userId: 'user-sub-update' },
            status: 'active',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result).toEqual({
        userId: 'user-sub-update',
        status: 'active',
        periodEnd: expect.any(String),
      });
    });

    it('should process invoice.payment_failed event', () => {
      const event = {
        id: 'evt_invoice_failed_789',
        type: 'invoice.payment_failed',
        data: {
          object: {
            metadata: { userId: 'user-payment-failed' },
            status: 'open',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result).toEqual({
        userId: 'user-payment-failed',
        status: 'past_due',
        periodEnd: expect.any(String),
      });
    });

    it('should process customer.subscription.deleted event', () => {
      const event = {
        id: 'evt_sub_delete_012',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            metadata: { userId: 'user-canceled' },
            status: 'canceled',
            current_period_end: Math.floor(Date.now() / 1000),
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result).toEqual({
        userId: 'user-canceled',
        status: 'canceled',
        periodEnd: expect.any(String),
      });
    });

    it('should handle trialing status', () => {
      const event = {
        id: 'evt_trial_345',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-trial' },
            status: 'trialing',
            current_period_end: Math.floor(Date.now() / 1000) + 1209600,
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result?.status).toBe('trialing');
    });

    it('should enforce idempotency - duplicate events return null', () => {
      const event = {
        id: 'evt_duplicate_678',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-dup' },
            status: 'complete',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const result1 = billingService.processWebhookEvent(event);
      const result2 = billingService.processWebhookEvent(event);

      expect(result1).not.toBeNull();
      expect(result2).toBeNull();
    });

    it('should return null for events without userId', () => {
      const event = {
        id: 'evt_no_user_901',
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {},
            status: 'complete',
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result).toBeNull();
    });

    it('should extract userId from client_reference_id fallback', () => {
      const event = {
        id: 'evt_ref_234',
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'user-from-ref',
            status: 'complete',
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };

      const result = billingService.processWebhookEvent(event);

      expect(result?.userId).toBe('user-from-ref');
    });

    it('should return null for malformed webhook payload', () => {
      const malformedEvent = {
        id: 'evt-malformed',
        type: undefined,
        data: {
          object: undefined,
        },
      };

      const result = billingService.processWebhookEvent(malformedEvent);
      expect(result).toBeNull();
    });
  });

  describe('verifyMobileReceipt', () => {
    it('should accept valid iOS receipt', () => {
      const result = billingService.verifyMobileReceipt(
        'ios',
        'ios:valid:receipt_12345',
      );

      expect(result).toBe(true);
    });

    it('should accept valid Android receipt', () => {
      const result = billingService.verifyMobileReceipt(
        'android',
        'android:valid:purchase_token_abc',
      );

      expect(result).toBe(true);
    });

    it('should reject invalid iOS receipt', () => {
      const result = billingService.verifyMobileReceipt(
        'ios',
        'ios:invalid:bad_receipt',
      );

      expect(result).toBe(false);
    });

    it('should reject invalid Android receipt', () => {
      const result = billingService.verifyMobileReceipt(
        'android',
        'android:invalid:bad_token',
      );

      expect(result).toBe(false);
    });

    it('should reject mismatched platform receipt', () => {
      const result = billingService.verifyMobileReceipt(
        'ios',
        'android:valid:token',
      );

      expect(result).toBe(false);
    });
  });
});
