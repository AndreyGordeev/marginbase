import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import type {
  AccountDeleteRequest,
  AccountDeleteResponse,
  ShareCreateRequest,
  ShareCreateResponse,
  ShareGetResponse,
  ShareListResponse,
  TelemetryBatchRequest,
  TelemetryBatchResponse,
} from '@marginbase/api-client';
import {
  handleCheckoutCreate,
  handlePortalCreate,
  handleWebhook,
  handleEntitlementsGet,
  handleBillingVerify,
} from './handlers/billing.js';
import { handleAuthVerify } from './handlers/auth.js';
import { createBillingProvider } from './providers/billing-provider.js';
import { AuthService } from './services/auth-service.js';
import { BillingService } from './services/billing-service.js';
import { EntitlementService } from './services/entitlement-service.js';

// In-memory persistence for local/dev runtime.
interface UserProfile {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  provider: 'google' | 'app_store' | 'google_play';
  createdAt: string;
  updatedAt: string;
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
const shareSnapshots = new Map<string, ShareSnapshot>();

// Helper functions
const now = (): string => new Date().toISOString();

const generateToken = (): string => {
  return crypto.randomBytes(24).toString('hex');
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

export const createBackendServer = async (): Promise<Express> => {
  const app = express();

  // Initialize services
  const authService = new AuthService();
  const billingProvider = await createBillingProvider();
  const billingService = new BillingService(billingProvider);
  const entitlementService = new EntitlementService();

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
  app.post('/auth/verify', handleAuthVerify(authService));

  // ENTITLEMENTS ENDPOINTS
  app.get('/entitlements/:userId', handleEntitlementsGet(entitlementService));
  app.get('/billing/entitlements/:userId', handleEntitlementsGet(entitlementService));

  // BILLING ENDPOINTS
  app.post('/billing/verify', handleBillingVerify(billingService, entitlementService));
  app.post('/billing/checkout/session', handleCheckoutCreate(billingService));
  app.post('/billing/portal-session', handlePortalCreate(billingService));
  app.post('/billing/portal/session', handlePortalCreate(billingService));
  app.post('/billing/webhook/stripe', handleWebhook(billingService, entitlementService));
  app.post('/billing/webhook', handleWebhook(billingService, entitlementService));

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
      entitlementService.deleteEntitlements(body.userId);

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
  void (async () => {
    const app = await createBackendServer();

    app.listen(PORT, () => {
      // Server started on port ${PORT}
    });
  })();
}
