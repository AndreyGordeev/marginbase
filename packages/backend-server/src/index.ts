/**
 * Backend Server Package
 *
 * Provides authentication, billing, and entitlement services for MarginBase
 *
 * @module @marginbase/backend-server
 */

// Services
export { AuthService } from './services/auth-service.js';
export { BillingService } from './services/billing-service.js';
export type {
  CheckoutSessionParams,
  PortalSessionParams,
  WebhookEvent,
} from './services/billing-service.js';
export { EntitlementService } from './services/entitlement-service.js';
export type { UserEntitlements } from './services/entitlement-service.js';

// Providers
export { createBillingProvider } from './providers/billing-provider.js';
export type { BillingProvider } from './providers/billing-provider.js';

// Handlers
export {
  handleAuthVerify,
} from './handlers/auth.js';
export {
  handleCheckoutCreate,
  handlePortalCreate,
  handleWebhook,
  handleEntitlementsGet,
  handleBillingVerify,
} from './handlers/billing.js';

// Lambda adapters
export {
  handleAuthLambdaEvent,
  handleBillingLambdaEvent,
  handleEntitlementsLambdaEvent,
} from './adapters/lambda.js';

// Testing utilities
export { resetBackendRuntimeForTests } from './runtime.js';
