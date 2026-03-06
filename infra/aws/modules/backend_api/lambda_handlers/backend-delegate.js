const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let backendModulePromise;

const resolveCandidateSpecifiers = () => {
  const stagedBackendDist = path.resolve(
    __dirname,
    'node_modules/@marginbase/backend-server/dist/index.js',
  );
  const workspaceBackendDist = path.resolve(
    __dirname,
    '../../../../../packages/backend-server/dist/index.js',
  );

  const candidates = ['@marginbase/backend-server'];

  if (fs.existsSync(stagedBackendDist)) {
    candidates.push(pathToFileURL(stagedBackendDist).href);
  }

  if (fs.existsSync(workspaceBackendDist)) {
    candidates.push(pathToFileURL(workspaceBackendDist).href);
  }

  return candidates;
};

const loadBackendModule = async () => {
  if (globalThis.__backendServerModule) {
    return globalThis.__backendServerModule;
  }

  if (!backendModulePromise) {
    backendModulePromise = (async () => {
      const candidates = resolveCandidateSpecifiers();
      let lastError;

      for (const candidate of candidates) {
        try {
          return await import(candidate);
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError;
    })();
  }

  return backendModulePromise;
};

const errorResponse = (statusCode, message) => {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ error: message }),
  };
};

const delegateToBackend = async (exportName, event, context) => {
  try {
    const backendModule = await loadBackendModule();
    const backendHandler = backendModule?.[exportName];

    if (typeof backendHandler !== 'function') {
      return errorResponse(
        500,
        `Missing backend export: ${exportName}. Ensure @marginbase/backend-server is packaged for Lambda runtime.`,
      );
    }

    return await backendHandler(event, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backend loading error';
    return errorResponse(500, `Unable to load backend-server module: ${message}`);
  }
};

module.exports = {
  delegateToBackend,
};
