import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeIndex = args.indexOf('--mode');
const mode = modeIndex >= 0 ? args[modeIndex + 1] : 'lint';

const root = process.cwd();

const requiredPaths = [
  'main.tf',
  'variables.tf',
  'outputs.tf',
  'locals.tf',
  'modules/data/main.tf',
  'modules/web_hosting/main.tf',
  'modules/backend_api/main.tf',
  'modules/backend_api/lambda_stubs/auth.js',
  'modules/backend_api/lambda_stubs/entitlements.js',
  'modules/backend_api/lambda_stubs/telemetry.js'
];

const missing = requiredPaths.filter((relativePath) => !existsSync(join(root, relativePath)));

if (missing.length > 0) {
  console.error(`[infra:${mode}] missing required files:`);
  for (const filePath of missing) {
    console.error(` - ${filePath}`);
  }
  process.exit(1);
}

const variablesText = readFileSync(join(root, 'variables.tf'), 'utf-8');
if (!variablesText.includes('startswith(var.aws_region, "eu-")')) {
  console.error(`[infra:${mode}] EU region guard is missing in variables.tf`);
  process.exit(1);
}

const hasTerraform = (() => {
  const probe = spawnSync('terraform', ['version'], { stdio: 'ignore' });
  return probe.status === 0;
})();

if (!hasTerraform) {
  console.log(`[infra:${mode}] terraform CLI not found; structural checks passed.`);
  process.exit(0);
}

if (mode === 'lint') {
  const fmt = spawnSync('terraform', ['fmt', '-check', '-recursive'], { stdio: 'inherit' });
  process.exit(fmt.status ?? 1);
}

if (mode === 'typecheck') {
  const init = spawnSync('terraform', ['init', '-backend=false', '-input=false'], { stdio: 'inherit' });
  if ((init.status ?? 1) !== 0) {
    process.exit(init.status ?? 1);
  }

  const validate = spawnSync('terraform', ['validate'], { stdio: 'inherit' });
  process.exit(validate.status ?? 1);
}

console.log(`[infra:${mode}] structural checks passed.`);