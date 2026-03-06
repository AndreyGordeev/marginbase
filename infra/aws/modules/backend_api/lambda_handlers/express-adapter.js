/**
 * Express-to-Lambda event adapter
 * Converts AWS Lambda HTTP API v2 events to Express-like request/response objects
 */

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

const getLowercaseHeaders = (headers) => {
  const lowercased = {};
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      lowercased[key.toLowerCase()] = value;
    }
  }
  return lowercased;
};

/**
 * Convert Lambda HTTP API v2 event to Express-like request object
 */
const createExpressRequest = (event) => {
  const headers = getLowercaseHeaders(event.headers || {});
  const bodyParams = parseJsonBody(event);

  return {
    method: event.requestContext?.http?.method || 'GET',
    path: event.rawPath || event.requestContext?.http?.path || '/',
    query: event.queryStringParameters || {},
    params: event.pathParameters || {},
    headers,
    body: bodyParams,
    rawBody: event.body,
    get(field) {
      return this.headers[field.toLowerCase()];
    },
  };
};

/**
 * Create Express-like response object that collects status/headers/body
 */
const createExpressResponse = () => {
  let statusCode = 200;
  const headers = {
    'content-type': 'application/json',
  };
  let body = null;

  return {
    statusCode,
    headers,
    statusCode,
    status(code) {
      statusCode = code;
      this.statusCode = code;
      return this;
    },
    json(data) {
      body = JSON.stringify(data);
      return this;
    },
    set(header, value) {
      headers[header] = value;
      return this;
    },
    getStatusCode() {
      return statusCode;
    },
    getHeaders() {
      return headers;
    },
    getBody() {
      return body || '';
    },
  };
};

/**
 * Convert Express response back to Lambda format
 */
const formatLambdaResponse = (expressResponse) => {
  return {
    statusCode: expressResponse.getStatusCode(),
    headers: expressResponse.getHeaders(),
    body: expressResponse.getBody(),
  };
};

module.exports = {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
  parseJsonBody,
  getLowercaseHeaders,
};
