import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import type {
  AuthVerifyResponse,
  EntitlementsResponse,
  BillingVerifyRequest,
  BillingVerifyResponse,
  BillingCheckoutSessionRequest,
  BillingCheckoutSessionResponse,
  BillingPortalSessionRequest,
  BillingPortalSessionResponse,
  AccountDeleteRequest,
  AccountDeleteResponse,
  ShareCreateRequest,
  ShareCreateResponse,
  ShareGetResponse,
  ShareListResponse,
  TelemetryBatchRequest,
  TelemetryBatchResponse,
} from '@marginbase/api-client';

// Mock database storage
interface UserProfile {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  provider: 'google' | 'app_store' | 'google_play';
  createdAt: string;
  updatedAt: string;
}

interface UserEntitlements {
  userId: string;
  bundle: boolean;
  profit: boolean;
  breakeven: boolean;
  cashflow: boolean;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  source: 'stripe' | 'app_store' | 'google_play' | 'unknown';
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  trialStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
}

interface ShareSnapshot {
  token: string;
  ownerUserId: string | null;
  encryptedSnapshot: string;
  expiresAt: string;
  createdAt: string;
}

// In-memory storage (for development/testing)
const users = new Map<string, UserProfile>();
const entitlements = new Map<string, UserEntitlements>();
const shareSnapshots = new Map<string, ShareSnapshot>();
const webhookEvents = new Set<string>();

// Helper functions
const now = (): string => new Date().toISOString();

const generateToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
};

const getOrCreateUserEntitlements = (userId: string): UserEntitlements => {
  if (entitlements.has(userId)) {
    return entitlements.get(userId)!;
  }

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14); // 14-day free trial

  const newEntitlements: UserEntitlements = {
    userId,
    bundle: false,
    profit: true,
    breakeven: false,
    cashflow: false,
    status: 'trialing',
    source: 'unknown',
    currentPeriodEnd: null,
    trialEnd: trialEnd.toISOString(),
    trialStartedAt: now(),
    createdAt: now(),
    updatedAt: now(),
    lastVerifiedAt: now(),
  };

  entitlements.set(userId, newEntitlements);
  return newEntitlements;
};

// Middleware
const withErrorHandling = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch((error: unknown) => {
      console.error('Handler error:', error);
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Internal server error',
      });
    });
  };
};

const bearerTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    req.idToken = authHeader.substring(7);
  }
  next();
};

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    /* eslint-enable @typescript-eslint/no-namespace */
    interface Request {
      idToken?: string;
    }
  }
}

