import Decimal from 'decimal.js';

export type MinorUnits = number;

export interface RoundingRule {
  decimalPlaces: number;
  mode: Decimal.Rounding;
}

export interface NumericRoundingPolicy {
  moneyDisplay: RoundingRule;
  ratioDisplay: RoundingRule;
  quantityDisplay: RoundingRule;
}

export const ROUNDING_POLICY: NumericRoundingPolicy = Object.freeze({
  moneyDisplay: { decimalPlaces: 0, mode: Decimal.ROUND_HALF_UP },
  ratioDisplay: { decimalPlaces: 6, mode: Decimal.ROUND_HALF_UP },
  quantityDisplay: { decimalPlaces: 4, mode: Decimal.ROUND_HALF_UP }
});

export const toMinorUnits = (value: number, fieldName = 'value'): MinorUnits => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || !Number.isSafeInteger(value)) {
    throw new Error(`${fieldName} must be a safe integer in minor units.`);
  }

  return value;
};

export const assertNonNegativeMinorUnits = (value: MinorUnits, fieldName: string): MinorUnits => {
  const checked = toMinorUnits(value, fieldName);

  if (checked < 0) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }

  return checked;
};

export const assertNonNegativeInteger = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value) || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a safe integer greater than or equal to 0.`);
  }

  return value;
};

export const asDecimal = (value: Decimal.Value): Decimal => new Decimal(value);

export const roundWithRule = (value: Decimal.Value, rule: RoundingRule): Decimal => {
  return asDecimal(value).toDecimalPlaces(rule.decimalPlaces, rule.mode);
};

export const addMoney = (...values: MinorUnits[]): Decimal => {
  return values.reduce((accumulator, currentValue, index) => {
    toMinorUnits(currentValue, `values[${index}]`);
    return accumulator.plus(currentValue);
  }, new Decimal(0));
};

export const subtractMoney = (baseValue: MinorUnits, subtractValue: MinorUnits): Decimal => {
  toMinorUnits(baseValue, 'baseValue');
  toMinorUnits(subtractValue, 'subtractValue');
  return new Decimal(baseValue).minus(subtractValue);
};

export const multiplyMoneyByQuantity = (unitAmount: MinorUnits, quantity: Decimal.Value): Decimal => {
  toMinorUnits(unitAmount, 'unitAmount');
  return new Decimal(unitAmount).mul(quantity);
};

export const divideMoney = (numerator: MinorUnits, denominator: Decimal.Value): Decimal | null => {
  toMinorUnits(numerator, 'numerator');
  const denominatorDecimal = new Decimal(denominator);

  if (denominatorDecimal.eq(0)) {
    return null;
  }

  return new Decimal(numerator).div(denominatorDecimal);
};

export const parseMajorToMinorUnits = (value: string | number, minorDigits = 2): MinorUnits => {
  const multiplier = new Decimal(10).pow(minorDigits);
  const scaledValue = new Decimal(value).mul(multiplier);
  const rounded = scaledValue.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return toMinorUnits(rounded.toNumber(), 'parsedMinorUnits');
};

export const formatMinorUnitsToMajorString = (value: MinorUnits, minorDigits = 2): string => {
  toMinorUnits(value, 'value');
  const divisor = new Decimal(10).pow(minorDigits);
  return new Decimal(value).div(divisor).toFixed(minorDigits);
};

export const nonNegativeDecimal = (value: Decimal.Value, fieldName: string): Decimal => {
  const decimalValue = new Decimal(value);

  if (decimalValue.isNeg()) {
    throw new Error(`${fieldName} must be greater than or equal to 0.`);
  }

  return decimalValue;
};
