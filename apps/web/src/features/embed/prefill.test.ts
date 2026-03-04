import { describe, expect, it } from 'vitest';
import { decodePrefill, encodePrefill, getPrefillFromSearch } from './prefill';

describe('embed prefill', () => {
  it('encodes and decodes payload roundtrip', () => {
    const encoded = encodePrefill({
      module: 'profit',
      inputData: {
        unitPriceMinor: 1000,
        quantity: 10
      }
    });

    const decoded = decodePrefill(encoded);

    expect(decoded).toEqual({
      module: 'profit',
      inputData: {
        unitPriceMinor: 1000,
        quantity: 10
      }
    });
  });

  it('returns null for invalid payload', () => {
    expect(decodePrefill('invalid')).toBeNull();
  });

  it('extracts prefill from query string', () => {
    const encoded = encodePrefill({
      module: 'cashflow',
      inputData: {
        forecastMonths: 12
      }
    });

    const parsed = getPrefillFromSearch(`?prefill=${encodeURIComponent(encoded)}`);
    expect(parsed?.module).toBe('cashflow');
    expect(parsed?.inputData.forecastMonths).toBe(12);
  });
});
