#!/usr/bin/env tsx
/**
 * Check for console.log statements in production code (not tests, scripts, or main entry points)
 */
import { execSync, type ExecException } from 'node:child_process';

try {
  const result = execSync(
    'git grep -n "console\\.log" -- "*.ts" "*.tsx" ":!*.test.ts" ":!*.test.tsx" ":!**/tests/**" ":!scripts/**" ":!**/main.ts"',
    { encoding: 'utf-8', stdio: 'pipe' }
  );

  if (result.trim()) {
    console.error('❌ Found console.log in production code:');
    console.error(result);
    console.error('\nNote: console.log is allowed in main.ts entry points and scripts/');
    process.exit(1);
  }
} catch (error: unknown) {
  // Exit code 1 from git grep means no matches found (which is good!)
  const execError = error as ExecException & { stdout?: string };
  if (execError.status === 1 && !execError.stdout) {
    console.log('✅ No console.log found in production code');
    process.exit(0);
  }

  // Any other error is a real problem
  console.error('Error checking for console.log:', execError.message);
  process.exit(1);
}
