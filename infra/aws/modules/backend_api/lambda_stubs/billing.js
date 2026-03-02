const { parseJsonBody, response } = require('./common');
const { getRecord, putRecord, toEntitlementRecord } = require('./billing-store');

const allowedPlatforms = new Set(['ios', 'android']);

const nowIso = () => new Date().toISOString();

const productToEntitlements = (productId, existing) => {
  const base = existing ?? {
    bundle: false,
    profit: true,
    breakeven: false,
    cashflow: false
  };

  if (productId === 'bundle_monthly') {
    return {
      bundle: true,
      profit: true,
      breakeven: true,
      cashflow: true
    };
  }

  if (productId === 'profit_monthly') {
    return {
      ...base,
      profit: true
    };
  }

  if (productId === 'breakeven_monthly') {
    return {
      ...base,
      breakeven: true
    };
  }

  if (productId === 'cashflow_monthly') {
    return {
      ...base,
      cashflow: true
    };
  }

  return base;
};

const verifyReceipt = ({ platform, receiptToken }) => {
  if (typeof receiptToken !== 'string' || receiptToken.length < 10) {
    return false;
  }

  const expectedPrefix = `${platform}:valid:`;
  return receiptToken.startsWith(expectedPrefix);
};

exports.handler = async (event) => {
  const body = parseJsonBody(event);

  const userId = typeof body.userId === 'string' && body.userId ? body.userId : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const productId = typeof body.productId === 'string' ? body.productId : '';
  const receiptToken = typeof body.receiptToken === 'string' ? body.receiptToken : '';

  if (!userId || !allowedPlatforms.has(platform) || !productId || !receiptToken) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'userId, platform, productId and receiptToken are required.'
    });
  }

  if (!verifyReceipt({ platform, receiptToken })) {
    return response(401, {
      code: 'RECEIPT_INVALID',
      message: 'Receipt verification failed.'
    });
  }

  const existing = await getRecord(userId);
  const entitlements = productToEntitlements(productId, existing?.entitlements);
  const verifiedAt = nowIso();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const record = toEntitlementRecord(userId, {
    lastVerifiedAt: verifiedAt,
    entitlements,
    trial: {
      active: false,
      expiresAt
    },
    subscriptions: [
      {
        platform,
        productId,
        status: 'active',
        verifiedAt,
        expiresAt
      }
    ]
  });

  await putRecord(record);

  return response(200, {
    verified: true,
    userId,
    lastVerifiedAt: verifiedAt,
    entitlements,
    subscription: {
      platform,
      productId,
      status: 'active',
      expiresAt
    }
  });
};