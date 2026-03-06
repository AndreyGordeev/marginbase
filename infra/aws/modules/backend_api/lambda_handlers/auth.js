const { getBearerToken, response } = require('./common');
const { putUserProfile } = require('./billing-store');

const DEFAULT_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

const isTrustedIssuer = (issuer) => {
  return issuer === 'accounts.google.com' || issuer === 'https://accounts.google.com';
};

const verifyWithGoogleTokenInfo = async (idToken) => {
  const tokenInfoUrl = process.env.GOOGLE_TOKENINFO_URL ?? DEFAULT_TOKENINFO_URL;
  const requestUrl = `${tokenInfoUrl}?id_token=${encodeURIComponent(idToken)}`;

  const verificationResponse = await fetch(requestUrl, {
    method: 'GET'
  });

  if (!verificationResponse.ok) {
    return null;
  }

  return verificationResponse.json();
};

exports.handler = async (event) => {
  const idToken = getBearerToken(event);

  if (!idToken) {
    return response(400, {
      code: 'INVALID_REQUEST',
      message: 'Google ID token is required.'
    });
  }

  try {
    const tokenInfo = await verifyWithGoogleTokenInfo(idToken);
    const audience = tokenInfo?.aud;
    const issuer = tokenInfo?.iss;
    const subject = tokenInfo?.sub;

    if (!tokenInfo || !subject || !audience || !isTrustedIssuer(issuer)) {
      return response(401, {
        code: 'UNAUTHORIZED',
        message: 'Google token verification failed.'
      });
    }

    const allowedAudiences = (process.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (allowedAudiences.length > 0 && !allowedAudiences.includes(audience)) {
      return response(401, {
        code: 'UNAUTHORIZED',
        message: 'Google token audience is not allowed.'
      });
    }

    await putUserProfile({
      userId: subject,
      email: tokenInfo.email ?? null,
      emailVerified: tokenInfo.email_verified === 'true',
      provider: 'google',
      updatedAt: new Date().toISOString()
    });

    return response(200, {
      userId: subject,
      email: tokenInfo.email ?? null,
      emailVerified: tokenInfo.email_verified === 'true',
      provider: 'google',
      verifiedAt: new Date().toISOString()
    });
  } catch {
    return response(502, {
      code: 'UPSTREAM_ERROR',
      message: 'Unable to verify token with Google.'
    });
  }
};