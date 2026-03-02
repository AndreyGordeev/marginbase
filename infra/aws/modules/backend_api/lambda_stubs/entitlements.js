const { parseJsonBody, response } = require('./common');

const parseBoolean = (value, fallback) => {
  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  return fallback;
};

const resolveUserId = (event) => {
  const fromAuthorizer = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (typeof fromAuthorizer === 'string' && fromAuthorizer.length > 0) {
    return fromAuthorizer;
  }

  const fromQuery = event?.queryStringParameters?.userId;
  if (typeof fromQuery === 'string' && fromQuery.length > 0) {
    return fromQuery;
  }

  const body = parseJsonBody(event);
  if (typeof body.userId === 'string' && body.userId.length > 0) {
    return body.userId;
  }

  return 'anonymous';
};

exports.handler = async (event) => {
  const userId = resolveUserId(event);

  const bundle = parseBoolean(process.env.ENTITLEMENT_BUNDLE, false);
  const profit = parseBoolean(process.env.ENTITLEMENT_PROFIT, true);
  const breakeven = parseBoolean(process.env.ENTITLEMENT_BREAKEVEN, bundle);
  const cashflow = parseBoolean(process.env.ENTITLEMENT_CASHFLOW, bundle);

  const trialActive = parseBoolean(process.env.TRIAL_ACTIVE, true);
  const trialDays = Number(process.env.TRIAL_DAYS ?? 14);
  const expiresAt = new Date(Date.now() + Math.max(0, trialDays) * 24 * 60 * 60 * 1000).toISOString();

  return response(200, {
    userId,
    lastVerifiedAt: new Date().toISOString(),
    entitlements: {
      bundle,
      profit,
      breakeven,
      cashflow
    },
    trial: {
      active: trialActive,
      expiresAt
    }
  });
};