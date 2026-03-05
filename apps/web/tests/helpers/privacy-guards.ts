/**
 * Privacy Guards Helpers
 *
 * Validates that financial data never leaves the device.
 * Enforces Hard Gate #1: Privacy First 🔒
 *
 * Forbidden Keys: revenue, cost, profit, margin, cashflow, price, units,
 * fixedCost, variableCostPerUnit, scenario, inputs, assumptions, data
 */

// Keys that must NEVER appear in telemetry, API requests, or logs
export const FORBIDDEN_KEYS = [
  'revenue',
  'cost',
  'profit',
  'margin',
  'cashflow',
  'price',
  'units',
  'fixedCost',
  'variableCostPerUnit',
  'scenario',
  'inputs',
  'assumptions',
  'data',
];

// Keys that should NOT contain financial values
// (may appear in schema but must be empty/safe)
export const SENSITIVE_NUMERIC_KEYS = [
  'amount',
  'value',
  'total',
  'sum',
  'balance',
  'rate',
];

/**
 * Check if an object contains any forbidden keys
 * Returns: { allowed: true } or { allowed: false, violations: [...] }
 */
export function validatePayloadForForbiddenKeys(payload: unknown): {
  allowed: boolean;
  violations?: string[];
} {
  const violations: string[] = [];

  function traverse(obj: unknown, path: string = ''): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean')
      return;

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;

        // Check if key is forbidden
        if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
          violations.push(fullPath);
        }

        // Recurse
        traverse(value, fullPath);
      }
    }
  }

  traverse(payload);

  return {
    allowed: violations.length === 0,
    violations: violations.length > 0 ? violations : undefined,
  };
}

/**
 * Check if payload contains any suspicious numeric-like strings
 * that could leak financial data via encoding/obfuscation
 *
 * Returns: { safe: true } or { safe: false, suspicions: [...] }
 */
export function validatePayloadForSuspiciousNumerics(payload: unknown): {
  safe: boolean;
  suspicions?: string[];
} {
  const suspicions: string[] = [];

  // Pattern for large numbers that might be financial data
  const largeNumberPattern = /^\d{4,}(\.\d+)?$/;
  const percentagePattern = /^\d+(\.\d+)?%$/;
  const currencyPattern = /^\$?[\d,]+(\.\d+)?$/;

  function traverse(obj: unknown, path: string = ''): void {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'string') {
      if (
        largeNumberPattern.test(obj) ||
        percentagePattern.test(obj) ||
        currencyPattern.test(obj)
      ) {
        suspicions.push(`${path}: "${obj}" (matches financial pattern)`);
      }
      return;
    }

    if (typeof obj === 'number') {
      // Numbers > 100 in telemetry are suspicious (unless they're IDs or counts)
      if (obj > 100 && obj < 1000000) {
        suspicions.push(`${path}: ${obj} (suspicious numeric value)`);
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
      return;
    }

    if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        traverse(value, fullPath);
      }
    }
  }

  traverse(payload);

  return {
    safe: suspicions.length === 0,
    suspicions: suspicions.length > 0 ? suspicions : undefined,
  };
}

/**
 * Extract all leaf values from payload that should be checked
 * Useful for detailed inspection
 */
export function extractPayloadLeafValues(payload: unknown): Map<string, unknown> {
  const leaves = new Map<string, unknown>();

  function traverse(obj: unknown, path: string = ''): void {
    if (obj === null || obj === undefined) return;

    if (
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean'
    ) {
      leaves.set(path, obj);
      return;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        leaves.set(path, obj);
        return;
      }
      obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
      return;
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        leaves.set(path, obj);
        return;
      }
      for (const [key, value] of entries) {
        const fullPath = path ? `${path}.${key}` : key;
        traverse(value, fullPath);
      }
    }
  }

  traverse(payload);
  return leaves;
}

/**
 * Assertion helper for Playwright tests
 * Throws if payload violates privacy constraints
 */
export function assertPayloadPrivacy(payload: unknown, context?: string): void {
  const { allowed, violations } = validatePayloadForForbiddenKeys(payload);

  if (!allowed) {
    const msg = context ? `${context}: ` : '';
    throw new Error(
      `${msg}PRIVACY VIOLATION - Forbidden keys detected: ${violations?.join(', ')}\n` +
        `Payload: ${JSON.stringify(payload, null, 2)}`,
    );
  }
}

/**
 * Assertion helper: Check that numeric values don't look like financial data
 */
export function assertNoSuspiciousNumerics(payload: unknown, context?: string): void {
  const { safe, suspicions } = validatePayloadForSuspiciousNumerics(payload);

  if (!safe) {
    const msg = context ? `${context}: ` : '';
    console.warn(
      `${msg}SUSPICIOUS NUMERICS - Possible data leak:\n${suspicions?.join('\n')}`,
    );
    // Don't throw - these are warnings, not hard violations
  }
}
