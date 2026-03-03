export interface EntitlementSet {
  bundle: boolean;
  profit: boolean;
  breakeven: boolean;
  cashflow: boolean;
}

export type EntitlementStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export type EntitlementSource = 'stripe' | 'app_store' | 'google_play' | 'unknown';

export type ModuleId = 'profit' | 'breakeven' | 'cashflow';

export interface EntitlementCache {
  entitlementSet: EntitlementSet;
  lastVerifiedAt: string;
  status?: EntitlementStatus;
  source?: EntitlementSource;
  currentPeriodEnd?: string;
  trialEnd?: string;
}

export interface EntitlementPolicyConfig {
  offlineGraceHours: number;
  refreshDebounceHours: number;
}

export const ENTITLEMENT_POLICY: EntitlementPolicyConfig = Object.freeze({
  offlineGraceHours: 72,
  refreshDebounceHours: 24
});

const parseIso = (iso: string): Date | null => {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const elapsedHours = (start: Date, end: Date): number => {
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

export const isWithinOfflineGrace = (
  lastVerifiedAt: string,
  now = new Date(),
  graceHours = ENTITLEMENT_POLICY.offlineGraceHours
): boolean => {
  const verifiedAt = parseIso(lastVerifiedAt);

  if (!verifiedAt) {
    return false;
  }

  const hours = elapsedHours(verifiedAt, now);

  if (hours < 0) {
    return false;
  }

  return hours <= graceHours;
};

export const shouldRefreshEntitlements = (
  lastRefreshAt: string | null,
  now = new Date(),
  refreshDebounceHours = ENTITLEMENT_POLICY.refreshDebounceHours
): boolean => {
  if (!lastRefreshAt) {
    return true;
  }

  const refreshedAt = parseIso(lastRefreshAt);

  if (!refreshedAt) {
    return true;
  }

  const hours = elapsedHours(refreshedAt, now);

  if (hours < 0) {
    return true;
  }

  return hours >= refreshDebounceHours;
};

const hasModuleEntitlement = (set: EntitlementSet, moduleId: ModuleId): boolean => {
  if (set.bundle) {
    return true;
  }

  return set[moduleId];
};

export const canUseModule = (moduleId: ModuleId, cache: EntitlementCache, now = new Date()): boolean => {
  if (!hasModuleEntitlement(cache.entitlementSet, moduleId)) {
    return false;
  }

  return isWithinOfflineGrace(cache.lastVerifiedAt, now);
};

export const canExport = (): boolean => {
  return true;
};

export const canAccessDashboard = (): boolean => {
  return true;
};
