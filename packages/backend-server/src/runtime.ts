import { AuthService } from './services/auth-service.js';
import { BillingService } from './services/billing-service.js';
import { EntitlementService } from './services/entitlement-service.js';
import { createBillingProvider } from './providers/billing-provider.js';

export interface BackendRuntime {
  authService: AuthService;
  billingService: BillingService;
  entitlementService: EntitlementService;
}

let runtimePromise: Promise<BackendRuntime> | null = null;

export const getBackendRuntime = async (): Promise<BackendRuntime> => {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const billingProvider = await createBillingProvider();
      return {
        authService: new AuthService(),
        billingService: new BillingService(billingProvider),
        entitlementService: new EntitlementService(),
      };
    })();
  }

  return runtimePromise;
};

export const resetBackendRuntimeForTests = (): void => {
  runtimePromise = null;
};
