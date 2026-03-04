export const PRIVACY_FORBIDDEN_NETWORK_KEYS = [
  'revenue',
  'cost',
  'costs',
  'price',
  'amount',
  'profit',
  'margin',
  'cash',
  'balance',
  'forecast',
  'salary',
  'rent',
  'invoice',
  'tax',
  'vat',
  'eur',
  'usd',
  'pln'
] as const;

const containsForbiddenToken = (value: string): boolean => {
  const lowered = value.toLowerCase();
  return PRIVACY_FORBIDDEN_NETWORK_KEYS.some((token) => lowered.includes(token));
};

export const findForbiddenKeyPaths = (value: unknown, basePath = ''): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => findForbiddenKeyPaths(entry, `${basePath}[${index}]`));
  }

  if (typeof value !== 'object') {
    return [];
  }

  const objectValue = value as Record<string, unknown>;
  const paths: string[] = [];

  for (const [key, entry] of Object.entries(objectValue)) {
    const currentPath = basePath ? `${basePath}.${key}` : key;

    if (containsForbiddenToken(key)) {
      paths.push(currentPath);
    }

    paths.push(...findForbiddenKeyPaths(entry, currentPath));
  }

  return paths;
};
