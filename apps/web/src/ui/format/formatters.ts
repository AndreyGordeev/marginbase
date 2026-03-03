const toFiniteNumber = (value: string | number): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveCurrencyFractionDigits = (currency: string): number => {
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol'
  });

  return formatter.resolvedOptions().maximumFractionDigits ?? 2;
};

export const formatMoneyFromMinor = (minor: string | number, currency: string): string => {
  const numeric = toFiniteNumber(minor);
  if (numeric === null) {
    return '—';
  }

  const fractionDigits = resolveCurrencyFractionDigits(currency);
  const major = numeric / 10 ** fractionDigits;

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(major);
};

export const formatPct = (value: string | number, decimals = 2): string => {
  const numeric = toFiniteNumber(value);
  if (numeric === null) {
    return '—';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.max(0, decimals)
  }).format(numeric);
};

export const formatSignedMoneyFromMinor = (minor: string | number, currency: string): string => {
  const numeric = toFiniteNumber(minor);
  if (numeric === null) {
    return '—';
  }

  const formatted = formatMoneyFromMinor(numeric, currency);
  if (numeric > 0) {
    return `+${formatted}`;
  }

  return formatted;
};
