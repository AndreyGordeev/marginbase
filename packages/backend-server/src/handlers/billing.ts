import type { Request, Response } from 'express';
import type {
  BillingCheckoutSessionResponse,
  BillingPortalSessionResponse,
  EntitlementsResponse,
  BillingVerifyResponse,
  PurchasePlatform,
} from '@marginbase/api-client';
import { BillingService } from '../services/billing-service';
import { EntitlementService } from '../services/entitlement-service';

/**
 * POST /billing/checkout - Create checkout session
 */
export function handleCheckoutCreate(
  billingService: BillingService,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { planId, userId, email } = req.body;

      if (
        !planId ||
        !userId ||
        !email ||
        typeof planId !== 'string' ||
        typeof userId !== 'string' ||
        typeof email !== 'string'
      ) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const url = await billingService.createCheckoutSession({
        planId,
        userId,
        email,
      });

      const response: BillingCheckoutSessionResponse = {
        checkoutUrl: url,
      };

      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Checkout create handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

/**
 * POST /billing/portal - Create portal session
 */
export function handlePortalCreate(billingService: BillingService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, returnUrl } = req.body;

      if (!userId || typeof userId !== 'string') {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      const url = await billingService.createPortalSession({
        userId,
        returnUrl,
      });

      const response: BillingPortalSessionResponse = {
        portalUrl: url,
      };

      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Portal create handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

/**
 * POST /billing/webhook - Handle Stripe webhook
 */
export function handleWebhook(
  billingService: BillingService,
  entitlementService: EntitlementService,
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = req.headers['stripe-signature'] as string | undefined;

      // Allow webhooks without signature in development mode
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (webhookSecret && !signature) {
        res.status(400).json({ error: 'Missing stripe-signature header' });
        return;
      }

      const rawBody = JSON.stringify(req.body);
      const validSignature = billingService.verifyWebhookSignature(
        rawBody,
        signature || '',
      );

      if (!validSignature) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }

      const event = req.body;
      const result = billingService.processWebhookEvent(event);

      if (!result) {
        // Event already processed or invalid
        res.status(200).json({ received: true, idempotent: true });
        return;
      }

      // Update entitlements
      entitlementService.applyBillingStatus(
        result.userId,
        result.status,
        'stripe',
        result.periodEnd,
      );

      res.status(200).json({ received: true });
    } catch (error: unknown) {
      console.error('Webhook handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

/**
 * GET /entitlements/:userId - Get user entitlements
 */
export function handleEntitlementsGet(entitlementService: EntitlementService) {
  return (req: Request, res: Response): void => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'Missing userId' });
        return;
      }

      const response: EntitlementsResponse =
        entitlementService.toEntitlementsResponse(userId);

      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Entitlements get handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}

/**
 * POST /billing/verify - Verify mobile purchase receipt
 */
export function handleBillingVerify(
  billingService: BillingService,
  entitlementService: EntitlementService,
) {
  return (req: Request, res: Response): void => {
    try {
      const { platform, receiptToken, userId, productId } = req.body;

      if (!platform || !receiptToken || !userId || !productId) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (platform !== 'ios' && platform !== 'android') {
        res.status(400).json({ error: 'Invalid platform' });
        return;
      }

      const purchasePlatform = platform as PurchasePlatform;
      const isValid = billingService.verifyMobileReceipt(
        purchasePlatform,
        receiptToken,
      );

      if (!isValid) {
        res.status(401).json({ error: 'Invalid receipt' });
        return;
      }

      const response: BillingVerifyResponse =
        entitlementService.toBillingVerifyResponse(userId, purchasePlatform, productId);

      res.status(200).json(response);
    } catch (error: unknown) {
      console.error('Billing verify handler error:', error);
      res
        .status(500)
        .json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };
}
