/**
 * Vitest helpers for NO MANUAL unit and integration testing.
 * These provide reusable test utilities, matchers, and assertions.
 */

import Decimal from 'decimal.js';

/**
 * Assert that a value is a valid ISO 8601 datetime string
 */
export const expectValidIsoDateTime = (value: unknown): void => {
  if (typeof value !== 'string') {
    throw new Error(`Expected ISO datetime string, got ${typeof value}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO datetime: ${value}`);
  }

  if (!value.includes('T')) {
    throw new Error(`ISO datetime must include 'T' separator: ${value}`);
  }
};

/**
 * Assert that a value is in a valid Decimal range (non-negative, integer)
 */
export const expectValidMinorUnits = (value: unknown, fieldName = 'value'): void => {
  if (typeof value !== 'number') {
    throw new Error(`${fieldName}: expected number, got ${typeof value}`);
  }

  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName}: expected integer, got ${value}`);
  }

  if (value < 0) {
    throw new Error(`${fieldName}: expected non-negative, got ${value}`);
  }
};

/**
 * Assert that a value is a valid ratio (between 0 and 1, typically)
 */
export const expectValidRatio = (value: unknown, fieldName = 'value', min = 0, max = 1): void => {
  if (typeof value !== 'number') {
    throw new Error(`${fieldName}: expected number, got ${typeof value}`);
  }

  if (value < min || value > max) {
    throw new Error(`${fieldName}: expected value between ${min} and ${max}, got ${value}`);
  }
};

/**
 * Assert that two Decimal.js values are approximately equal (with tolerance)
 */
export const expectDecimalClose = (actual: unknown, expected: Decimal | number, tolerance = 0.01): void => {
  const actualDec = actual instanceof Decimal ? actual : new Decimal(String(actual));
  const expectedDec = expected instanceof Decimal ? expected : new Decimal(String(expected));

  const diff = actualDec.minus(expectedDec).abs();
  const toleranceDec = new Decimal(tolerance);

  if (diff.greaterThan(toleranceDec)) {
    throw new Error(`Expected ${expectedDec} ±${tolerance}, got ${actualDec} (diff: ${diff})`);
  }
};

/**
 * Assert structure of common domain objects
 */
export const expectValidScenarioId = (value: unknown): void => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Expected non-empty scenario ID string, got: ${value}`);
  }
};

export const expectValidModuleId = (value: unknown): void => {
  const validModules = ['profit', 'breakeven', 'cashflow'];
  if (!validModules.includes(String(value))) {
    throw new Error(`Expected one of ${validModules.join(', ')}, got: ${value}`);
  }
};

export const expectValidEntitlementSet = (value: unknown): void => {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected object, got ${typeof value}`);
  }

  const obj = value as Record<string, unknown>;
  const expectedKeys = ['bundle', 'profit', 'breakeven', 'cashflow'];

  for (const key of expectedKeys) {
    if (typeof obj[key] !== 'boolean') {
      throw new Error(`EntitlementSet.${key}: expected boolean, got ${typeof obj[key]}`);
    }
  }
};

/**
 * Helper to assert no forbidden keys in serialized object
 */
export const expectNoForbiddenKeys = (
  obj: Record<string, unknown>,
  forbiddenKeys: string[],
  path = '$'
): void => {
  const serialized = JSON.stringify(obj).toLowerCase();
  const found: string[] = [];

  for (const forbidden of forbiddenKeys) {
    if (serialized.includes(forbidden.toLowerCase())) {
      found.push(forbidden);
    }
  }

  if (found.length > 0) {
    throw new Error(`Found forbidden keys at ${path}: ${found.join(', ')}`);
  }
};

/**
 * Helper to deeply compare two objects (shallow equality check)
 */
export const expectObjectShapeMatch = (actual: Record<string, unknown>, expected: Record<string, unknown>, path = '$'): void => {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();

  if (actualKeys.length !== expectedKeys.length || !actualKeys.every((k, i) => k === expectedKeys[i])) {
    throw new Error(`${path}: key mismatch. Expected: ${expectedKeys.join(', ')}, Got: ${actualKeys.join(', ')}`);
  }
};

/**
 * Helper for testing mutation patterns (before/after comparison)
 */
export interface MutationTestCase<T> {
  before: T;
  after: T;
  changedFields: (keyof T)[];
}

export const expectMutationFields = <T extends Record<string, unknown>>(
  testCase: MutationTestCase<T>,
  relaxAllowList: (keyof T)[] = []
): void => {
  const expectedChanged = new Set(testCase.changedFields);
  const allowRelax = new Set(relaxAllowList);
  const actualChanged: (keyof T)[] = [];

  for (const key in testCase.before) {
    if (testCase.before[key] !== testCase.after[key]) {
      actualChanged.push(key);
    }
  }

  const actualChangedSet = new Set(actualChanged);

  // Check that expected changes occurred
  for (const field of expectedChanged) {
    if (!actualChangedSet.has(field) && !allowRelax.has(field)) {
      throw new Error(`Expected field '${String(field)}' to change, but it didn't.`);
    }
  }

  // Check that no unexpected changes occurred
  for (const field of actualChanged) {
    if (!expectedChanged.has(field) && !allowRelax.has(field)) {
      throw new Error(`Unexpected mutation in field '${String(field)}'.`);
    }
  }
};
