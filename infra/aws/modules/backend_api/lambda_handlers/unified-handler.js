/**
 * Unified Lambda handler for all backend routes
 *
 * This handler uses the real Express app from @marginbase/backend-server
 * and adapts Lambda HTTP API v2 events to the Express framework.
 */

const {
  createExpressRequest,
  createExpressResponse,
  formatLambdaResponse,
} = require('./express-adapter');

let createBackendServer;
let expressApp;
let backendAvailable = false;

// Attempt to load the real backend
try {
  const backendModule = require('@marginbase/backend-server');
  createBackendServer = backendModule.createBackendServer;
  backendAvailable = !!createBackendServer;
  if (backendAvailable) {
    console.log('✓ Real @marginbase/backend-server loaded');
  }
} catch (error) {
  console.warn('[FALLBACK] Backend-server not available:', error.message);
}

/**
 * Initialize the Express app (call once on cold start)
 */
const initializeApp = async () => {
  if (expressApp) {
    return expressApp;
  }

  if (!createBackendServer) {
    throw new Error(
      'Backend server not available. Ensure @marginbase/backend-server is installed.',
    );
  }

  console.log('Initializing Express app...');
  expressApp = await createBackendServer();
  console.log('Express app initialized');
  return expressApp;
};

/**
 * Convert Lambda HTTP API v2 event to http.request format
 * and process through Express app
 */
const invokeExpressApp = async (expressApp, lambdaEvent) => {
  return new Promise((resolve, reject) => {
    // Create Mock request object
    const req = createExpressRequest(lambdaEvent);

    // Create express response that we can intercept
    const res = {
      statusCode: 200,
      headers: {},
      body: '',

      status(code) {
        this.statusCode = code;
        return this;
      },

      json(data) {
        this.headers['content-type'] = 'application/json';
        this.body = JSON.stringify(data);
        return this;
      },

      send(data) {
        if (typeof data === 'object') {
          return this.json(data);
        }
        this.body = String(data);
        return this;
      },

      set(field, value) {
        this.headers[field.toLowerCase()] = value;
        return this;
      },

      get(field) {
        return this.headers[field.toLowerCase()];
      },

      end() {
        resolve(this);
      },
    };

    // Set up error handling
    const onError = (error) => {
      console.error('Express app error:', error);
      reject(error);
    };

    res.on = (event, callback) => {
      if (event === 'error') {
        res._errorHandler = callback;
      }
    };

    // Call Express app with simulated request/response
    try {
      // Express app is initialized but we need to call it as a request handler
      // The app.__call__ or test invocation might differ per Express version
      // Let's use the standard http.request test invocation pattern
      expressApp._router.handle(req, res);
    } catch (error) {
      onError(error);
    }

    // Set a timeout in case response is never sent
    setTimeout(() => {
      if (!res.body && res.statusCode === 200) {
        console.warn('Express handler timed out, no response generated');
        resolve(res);
      }
    }, 25000); // Lambda timeout is typically 30s
  });
};

/**
 * Main Lambda handler
 * Routes all requests through the real Express app
 */
exports.handler = async (event, context) => {
  console.log(`[Lambda] ${event.requestContext?.http?.method} ${event.rawPath}`);

  try {
    // Initialize Express app on first invocation (cold start)
    const app = await initializeApp();

    // Process through Express
    const expressResponse = await invokeExpressApp(app, event);

    // Convert Express response back to Lambda format
    return {
      statusCode: expressResponse.statusCode || 200,
      headers: expressResponse.headers || { 'content-type': 'application/json' },
      body: expressResponse.body || '',
    };
  } catch (error) {
    console.error('[Lambda] Unhandled error:', error);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