export const createBackendServer = (): Express => {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:4173',
        'http://localhost:5173',
        'http://127.0.0.1:4173',
      ],
      credentials: true,
    }),
  );
  app.use(bearerTokenMiddleware);

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // AUTH ENDPOINTS

  /**
   * POST /auth/verify
   * Verify Google OAuth token and create/return user session
   */
  app.post(
    '/auth/verify',
    withErrorHandling(async (req: Request, res: Response) => {
      const idToken = req.idToken;

      if (!idToken) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Google ID token is required in Authorization header',
        });
      }

      // In development, we'll accept any token that looks reasonable
      // In production, this would verify with Google's tokeninfo endpoint
      if (
        process.env.NODE_ENV === 'production' &&
        !process.env.SKIP_TOKEN_VERIFICATION
      ) {
        // Real token verification would happen here
        // For now, we'll just accept tokens for development
      }

      // Extract user ID from token (in production, this comes from Google)
      // For development, we'll generate a consistent ID from the token
      const userId = `goog_${Buffer.from(idToken).toString('base64').substring(0, 20)}`;

      // Create or update user profile
      const userProfile: UserProfile = {
        userId,
        email: null,
        emailVerified: false,
        provider: 'google',
        createdAt: users.has(userId) ? users.get(userId)!.createdAt : now(),
        updatedAt: now(),
      };

      users.set(userId, userProfile);
      getOrCreateUserEntitlements(userId);

      const response: AuthVerifyResponse = {
        userId,
        email: userProfile.email,
        emailVerified: userProfile.emailVerified,
        provider: 'google',
        verifiedAt: now(),
      };

      return res.status(200).json(response);
    }),
  );

  // ENTITLEMENTS ENDPOINTS

  /**
   * GET /entitlements
   * Get current user's entitlements
   */
  app.get(
    '/entitlements',
    withErrorHandling(async (req: Request, res: Response) => {
      const idToken = req.idToken;

      if (!idToken) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authorization token required',
        });
      }

      // Derive user ID from token (same as in auth/verify)
      const userId = `goog_${Buffer.from(idToken).toString('base64').substring(0, 20)}`;

      const userEntitlements = getOrCreateUserEntitlements(userId);

      // Check if trial has expired
      if (userEntitlements.status === 'trialing' && userEntitlements.trialEnd) {
        if (new Date(userEntitlements.trialEnd) < new Date()) {
          userEntitlements.status = 'canceled';
          userEntitlements.bundle = false;
          userEntitlements.profit = true;
          userEntitlements.breakeven = false;
          userEntitlements.cashflow = false;
        }
      }

      userEntitlements.lastVerifiedAt = now();
      entitlements.set(userId, userEntitlements);

      const response: EntitlementsResponse = {
        userId,
        lastVerifiedAt: userEntitlements.lastVerifiedAt,
        entitlements: {
          bundle: userEntitlements.bundle,
          profit: userEntitlements.profit,
          breakeven: userEntitlements.breakeven,
          cashflow: userEntitlements.cashflow,
        },
        status: userEntitlements.status,
        source: userEntitlements.source,
        currentPeriodEnd: userEntitlements.currentPeriodEnd,
        trialEnd: userEntitlements.trialEnd,
        trial: {
          active:
            userEntitlements.status === 'trialing' &&
            (!userEntitlements.trialEnd ||
              new Date(userEntitlements.trialEnd) > new Date()),
          expiresAt: userEntitlements.trialEnd || now(),
        },
      };

      return res.status(200).json(response);
    }),
  );

  // BILLING ENDPOINTS

  /**
   * POST /billing/verify
   * Verify mobile store purchase
   */
  app.post(
    '/billing/verify',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as BillingVerifyRequest;

      if (!body.userId || !body.platform || !body.receiptToken) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'userId, platform, and receiptToken are required',
        });
      }

      // In production, verify with the actual store
      // For now, accept tokens that start with valid prefixes
      const isValid = body.receiptToken.startsWith(`${body.platform}:valid:`);

      if (!isValid) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Invalid receipt token',
        });
      }

      // Update entitlements based on purchase
      const userEntitlements = getOrCreateUserEntitlements(body.userId);
      userEntitlements.bundle = true;
      userEntitlements.status = 'active';
      userEntitlements.source = body.platform as 'app_store' | 'google_play';
      userEntitlements.currentPeriodEnd = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      userEntitlements.updatedAt = now();
      userEntitlements.lastVerifiedAt = now();
      entitlements.set(body.userId, userEntitlements);

      const response: BillingVerifyResponse = {
        verified: true,
        userId: body.userId,
        lastVerifiedAt: userEntitlements.lastVerifiedAt,
        entitlements: {
          bundle: userEntitlements.bundle,
          profit: userEntitlements.profit,
          breakeven: userEntitlements.breakeven,
          cashflow: userEntitlements.cashflow,
        },
        subscription: {
          platform: body.platform,
          productId: body.productId,
          status: 'active',
          expiresAt: userEntitlements.currentPeriodEnd!,
        },
      };

      return res.status(200).json(response);
    }),
  );

  /**
   * POST /billing/checkout/session
   * Create Stripe checkout session
   */
  app.post(
    '/billing/checkout/session',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as BillingCheckoutSessionRequest;

      if (!body.planId || !body.userId) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'planId and userId are required',
        });
      }

      // In production, create actual Stripe checkout session
      // For development, return a mock Stripe URL
      const mockCheckoutUrl = `https://checkout.stripe.dev?planId=${body.planId}&userId=${body.userId}&email=${encodeURIComponent(body.email || '')}`;

      const response: BillingCheckoutSessionResponse = {
        checkoutUrl: mockCheckoutUrl,
      };

      return res.status(200).json(response);
    }),
  );

  /**
   * POST /billing/portal-session
   * Create Stripe billing portal session
   */
  app.post(
    '/billing/portal-session',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as BillingPortalSessionRequest;

      if (!body.userId) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'userId is required',
        });
      }

      // In production, create actual Stripe billing portal session
      const mockPortalUrl = `https://billing.stripe.dev?userId=${body.userId}&returnUrl=${encodeURIComponent(body.returnUrl || 'http://localhost')}`;

      const response: BillingPortalSessionResponse = {
        portalUrl: mockPortalUrl,
      };

      return res.status(200).json(response);
    }),
  );

  /**
   * POST /billing/webhook/stripe
   * Stripe webhook events
   */
  app.post(
    '/billing/webhook/stripe',
    withErrorHandling(async (req: Request, res: Response) => {
      const signature = req.headers['stripe-signature'] as string;
      const body = req.body;

      // In production, verify Stripe signature
      // For development, accept all webhooks
      if (process.env.NODE_ENV === 'production' && !signature) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Invalid Stripe signature',
        });
      }

      // Process webhook idempotently
      const eventId = body.id || generateToken();
      if (webhookEvents.has(eventId)) {
        return res.status(200).json({ received: true });
      }

      webhookEvents.add(eventId);

      // Handle different event types
      const eventType = body.type;
      if (
        eventType === 'checkout.session.completed' ||
        eventType === 'customer.subscription.updated'
      ) {
        // Update user entitlements
        const metadata = body.data?.object?.metadata || {};
        const userId = metadata.userId as string;

        if (userId) {
          const userEntitlements = getOrCreateUserEntitlements(userId);
          userEntitlements.bundle = true;
          userEntitlements.status = 'active';
          userEntitlements.source = 'stripe';
          userEntitlements.currentPeriodEnd = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          userEntitlements.updatedAt = now();
          entitlements.set(userId, userEntitlements);
        }
      }

      return res.status(200).json({ received: true });
    }),
  );

  // ACCOUNT ENDPOINTS

  /**
   * POST /account/delete
   * Delete user account
   */
  app.post(
    '/account/delete',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as AccountDeleteRequest;

      if (!body.userId) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'userId is required',
        });
      }

      // Delete user data
      users.delete(body.userId);
      entitlements.delete(body.userId);

      const response: AccountDeleteResponse = {
        deleted: true,
        userId: body.userId,
        deletedEntitlements: true,
        deletedUserProfile: true,
      };

      return res.status(200).json(response);
    }),
  );

  // SHARE ENDPOINTS

  /**
   * POST /share/create
   * Create shareable scenario snapshot
   */
  app.post(
    '/share/create',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as ShareCreateRequest;

      if (!body.encryptedSnapshot) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'encryptedSnapshot is required',
        });
      }

      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (body.expiresInDays || 7));

      const snapshot: ShareSnapshot = {
        token,
        ownerUserId: body.ownerUserId || null,
        encryptedSnapshot: JSON.stringify(body.encryptedSnapshot),
        expiresAt: expiresAt.toISOString(),
        createdAt: now(),
      };

      shareSnapshots.set(token, snapshot);

      const response: ShareCreateResponse = {
        token,
        expiresAt: expiresAt.toISOString(),
      };

      return res.status(200).json(response);
    }),
  );

  /**
   * GET /share/:token
   * Get shareable scenario snapshot
   */
  app.get(
    '/share/:token',
    withErrorHandling(async (req: Request, res: Response) => {
      const token = req.params.token;

      if (!token) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'token is required',
        });
      }

      const snapshot = shareSnapshots.get(token);

      if (!snapshot) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Share snapshot not found',
        });
      }

      if (new Date(snapshot.expiresAt) < new Date()) {
        return res.status(410).json({
          code: 'EXPIRED',
          message: 'Share snapshot has expired',
        });
      }

      const response: ShareGetResponse = {
        encryptedSnapshot: JSON.parse(snapshot.encryptedSnapshot),
      };

      return res.status(200).json(response);
    }),
  );

  /**
   * DELETE /share/:token
   * Delete/revoke share snapshot
   */
  app.delete(
    '/share/:token',
    withErrorHandling(async (req: Request, res: Response) => {
      const token = req.params.token;

      if (!token) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'token is required',
        });
      }

      const snapshot = shareSnapshots.get(token);

      if (!snapshot) {
        return res.status(404).json({
          code: 'NOT_FOUND',
          message: 'Share snapshot not found',
        });
      }

      // Check authorization (only owner can delete)
      if (req.idToken && snapshot.ownerUserId) {
        const userId = `goog_${Buffer.from(req.idToken).toString('base64').substring(0, 20)}`;
        if (userId !== snapshot.ownerUserId) {
          return res.status(403).json({
            code: 'FORBIDDEN',
            message: 'You do not have permission to delete this share',
          });
        }
      }

      shareSnapshots.delete(token);

      return res.status(200).json({
        revoked: true,
        token,
      });
    }),
  );

  /**
   * GET /share/list
   * List user's share snapshots
   */
  app.get(
    '/share/list',
    withErrorHandling(async (req: Request, res: Response) => {
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'userId query parameter is required',
        });
      }

      const items = Array.from(shareSnapshots.values())
        .filter(
          (s) =>
            s.ownerUserId === userId && new Date(s.expiresAt) >= new Date(),
        )
        .map((s) => ({
          token: s.token,
          module: 'profit',
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
        }));

      const response: ShareListResponse = {
        items,
      };

      return res.status(200).json(response);
    }),
  );

  // TELEMETRY ENDPOINTS

  /**
   * POST /telemetry/batch
   * Receive batch of telemetry events
   */
  app.post(
    '/telemetry/batch',
    withErrorHandling(async (req: Request, res: Response) => {
      const body = req.body as TelemetryBatchRequest;

      if (!body.events || !Array.isArray(body.events)) {
        return res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'events array is required',
        });
      }

      // In production, validate against allowlist and store to S3
      // For development, just accept and acknowledge
      const objectKey = `telemetry/${new Date().toISOString()}-${generateToken()}.json`;

      const response: TelemetryBatchResponse = {
        accepted: true,
        count: body.events.length,
        objectKey,
      };

      return res.status(200).json(response);
    }),
  );

  return app;
};

// Server bootstrap
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const app = createBackendServer();

  app.listen(PORT, () => {
    // Server started on port ${PORT}
  });
}
