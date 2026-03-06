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

// In-memory persistence for local/dev runtime.
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

interface GoogleTokenInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  aud?: string;
  iss?: string;
  exp?: string;
}

const GOOGLE_TOKENINFO_URL =
  process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';
const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

// Helper functions
const now = (): string => new Date().toISOString();

const generateToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = Buffer.from(payloadBase64, 'base64').toString('utf8');
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isTrustedIssuer = (issuer: string | undefined): boolean => {
  return (
    issuer === 'accounts.google.com' ||
    issuer === 'https://accounts.google.com'
  );
};

const parseAllowedGoogleAudiences = (): string[] => {
  const raw = process.env.GOOGLE_CLIENT_IDS ?? process.env.VITE_GOOGLE_CLIENT_ID;
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const verifyTokenViaGoogleTokenInfo = async (
  idToken: string,
): Promise<GoogleTokenInfoResponse | null> => {
  const url = `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as GoogleTokenInfoResponse;
};

const verifyGoogleIdToken = async (
  idToken: string,
): Promise<{ userId: string; email: string | null; emailVerified: boolean }> => {
  const audiences = parseAllowedGoogleAudiences();
  const verificationMode = process.env.GOOGLE_VERIFICATION_MODE ?? 'tokeninfo';

  if (verificationMode === 'development') {
    const payload = decodeJwtPayload(idToken);
    const subject = typeof payload?.sub === 'string' ? payload.sub : null;
    const audience = typeof payload?.aud === 'string' ? payload.aud : undefined;
    const issuer = typeof payload?.iss === 'string' ? payload.iss : undefined;

    if (!subject) {
      throw new Error('JWT payload does not contain sub claim.');
    }

    if (audiences.length > 0 && audience && !audiences.includes(audience)) {
      throw new Error('Google token audience is not allowed.');
    }

    if (issuer && !isTrustedIssuer(issuer)) {
      throw new Error('Google token issuer is not trusted.');
    }

    return {
      userId: subject,
      email: typeof payload?.email === 'string' ? payload.email : null,
      emailVerified: payload?.email_verified === true,
    };
  }

  const tokenInfo = await verifyTokenViaGoogleTokenInfo(idToken);
  const subject = tokenInfo?.sub;
  const audience = tokenInfo?.aud;
  const issuer = tokenInfo?.iss;

  if (!tokenInfo || !subject || !audience || !isTrustedIssuer(issuer)) {
    throw new Error('Google token verification failed.');
  }

  if (audiences.length > 0 && !audiences.includes(audience)) {
    throw new Error('Google token audience is not allowed.');
  }

  return {
    userId: subject,
    email: tokenInfo.email ?? null,
    emailVerified:
      tokenInfo.email_verified === true || tokenInfo.email_verified === 'true',
  };
};

const encodeFormBody = (payload: Record<string, string | number>): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    params.append(key, String(value));
  }
  return params.toString();
};

const stripePost = async (
  path: string,
  payload: Record<string, string | number>,
): Promise<Record<string, unknown>> => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error('STRIPE_SECRET_KEY is not configured.');
  }

  const response = await fetch(`${STRIPE_API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: encodeFormBody(payload),
  });

  const parsed = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(parsed.error?.message || 'Stripe API request failed.');
  }

  return parsed as Record<string, unknown>;
};

const parseStripeSignatureHeader = (
  headerValue: string,
): { timestamp: string; signatures: string[] } => {
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
};

const verifyStripeWebhookSignature = (
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
): boolean => {
  const parsed = parseStripeSignatureHeader(signatureHeader);
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
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  return parsed.signatures.some((candidate) => {
    try {
      const left = Buffer.from(candidate, 'utf8');
      const right = Buffer.from(expected, 'utf8');
      return left.length === right.length && crypto.timingSafeEqual(left, right);
    } catch {
      return false;
    }
  });
};

