import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';
import type { AppRoutePath } from '../ui/pages/app-pages';

export type EmbedRoute = '/embed/profit' | '/embed/breakeven' | '/embed/cashflow';

export const stripTrailingSlash = (path: string): string => {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }

  return path;
};

export const isSupportedLanguage = (value: string): value is SupportedLanguage => {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
};

export const splitPath = (path: string): string[] => {
  return stripTrailingSlash(path).split('/').filter((segment) => segment.trim().length > 0);
};

export const parsePathWithOptionalLanguage = (path: string): {
  language: SupportedLanguage | null;
  normalizedPath: string;
} => {
  const normalizedInput = path && path.startsWith('/') ? path : '/';
  const segments = splitPath(normalizedInput);
  if (segments.length === 0) {
    return {
      language: null,
      normalizedPath: '/'
    };
  }

  const [first, ...rest] = segments;
  if (!isSupportedLanguage(first)) {
    return {
      language: null,
      normalizedPath: normalizedInput
    };
  }

  return {
    language: first,
    normalizedPath: rest.length > 0 ? `/${rest.join('/')}` : '/'
  };
};

export const getHashPathWithoutLanguageFromHash = (hash: string): string => {
  const hashPath = hash.replace('#', '').trim();
  if (!hashPath) {
    return '';
  }

  return parsePathWithOptionalLanguage(hashPath).normalizedPath;
};

export const getSharedToken = (pathnameWithoutLanguage: string, hashPathWithoutLanguage: string): string | null => {
  if (hashPathWithoutLanguage.startsWith('/s/')) {
    const token = hashPathWithoutLanguage.slice('/s/'.length).trim();
    return token ? decodeURIComponent(token) : null;
  }

  if (pathnameWithoutLanguage.startsWith('/s/')) {
    const token = pathnameWithoutLanguage.slice('/s/'.length).trim();
    return token ? decodeURIComponent(token) : null;
  }

  return null;
};

export const getEmbedRoute = (
  pathnameWithoutLanguage: string,
  hashPathWithoutLanguage: string
): {
  route: EmbedRoute;
  language: SupportedLanguage | null;
} | null => {
  const path = hashPathWithoutLanguage || pathnameWithoutLanguage;
  const segments = stripTrailingSlash(path).split('/').filter((segment) => segment.trim().length > 0);

  if (segments.length === 0 || segments[0] !== 'embed') {
    return null;
  }

  let language: SupportedLanguage | null = null;
  let calculatorSegment = segments[1] ?? '';

  if (segments.length >= 3 && isSupportedLanguage(segments[1])) {
    language = segments[1];
    calculatorSegment = segments[2] ?? '';
  }

  const normalizedCalculator = calculatorSegment === 'break-even' ? 'breakeven' : calculatorSegment;

  if (normalizedCalculator === 'profit') {
    return { route: '/embed/profit', language };
  }

  if (normalizedCalculator === 'breakeven') {
    return { route: '/embed/breakeven', language };
  }

  if (normalizedCalculator === 'cashflow') {
    return { route: '/embed/cashflow', language };
  }

  return null;
};

export const getRoute = (
  pathnameWithoutLanguage: string,
  hashPathWithoutLanguage: string,
  routes: readonly AppRoutePath[]
): AppRoutePath => {
  const hashRoute = hashPathWithoutLanguage as AppRoutePath;
  if (routes.includes(hashRoute)) {
    return hashRoute;
  }

  const path = pathnameWithoutLanguage as AppRoutePath;
  return routes.includes(path) ? path : '/login';
};
