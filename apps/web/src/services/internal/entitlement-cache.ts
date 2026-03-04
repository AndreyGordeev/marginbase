import type { EntitlementsResponse } from '@marginbase/api-client';
import type { EntitlementCache, EntitlementSet } from '@marginbase/entitlements';

const ENTITLEMENT_CACHE_STORAGE_KEY = 'marginbase_entitlements';

export const DEFAULT_ENTITLEMENTS: EntitlementSet = {
  bundle: false,
  profit: true,
  breakeven: false,
  cashflow: false
};

export const createDefaultEntitlementCache = (nowIso: () => string): EntitlementCache => {
  return {
    entitlementSet: DEFAULT_ENTITLEMENTS,
    lastVerifiedAt: nowIso()
  };
};

export const loadEntitlementCache = (nowIso: () => string): EntitlementCache => {
  if (typeof localStorage === 'undefined') {
    return createDefaultEntitlementCache(nowIso);
  }

  const raw = localStorage.getItem(ENTITLEMENT_CACHE_STORAGE_KEY);
  if (!raw) {
    return createDefaultEntitlementCache(nowIso);
  }

  try {
    const parsed = JSON.parse(raw) as EntitlementCache;
    return parsed;
  } catch {
    return createDefaultEntitlementCache(nowIso);
  }
};

export const saveEntitlementCache = (cache: EntitlementCache): void => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ENTITLEMENT_CACHE_STORAGE_KEY, JSON.stringify(cache));
  }
};

export const createTrialEntitlementCache = (
  current: EntitlementCache,
  nowIso: () => string
): EntitlementCache => {
  return {
    entitlementSet: {
      ...current.entitlementSet,
      profit: true
    },
    lastVerifiedAt: nowIso()
  };
};

export const createBundleEntitlementCache = (nowIso: () => string): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true
    },
    lastVerifiedAt: nowIso()
  };
};

export const createEntitlementCacheFromResponse = (
  response: Pick<EntitlementsResponse, 'entitlements' | 'lastVerifiedAt'>
): EntitlementCache => {
  return {
    entitlementSet: {
      bundle: response.entitlements.bundle,
      profit: response.entitlements.profit,
      breakeven: response.entitlements.breakeven,
      cashflow: response.entitlements.cashflow
    },
    lastVerifiedAt: response.lastVerifiedAt
  };
};
