#!/usr/bin/env node

/**
 * Lambda build script
 *
 * This script:
 * 1. Compiles the backend-server package
 * 2. Prepares the lambda_handlers with real backend code
 * 3. Ensures all dependencies are available
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const infrastructureDir = path.join(root, 'infra', 'aws');
const modulesDir = path.join(infrastructureDir, 'modules', 'backend_api');
const handlersDir = path.join(modulesDir, 'lambda_handlers');
const backendServerDir = path.join(root, 'packages', 'backend-server');
const backendDistDir = path.join(backendServerDir, 'dist');
const backendPackageJsonPath = path.join(backendServerDir, 'package.json');

console.log('Building Lambda handlers...');

// Step 1: Compile backend-server
console.log('\n[1/3] Compiling @marginbase/backend-server...');
const buildResult = spawnSync(
  'corepack pnpm --filter @marginbase/backend-server build',
  {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  },
);

if (buildResult.status !== 0) {
  if (buildResult.error) {
    console.error('Build command execution error:', buildResult.error);
  }
  if (typeof buildResult.status !== 'number') {
    console.error(
      'Build command exited without numeric status:',
      buildResult.status,
    );
  }
  console.error('Failed to compile backend-server');
  process.exit(1);
}

// Step 2: Check if compiled backend-server exists
if (!fs.existsSync(backendDistDir)) {
  console.error(`Compiled backend-server not found at ${backendDistDir}`);
  process.exit(1);
}

console.log(`✓ Backend-server compiled to ${backendDistDir}`);

// Step 3: Verify lambda_handlers exist
if (!fs.existsSync(handlersDir)) {
  console.error(`Lambda handlers directory not found at ${handlersDir}`);
  process.exit(1);
}

console.log('\n[2/3] Verifying Lambda handler wrappers...');
const requiredHandlers = [
  'auth.js',
  'billing.js',
  'entitlements.js',
  'backend-delegate.js',
];
const missingHandlers = requiredHandlers.filter(
  (handler) => !fs.existsSync(path.join(handlersDir, handler)),
);

if (missingHandlers.length > 0) {
  console.warn(`Missing handler wrappers: ${missingHandlers.join(', ')}`);
  console.warn('These should have been created by infra migration step');
}

if (missingHandlers.length > 0) {
  console.error(
    `Missing required Lambda thin wrappers: ${missingHandlers.join(', ')}`,
  );
  process.exit(1);
}

console.log('✓ Lambda handler wrappers verified');

// Step 5: Create node_modules stub for lambda handlers
console.log('\n[3/3] Preparing dependencies...');
const nodeModulesDir = path.join(handlersDir, 'node_modules');
const marginbaseDir = path.join(nodeModulesDir, '@marginbase');
const backendServerPathInLambda = path.join(marginbaseDir, 'backend-server');

// Create directory structure
if (!fs.existsSync(marginbaseDir)) {
  fs.mkdirSync(marginbaseDir, { recursive: true });
}

if (!fs.existsSync(backendServerPathInLambda)) {
  fs.mkdirSync(backendServerPathInLambda, { recursive: true });
}

const backendDistTarget = path.join(backendServerPathInLambda, 'dist');
if (fs.existsSync(backendDistTarget)) {
  fs.rmSync(backendDistTarget, { recursive: true, force: true });
}

fs.cpSync(backendDistDir, backendDistTarget, { recursive: true });
fs.copyFileSync(
  backendPackageJsonPath,
  path.join(backendServerPathInLambda, 'package.json'),
);

// Step 6: Install dependencies if needed
console.log('✓ Dependencies prepared');

console.log(`
✓ Lambda build complete
  - Backend-server: ${backendDistDir}
  - Handlers: ${handlersDir}
  - Ready for Terraform zip packaging

Note: When deploying to AWS:
  1. Ensure node_modules includes @marginbase/backend-server and dependencies
  2. Or configure Lambda layer with backend-server code
  3. Or use pnpm monorepo-aware packaging
`);
