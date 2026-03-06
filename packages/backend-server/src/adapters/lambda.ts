import type { Request, Response } from 'express';
import {
  handleAuthVerify,
  handleBillingVerify,
  handleCheckoutCreate,
  handleEntitlementsGet,
  handlePortalCreate,
  handleWebhook,
} from '../index.js';
import { getBackendRuntime } from '../runtime.js';

interface LambdaHttpEvent {
  body?: string | Record<string, unknown> | null;
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  requestContext?: {
    routeKey?: string;
    http?: {
      method?: string;
      path?: string;
    };
    authorizer?: {
      jwt?: {
        claims?: {
          sub?: string;
        };
      };
    };
  };
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const parseBody = (event: LambdaHttpEvent): Record<string, unknown> => {
  if (!event.body) {
    return {};
  }

  if (typeof event.body === 'object') {
    return event.body;
  }

  try {
    return JSON.parse(event.body) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const lowercaseHeaders = (
  headers: Record<string, string | undefined> | undefined,
): Record<string, string> => {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    }
  }

  return normalized;
};

const getRouteKey = (event: LambdaHttpEvent): string => {
  if (event.requestContext?.routeKey) {
    return event.requestContext.routeKey;
  }

  const method = event.requestContext?.http?.method ?? 'GET';
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '/';
  return `${method.toUpperCase()} ${path}`;
};

const toRequest = (
  event: LambdaHttpEvent,
  overrides?: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  },
): Request => {
  const headers = lowercaseHeaders(event.headers);
  const body = overrides?.body ?? parseBody(event);
  const rawBody =
    typeof event.body === 'string' ? event.body : JSON.stringify(body);

  // Extract Bearer token from Authorization header (same logic as bearerTokenMiddleware)
  const authHeader = headers['authorization'];
  const idToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : undefined;

  const request = {
    method: event.requestContext?.http?.method ?? 'GET',
    path: event.rawPath ?? event.requestContext?.http?.path ?? '/',
    headers,
    query: event.queryStringParameters ?? {},
    params: overrides?.params ?? event.pathParameters ?? {},
    body,
    rawBody,
    idToken,
    get(name: string): string | undefined {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;

  return request;
};

const toResponse = (): Response & {
  _statusCode: number;
  _headers: Record<string, string>;
  _body: string;
} => {
  let statusCode = 200;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  let body = '';

  const response = {
    get _statusCode() {
      return statusCode;
    },
    get _headers() {
      return headers;
    },
    get _body() {
      return body;
    },
    status(code: number) {
      statusCode = code;
      return this;
    },
    set(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return this;
    },
    json(payload: unknown) {
      body = JSON.stringify(payload);
      return this;
    },
    send(payload: unknown) {
      if (typeof payload === 'string') {
        body = payload;
      } else {
        body = JSON.stringify(payload);
      }
      return this;
    },
  } as unknown as Response & {
    _statusCode: number;
    _headers: Record<string, string>;
    _body: string;
  };

  return response;
};

const invoke = async (
  expressHandler: (req: Request, res: Response) => unknown | Promise<unknown>,
  event: LambdaHttpEvent,
  requestOverrides?: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  },
): Promise<LambdaResponse> => {
  const request = toRequest(event, requestOverrides);
  const response = toResponse();

  await expressHandler(request, response);

  return {
    statusCode: response._statusCode,
    headers: response._headers,
    body: response._body,
  };
};

const resolveUserIdForEntitlements = (event: LambdaHttpEvent): string => {
  const fromPath = event.pathParameters?.userId;
  if (typeof fromPath === 'string' && fromPath.length > 0) {
    return fromPath;
  }

  const fromQuery = event.queryStringParameters?.userId;
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return fromQuery;
  }

  const fromAuth = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (typeof fromAuth === 'string' && fromAuth.length > 0) {
    return fromAuth;
  }

  const fromBody = parseBody(event).userId;
  if (typeof fromBody === 'string' && fromBody.length > 0) {
    return fromBody;
  }

  return 'anonymous';
};

export const handleAuthLambdaEvent = async (
  event: LambdaHttpEvent,
): Promise<LambdaResponse> => {
  const { authService } = await getBackendRuntime();
  return invoke(handleAuthVerify(authService), event);
};

export const handleEntitlementsLambdaEvent = async (
  event: LambdaHttpEvent,
): Promise<LambdaResponse> => {
  const { entitlementService } = await getBackendRuntime();
  const userId = resolveUserIdForEntitlements(event);

  return invoke(handleEntitlementsGet(entitlementService), event, {
    params: { userId },
  });
};

const resolveBillingEntitlementsUserId = (
  event: LambdaHttpEvent,
): string | null => {
  const path = event.rawPath ?? event.requestContext?.http?.path ?? '';
  const match = path.match(/^\/billing\/entitlements\/([^/]+)$/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  return null;
};

export const handleBillingLambdaEvent = async (
  event: LambdaHttpEvent,
): Promise<LambdaResponse> => {
  const { billingService, entitlementService } = await getBackendRuntime();

  const routeKey = getRouteKey(event);

  if (
    routeKey === 'POST /billing/checkout/session' ||
    routeKey === 'POST /billing/checkout-session'
  ) {
    return invoke(handleCheckoutCreate(billingService), event);
  }

  if (
    routeKey === 'POST /billing/portal-session' ||
    routeKey === 'POST /billing/portal/session'
  ) {
    return invoke(handlePortalCreate(billingService), event);
  }

  if (
    routeKey === 'POST /billing/webhook/stripe' ||
    routeKey === 'POST /billing/webhook'
  ) {
    return invoke(handleWebhook(billingService, entitlementService), event);
  }

  if (routeKey === 'POST /billing/verify') {
    return invoke(
      handleBillingVerify(billingService, entitlementService),
      event,
    );
  }

  if (routeKey.startsWith('GET /billing/entitlements/')) {
    const userId = resolveBillingEntitlementsUserId(event);
    if (!userId) {
      return {
        statusCode: 400,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Missing userId in entitlements path' }),
      };
    }

    return invoke(handleEntitlementsGet(entitlementService), event, {
      params: { userId },
    });
  }

  return {
    statusCode: 404,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ error: 'Route not found' }),
  };
};
