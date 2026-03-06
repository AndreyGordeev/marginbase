/**
 * Backend Server Package
 *
 * Provides authentication, billing, and entitlement services for MarginBase
 *
 * @module @marginbase/backend-server
 */

// Services
export { AuthService } from './services/auth-service';
export { BillingService } from './services/billing-service';
export type { CheckoutSessionParams, PortalSessionParams, WebhookEvent } from './services/billing-service';
export { EntitlementService } from './services/entitlement-service';
export type { UserEntitlements } from './services/entitlement-service';

// Providers
export { createBillingProvider } from './providers/billing-provider';
export type { BillingProvider } from './providers/billing-provider';

// Handlers
export {
  handleAuthVerify,
} from './handlers/auth';
export {
  handleCheckoutCreate,
  handlePortalCreate,
  handleWebhook,
  handleEntitlementsGet,
  handleBillingVerify,
} from './handlers/billing';