const applyBillingStatus = (
  existing: UserEntitlements,
  status: 'active' | 'trialing' | 'past_due' | 'canceled',
  source: UserEntitlements['source'],
  periodEnd: string | null,
): UserEntitlements => {
  const updated: UserEntitlements = {
    ...existing,
    status,
    source,
    currentPeriodEnd: periodEnd,
    trialEnd: status === 'trialing' ? periodEnd : null,
    updatedAt: now(),
    lastVerifiedAt: now(),
  };

  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    updated.bundle = true;
    updated.profit = true;
    updated.breakeven = true;
    updated.cashflow = true;
  }

  if (status === 'canceled') {
    updated.bundle = false;
    updated.profit = true;
    updated.breakeven = false;
    updated.cashflow = false;
  }

  return updated;
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
  handler: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown>,
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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
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
      const idToken = req.idToken || (req.body as { googleIdToken?: string }).googleIdToken;

      if (!idToken) {
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'Google ID token is required in Authorization header',
        });
        return;
      }

      let verified: { userId: string; email: string | null; emailVerified: boolean };
      try {
        verified = await verifyGoogleIdToken(idToken);
      } catch (error) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Token verification failed',
        });
        return;
      }

      const userId = verified.userId;

      // Create or update user profile
      const userProfile: UserProfile = {
        userId,
        email: verified.email,
        emailVerified: verified.emailVerified,
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

      res.status(200).json(response);
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
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Authorization token required',
        });
        return;
      }

      let userId = '';
      try {
        const verified = await verifyGoogleIdToken(idToken);
        userId = verified.userId;
      } catch {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Token verification failed',
        });
        return;
      }

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

      res.status(200).json(response);
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
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'planId and userId are required',
        });
        return;
      }

      let checkoutUrl = `https://checkout.stripe.dev?planId=${body.planId}&userId=${body.userId}&email=${encodeURIComponent(body.email || '')}`;

      const stripePriceMap: Record<string, string | undefined> = {
        profit: process.env.STRIPE_PRICE_PROFIT,
        breakeven: process.env.STRIPE_PRICE_BREAKEVEN,
        cashflow: process.env.STRIPE_PRICE_CASHFLOW,
        bundle: process.env.STRIPE_PRICE_BUNDLE,
      };
      const priceId = stripePriceMap[body.planId];

      if (process.env.STRIPE_SECRET_KEY && priceId) {
        try {
          const session = await stripePost('/checkout/sessions', {
            mode: 'subscription',
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': 1,
            success_url:
              process.env.STRIPE_CHECKOUT_SUCCESS_URL ||
              'http://localhost:4173/?checkout=success',
            cancel_url:
              process.env.STRIPE_CHECKOUT_CANCEL_URL ||
              'http://localhost:4173/?checkout=cancel',
            'metadata[userId]': body.userId,
            'metadata[planId]': body.planId,
            customer_email: body.email || '',
            client_reference_id: body.userId,
          });

          if (typeof session.url === 'string' && session.url.length > 0) {
            checkoutUrl = session.url;
          }
        } catch (error) {
          res.status(502).json({
            code: 'STRIPE_CHECKOUT_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to create Stripe checkout session',
          });
          return;
        }
      }

      const response: BillingCheckoutSessionResponse = {
        checkoutUrl,
      };

      res.status(200).json(response);
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
        res.status(400).json({
          code: 'INVALID_REQUEST',
          message: 'userId is required',
        });
        return;
      }

      let portalUrl = `https://billing.stripe.dev?userId=${body.userId}&returnUrl=${encodeURIComponent(body.returnUrl || 'http://localhost')}`;

      if (process.env.STRIPE_SECRET_KEY) {
        try {
          const stripeCustomerId = `cus_${body.userId}`;
          const session = await stripePost('/billing_portal/sessions', {
            customer: stripeCustomerId,
            return_url:
              body.returnUrl ||
              process.env.STRIPE_PORTAL_RETURN_URL ||
              'http://localhost:4173/#/settings',
          });

          if (typeof session.url === 'string' && session.url.length > 0) {
            portalUrl = session.url;
          }
        } catch (error) {
          res.status(502).json({
            code: 'STRIPE_PORTAL_ERROR',
            message:
              error instanceof Error
                ? error.message
                : 'Unable to create Stripe portal session',
          });
          return;
        }
      }

      const response: BillingPortalSessionResponse = {
        portalUrl,
      };

      res.status(200).json(response);
    }),
  );

  /**
   * POST /billing/webhook/stripe
   * Stripe webhook events
   */
  const handleBillingWebhook = withErrorHandling(
    async (req: Request, res: Response) => {
      const rawBody = JSON.stringify(req.body);
      const signature = (req.headers['stripe-signature'] as string) || '';
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

      if (
        webhookSecret &&
        !verifyStripeWebhookSignature(rawBody, signature, webhookSecret)
      ) {
        res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Invalid Stripe signature',
        });
        return;
      }

      const body = req.body as {
        id?: string;
        type?: string;
        data?: { object?: { metadata?: Record<string, string>; status?: string; current_period_end?: number; client_reference_id?: string } };
      };

      const eventId = body.id || generateToken();
      if (webhookEvents.has(eventId)) {
        res.status(200).json({ received: true, idempotent: true });
        return;
      }

      webhookEvents.add(eventId);

      const eventType = body.type || '';
      const object = body.data?.object || {};
      const metadata = object.metadata || {};
      const userId = metadata.userId || object.client_reference_id || '';

      if (userId) {
        const current = getOrCreateUserEntitlements(userId);
        const periodEnd =
          typeof object.current_period_end === 'number'
            ? new Date(object.current_period_end * 1000).toISOString()
            : current.currentPeriodEnd;

        let status: UserEntitlements['status'] = current.status;
        if (eventType === 'checkout.session.completed') {
          status = object.status === 'trialing' ? 'trialing' : 'active';
        }
        if (
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
        }
        if (eventType === 'invoice.payment_failed') {
          status = 'past_due';
        }
        if (eventType === 'customer.subscription.deleted') {
          status = 'canceled';
        }

        const updated = applyBillingStatus(current, status, 'stripe', periodEnd);
        entitlements.set(userId, updated);
      }

      res.status(200).json({ received: true, eventId });
    },
  );

  app.post('/billing/webhook/stripe', handleBillingWebhook);
  app.post('/billing/webhook', handleBillingWebhook);

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
          module: 'profit' as const,
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
