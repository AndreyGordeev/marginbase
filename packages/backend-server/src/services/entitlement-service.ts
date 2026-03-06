import type {
  EntitlementsResponse,
  BillingVerifyResponse,
  EntitlementSource,
  PurchasePlatform,
} from '@marginbase/api-client';

/**
 * Map PurchasePlatform to EntitlementSource
 */
function platformToSource(platform: PurchasePlatform): EntitlementSource {
  return platform === 'ios' ? 'app_store' : 'google_play';
}

export interface UserEntitlements {
  userId: string;
  bundle: boolean;
  profit: boolean;
  breakeven: boolean;
  cashflow: boolean;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  source: EntitlementSource;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  trialStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt: string;
}

/**
 * EntitlementService - manages user access to features
 */
export class EntitlementService {
  private entitlements = new Map<string, UserEntitlements>();

  /**
   * Get or create user entitlements
   */
  getOrCreateEntitlements(userId: string): UserEntitlements {
    if (this.entitlements.has(userId)) {
      return this.entitlements.get(userId)!;
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day free trial

    const newEntitlements: UserEntitlements = {
      userId,
      bundle: false,
      profit: true, // Always available
      breakeven: false,
      cashflow: false,
      status: 'trialing',
      source: 'unknown',
      currentPeriodEnd: null,
      trialEnd: trialEnd.toISOString(),
      trialStartedAt: this.now(),
      createdAt: this.now(),
      updatedAt: this.now(),
      lastVerifiedAt: this.now(),
    };

    this.entitlements.set(userId, newEntitlements);
    return newEntitlements;
  }

  /**
   * Update entitlements based on billing status
   */
  applyBillingStatus(
    userId: string,
    status: 'active' | 'trialing' | 'past_due' | 'canceled',
    source: UserEntitlements['source'],
    periodEnd: string | null,
  ): UserEntitlements {
    const existing = this.getOrCreateEntitlements(userId);

    const updated: UserEntitlements = {
      ...existing,
      status,
      source,
      currentPeriodEnd: periodEnd,
      trialEnd: status === 'trialing' ? periodEnd : null,
      updatedAt: this.now(),
      lastVerifiedAt: this.now(),
    };

    // Update module access based on status
    if (status === 'active' || status === 'trialing' || status === 'past_due') {
      updated.bundle = true;
      updated.profit = true;
      updated.breakeven = true;
      updated.cashflow = true;
    } else if (status === 'canceled') {
      updated.bundle = false;
      updated.profit = true; // Always available
      updated.breakeven = false;
      updated.cashflow = false;
    }

    this.entitlements.set(userId, updated);
    return updated;
  }

  /**
   * Check and expire trials
   */
  updateTrialStatus(userId: string): UserEntitlements {
    const userEntitlements = this.getOrCreateEntitlements(userId);

    if (userEntitlements.status === 'trialing' && userEntitlements.trialEnd) {
      if (new Date(userEntitlements.trialEnd) < new Date()) {
        userEntitlements.status = 'canceled';
        userEntitlements.bundle = false;
        userEntitlements.profit = true;
        userEntitlements.breakeven = false;
        userEntitlements.cashflow = false;
      }
    }

    userEntitlements.lastVerifiedAt = this.now();
    this.entitlements.set(userId, userEntitlements);
    return userEntitlements;
  }

  /**
   * Format entitlements as API response
   */
  toEntitlementsResponse(userId: string): EntitlementsResponse {
    const userEntitlements = this.updateTrialStatus(userId);

    return {
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
        expiresAt: userEntitlements.trialEnd || this.now(),
      },
    };
  }

  /**
   * Format mobile purchase verification response
   */
  toBillingVerifyResponse(
    userId: string,
    platform: PurchasePlatform,
    productId: string,
  ): BillingVerifyResponse {
    const userEntitlements = this.applyBillingStatus(
      userId,
      'active',
      platformToSource(platform),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    );

    return {
      verified: true,
      userId,
      lastVerifiedAt: userEntitlements.lastVerifiedAt,
      entitlements: {
        bundle: userEntitlements.bundle,
        profit: userEntitlements.profit,
        breakeven: userEntitlements.breakeven,
        cashflow: userEntitlements.cashflow,
      },
      subscription: {
        platform,
        productId,
        status: 'active',
        expiresAt: userEntitlements.currentPeriodEnd!,
      },
    };
  }

  /**
   * Delete user entitlements
   */
  deleteEntitlements(userId: string): boolean {
    return this.entitlements.delete(userId);
  }

  private now(): string {
    return new Date().toISOString();
  }
}
