import type { EntitlementCache, EntitlementSet, EntitlementStatus, EntitlementSource } from '@marginbase/entitlements';

/**
 * Factory for creating entitlement cache states in different scenarios.
 * Use these to test module locks, upgrade flows, and grace periods.
 */

export interface EntitlementCacheFactoryOptions {
  entitlementSet?: Partial<EntitlementSet>;
  lastVerifiedAt?: string;
  status?: EntitlementStatus;
  source?: EntitlementSource;
  currentPeriodEnd?: string;
  trialEnd?: string;
}

/**
 * Create a minimal entitlement cache (free tier)
 */
export const freeEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: false,
      profit: false,
      breakeven: false,
      cashflow: false,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? new Date().toISOString(),
    status: options.status ?? 'active',
    source: options.source ?? 'unknown'
  };
};

/**
 * Create an entitlement cache with single module (pro tier)
 */
export const proSingleModuleFactory = (module: 'profit' | 'breakeven' | 'cashflow', options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: false,
      profit: module === 'profit',
      breakeven: module === 'breakeven',
      cashflow: module === 'cashflow',
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? new Date().toISOString(),
    status: options.status ?? 'active',
    source: options.source ?? 'stripe'
  };
};

/**
 * Create an entitlement cache with bundle (all modules)
 */
export const bundleEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? new Date().toISOString(),
    status: options.status ?? 'active',
    source: options.source ?? 'stripe'
  };
};

/**
 * Create a trial entitlement cache (all modules, trialing status)
 */
export const trialEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  
  return {
    entitlementSet: {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? now.toISOString(),
    status: options.status ?? 'trialing',
    source: options.source ?? 'stripe',
    trialEnd: options.trialEnd ?? trialEnd.toISOString()
  };
};

/**
 * Create a past-due entitlement cache (subscription expired)
 */
export const pastDueEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  const now = new Date();
  const pastDue = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
  
  return {
    entitlementSet: {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? pastDue.toISOString(),
    status: options.status ?? 'past_due',
    source: options.source ?? 'stripe'
  };
};

/**
 * Create a canceled entitlement cache (no modules available)
 */
export const canceledEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: false,
      profit: false,
      breakeven: false,
      cashflow: false,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? new Date().toISOString(),
    status: options.status ?? 'canceled',
    source: options.source ?? 'stripe'
  };
};

/**
 * Create a stale entitlement cache (beyond grace period)
 */
export const staleEntitlementFactory = (options: EntitlementCacheFactoryOptions = {}): EntitlementCache => {
  const now = new Date();
  const staleTime = new Date(now.getTime() - 100 * 60 * 60 * 1000); // 100 hours ago (beyond 72h grace)
  
  return {
    entitlementSet: {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true,
      ...options.entitlementSet
    },
    lastVerifiedAt: options.lastVerifiedAt ?? staleTime.toISOString(),
    status: options.status ?? 'active',
    source: options.source ?? 'stripe'
  };
};
