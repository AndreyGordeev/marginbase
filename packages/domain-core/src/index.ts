export type MinorUnits = number;

export const toMinorUnits = (value: number): MinorUnits => {
  if (!Number.isInteger(value)) {
    throw new Error('Minor units must be integer values.');
  }

  return value;
};
