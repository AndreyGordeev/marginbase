export interface ApiClientConfig {
  baseUrl: string;
}

export interface AuthVerifyRequest {
  googleIdToken: string;
}

export interface AuthVerifyResponse {
  userId: string;
  email: string | null;
  emailVerified: boolean;
  provider: 'google';
  verifiedAt: string;
}

export interface EntitlementSet {
  bundle: boolean;
  profit: boolean;
  breakeven: boolean;
  cashflow: boolean;
}

export type EntitlementStatus = 'active' | 'trialing' | 'past_due' | 'canceled';

export type EntitlementSource = 'stripe' | 'app_store' | 'google_play' | 'unknown';

export interface EntitlementsResponse {
  userId: string;
  lastVerifiedAt: string;
  entitlements: EntitlementSet;
  status: EntitlementStatus;
  source: EntitlementSource;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  trial: {
    active: boolean;
    expiresAt: string;
  };
}

export interface TelemetryEvent {
  name: string;
  timestamp: string;
  attributes?: Record<string, unknown>;
}

export interface TelemetryBatchRequest {
  userId: string;
  events: TelemetryEvent[];
}

export interface TelemetryBatchResponse {
  accepted: boolean;
  count: number;
  objectKey: string;
}

export type PurchasePlatform = 'ios' | 'android';

export interface BillingVerifyRequest {
  userId: string;
  platform: PurchasePlatform;
  productId: string;
  receiptToken: string;
}

export interface BillingVerifyResponse {
  verified: boolean;
  userId: string;
  lastVerifiedAt: string;
  entitlements: EntitlementSet;
  subscription: {
    platform: PurchasePlatform;
    productId: string;
    status: 'active' | 'expired';
    expiresAt: string;
  };
}

export type BillingPlanId = 'profit' | 'breakeven' | 'cashflow' | 'bundle';

export interface BillingCheckoutSessionRequest {
  planId: BillingPlanId;
  userId: string;
  email: string;
}

export interface BillingCheckoutSessionResponse {
  checkoutUrl: string;
}

export interface AccountDeleteRequest {
  userId: string;
}

export interface AccountDeleteResponse {
  deleted: boolean;
  userId: string;
  deletedEntitlements: boolean;
  deletedUserProfile: boolean;
}

export interface ShareSnapshotV1 {
  schemaVersion: 1;
  module: 'profit' | 'breakeven' | 'cashflow';
  inputData: Record<string, unknown>;
  currencyCode?: string;
}

export interface EncryptedShareSnapshotV1 {
  schemaVersion: 1;
  algorithm: 'A256GCM';
  ivBase64Url: string;
  ciphertextBase64Url: string;
}

export interface ShareCreateRequest {
  encryptedSnapshot: EncryptedShareSnapshotV1;
  expiresInDays?: 7 | 30;
  ownerUserId?: string;
}

export interface ShareCreateResponse {
  token: string;
  expiresAt: string;
}

export interface ShareGetResponse {
  encryptedSnapshot?: EncryptedShareSnapshotV1;
  snapshot?: ShareSnapshotV1;
}

export interface ShareDeleteResponse {
  revoked: boolean;
  token: string;
}

export interface ShareListItem {
  token: string;
  module: 'profit' | 'breakeven' | 'cashflow';
  createdAt: string;
  expiresAt: string;
}

export interface ShareListResponse {
  items: ShareListItem[];
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export class ApiClientError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const buildHeaders = (idToken?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };

  if (idToken) {
    headers.authorization = `Bearer ${idToken}`;
  }

  return headers;
};

const parseJson = async <T>(response: Response): Promise<T> => {
  const parsed = (await response.json()) as T | ApiErrorBody;

  if (!response.ok) {
    const errorBody = parsed as ApiErrorBody;
    throw new ApiClientError(response.status, errorBody.code ?? 'UNKNOWN_ERROR', errorBody.message ?? 'API request failed.');
  }

  return parsed as T;
};

export class MarginbaseApiClient {
  private readonly baseUrl: string;

  public constructor(config: ApiClientConfig) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
  }

  public async verifyAuthToken(request: AuthVerifyRequest): Promise<AuthVerifyResponse> {
    const response = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: buildHeaders(request.googleIdToken),
      body: JSON.stringify(request)
    });

    return parseJson<AuthVerifyResponse>(response);
  }

  public async refreshEntitlements(idToken: string): Promise<EntitlementsResponse> {
    const response = await fetch(`${this.baseUrl}/entitlements`, {
      method: 'GET',
      headers: buildHeaders(idToken)
    });

    return parseJson<EntitlementsResponse>(response);
  }

  public async sendTelemetryBatch(request: TelemetryBatchRequest): Promise<TelemetryBatchResponse> {
    const response = await fetch(`${this.baseUrl}/telemetry/batch`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(request)
    });

    return parseJson<TelemetryBatchResponse>(response);
  }

  public async verifyBillingPurchase(request: BillingVerifyRequest): Promise<BillingVerifyResponse> {
    const response = await fetch(`${this.baseUrl}/billing/verify`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(request)
    });

    return parseJson<BillingVerifyResponse>(response);
  }

  public async createCheckoutSession(request: BillingCheckoutSessionRequest): Promise<BillingCheckoutSessionResponse> {
    const response = await fetch(`${this.baseUrl}/billing/checkout/session`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(request)
    });

    return parseJson<BillingCheckoutSessionResponse>(response);
  }

  public async deleteAccount(request: AccountDeleteRequest): Promise<AccountDeleteResponse> {
    const response = await fetch(`${this.baseUrl}/account/delete`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(request)
    });

    return parseJson<AccountDeleteResponse>(response);
  }

  public async createShareSnapshot(request: ShareCreateRequest): Promise<ShareCreateResponse> {
    const response = await fetch(`${this.baseUrl}/share/create`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(request)
    });

    return parseJson<ShareCreateResponse>(response);
  }

  public async getShareSnapshot(token: string): Promise<ShareGetResponse> {
    const response = await fetch(`${this.baseUrl}/share/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: buildHeaders()
    });

    return parseJson<ShareGetResponse>(response);
  }

  public async deleteShareSnapshot(token: string, idToken?: string): Promise<ShareDeleteResponse> {
    const response = await fetch(`${this.baseUrl}/share/${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: buildHeaders(idToken)
    });

    return parseJson<ShareDeleteResponse>(response);
  }

  public async listShareSnapshots(ownerUserId: string): Promise<ShareListResponse> {
    const response = await fetch(`${this.baseUrl}/share/list?userId=${encodeURIComponent(ownerUserId)}`, {
      method: 'GET',
      headers: buildHeaders()
    });

    return parseJson<ShareListResponse>(response);
  }
}
