#!/usr/bin/env tsx
/**
 * Quality Report Generator
 * Generates a comprehensive quality report for the project
 */

import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { resolve } from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
  duration?: number;
}

const checks: CheckResult[] = [];

function addCheck(name: string, passed: boolean, details?: string, duration?: number) {
  checks.push({ name, passed, details, duration });
}

function runCommand(command: string, silent = false): { success: boolean; output: string; duration: number } {
  const start = Date.now();
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    const duration = Date.now() - start;
    return { success: true, output, duration };
  } catch (error) {
    const duration = Date.now() - start;
    return { success: false, output: error instanceof Error ? error.message : 'Unknown error', duration };
  }
}

function getFileSize(path: string): number {
  try {
    const stats = statSync(path);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

console.log('🔍 MarginBase Quality Report\n');
console.log('═'.repeat(60));
console.log('\n📋 Running quality checks...\n');

// 1. ESLint
console.log('  → ESLint...');
const lint = runCommand('corepack pnpm run lint', true);
addCheck('ESLint', lint.success, lint.output, lint.duration);

// 2. TypeScript
console.log('  → TypeScript type checking...');
const typecheck = runCommand('corepack pnpm run typecheck', true);
addCheck('TypeScript', typecheck.success, typecheck.output, typecheck.duration);

// 3. i18n parity
console.log('  → i18n key parity...');
const i18n = runCommand('corepack pnpm run i18n:parity', true);
addCheck('i18n Parity', i18n.success, i18n.output, i18n.duration);

// 4. Console.log check
console.log('  → Console.log detection...');
const consoleLogs = runCommand('corepack pnpm run check:console-logs', true);
addCheck('Console.log Check', consoleLogs.success, consoleLogs.output, consoleLogs.duration);

// 5. Unit/Integration tests
console.log('  → Unit & integration tests...');
const tests = runCommand('corepack pnpm run test', true);
addCheck('Unit/Integration Tests', tests.success, tests.output, tests.duration);

// 6. Coverage
console.log('  → Coverage gates...');
const coverage = runCommand('corepack pnpm run test:coverage', true);
addCheck('Coverage Gates', coverage.success, coverage.output, coverage.duration);

// 7. Bundle size check
console.log('  → Bundle size...');
const bundleExists = existsSync(resolve(process.cwd(), 'apps/web/dist'));
if (bundleExists) {
  const bundlePath = resolve(process.cwd(), 'apps/web/dist');
  const bundleSize = getFileSize(bundlePath);
  const underLimit = bundleSize < 10 * 1024 * 1024; // 10MB
  addCheck('Bundle Size', underLimit, `${formatBytes(bundleSize)} / 10 MB`);
} else {
  addCheck('Bundle Size', false, 'Build artifacts not found (run: pnpm --filter @marginbase/web build)');
}

// 8. Security audit
console.log('  → Security audit...');
const audit = runCommand('corepack pnpm audit --audit-level moderate', true);
addCheck('Security Audit', audit.success, audit.output, audit.duration);

console.log('\n' + '═'.repeat(60));
console.log('\n📊 Quality Report Summary\n');

// Print results
const passed = checks.filter(c => c.passed).length;
const total = checks.length;

checks.forEach(check => {
  const icon = check.passed ? '✅' : '❌';
  const duration = check.duration ? ` (${(check.duration / 1000).toFixed(2)}s)` : '';
  console.log(`${icon} ${check.name}${duration}`);
  if (!check.passed && check.details) {
    console.log(`   ${check.details.split('\n')[0]}`);
  }
  if (check.passed && check.details && check.name === 'Bundle Size') {
    console.log(`   ${check.details}`);
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\n📈 Score: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)\n`);

// Exit with error if any check failed
if (passed < total) {
  console.log('❌ Quality checks failed. Please fix issues before committing.\n');
  process.exit(1);
} else {
  console.log('✅ All quality checks passed! Ready to commit.\n');
  process.exit(0);
}
