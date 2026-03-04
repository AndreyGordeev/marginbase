const jsonHeaders = {
  'content-type': 'application/json'
};

const parseJsonBody = (event) => {
  if (!event || !event.body) {
    return {};
  }

  if (typeof event.body === 'object') {
    return event.body;
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const response = (statusCode, body) => {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body)
  };
};

const getBearerToken = (event) => {
  const authHeader = event?.headers?.authorization ?? event?.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const parsedBody = parseJsonBody(event);
  if (typeof parsedBody.googleIdToken === 'string') {
    return parsedBody.googleIdToken.trim();
  }

  return '';
};

const ensureString = (value, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

const resolveRequesterUserId = (event) => {
  const jwtSub = event?.requestContext?.authorizer?.jwt?.claims?.sub;
  if (typeof jwtSub === 'string' && jwtSub.length > 0) {
    return jwtSub;
  }

  const lambdaClaimsSub = event?.requestContext?.authorizer?.claims?.sub;
  if (typeof lambdaClaimsSub === 'string' && lambdaClaimsSub.length > 0) {
    return lambdaClaimsSub;
  }

  const headerUserId = event?.headers?.['x-user-id']
    ?? event?.headers?.['X-User-Id']
    ?? event?.headers?.['x-marginbase-user-id']
    ?? event?.headers?.['X-Marginbase-User-Id'];

  if (typeof headerUserId === 'string' && headerUserId.length > 0) {
    return headerUserId;
  }

  const queryUserId = event?.queryStringParameters?.userId;
  if (typeof queryUserId === 'string' && queryUserId.length > 0) {
    return queryUserId;
  }

  const body = parseJsonBody(event);
  if (typeof body.userId === 'string' && body.userId.length > 0) {
    return body.userId;
  }

  return '';
};

exports.parseJsonBody = parseJsonBody;
exports.response = response;
exports.getBearerToken = getBearerToken;
exports.ensureString = ensureString;
exports.resolveRequesterUserId = resolveRequesterUserId;