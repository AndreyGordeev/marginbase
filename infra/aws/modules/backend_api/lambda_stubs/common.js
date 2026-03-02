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

exports.parseJsonBody = parseJsonBody;
exports.response = response;
exports.getBearerToken = getBearerToken;
exports.ensureString = ensureString;