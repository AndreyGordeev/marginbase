import { describe, expect, it } from 'vitest';
import {
  ENTITLEMENT_POLICY,
  canAccessDashboard,
  canExport,
  canUseModule,
  isWithinOfflineGrace,
  shouldRefreshEntitlements
} from '../src';

describe('entitlements local policy', () => {
  const now = new Date('2026-03-02T12:00:00.000Z');

  it('treats fresh entitlement cache as within grace', () => {
    const lastVerifiedAt = '2026-03-01T13:00:00.000Z';

    expect(isWithinOfflineGrace(lastVerifiedAt, now)).toBe(true);
  });

  it('allows boundary at exactly 72h and blocks after 72h', () => {
    const boundary = '2026-02-27T12:00:00.000Z';
    const stale = '2026-02-27T11:59:59.000Z';

    expect(isWithinOfflineGrace(boundary, now, ENTITLEMENT_POLICY.offlineGraceHours)).toBe(true);
    expect(isWithinOfflineGrace(stale, now, ENTITLEMENT_POLICY.offlineGraceHours)).toBe(false);
  });

  it('refreshes at startup and then debounces for 24h', () => {
    expect(shouldRefreshEntitlements(null, now)).toBe(true);
    expect(shouldRefreshEntitlements('2026-03-02T00:30:00.000Z', now)).toBe(false);
    expect(shouldRefreshEntitlements('2026-03-01T12:00:00.000Z', now)).toBe(true);
  });

  it('canUseModule respects entitlement flag and freshness', () => {
    const freshCache = {
      entitlementSet: { bundle: false, profit: true, breakeven: false, cashflow: false },
      lastVerifiedAt: '2026-03-02T11:00:00.000Z'
    };

    const staleCache = {
      entitlementSet: { bundle: false, profit: true, breakeven: false, cashflow: false },
      lastVerifiedAt: '2026-02-26T11:00:00.000Z'
    };

    expect(canUseModule('profit', freshCache, now)).toBe(true);
    expect(canUseModule('breakeven', freshCache, now)).toBe(false);
    expect(canUseModule('profit', staleCache, now)).toBe(false);
  });

  it('bundle entitlement unlocks all modules while within grace', () => {
    const bundleCache = {
      entitlementSet: { bundle: true, profit: false, breakeven: false, cashflow: false },
      lastVerifiedAt: '2026-03-02T11:00:00.000Z'
    };

    expect(canUseModule('profit', bundleCache, now)).toBe(true);
    expect(canUseModule('breakeven', bundleCache, now)).toBe(true);
    expect(canUseModule('cashflow', bundleCache, now)).toBe(true);
  });

  it('keeps export and dashboard available even when stale', () => {
    expect(canExport()).toBe(true);
    expect(canAccessDashboard()).toBe(true);
  });
});
