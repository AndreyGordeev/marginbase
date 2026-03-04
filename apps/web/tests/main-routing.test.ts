import { describe, expect, it } from 'vitest';
import type { AppRoutePath } from '../src/ui/pages/app-pages';
import {
  getEmbedRoute,
  getHashPathWithoutLanguageFromHash,
  getRoute,
  getSharedToken,
  parsePathWithOptionalLanguage,
  stripTrailingSlash
} from '../src/routes/route-utils';

const ROUTES: AppRoutePath[] = [
  '/',
  '/login',
  '/gate',
  '/dashboard',
  '/profit',
  '/break-even',
  '/cashflow',
  '/subscription',
  '/data',
  '/settings',
  '/terms',
  '/privacy',
  '/legal',
  '/cancellation',
  '/refund',
  '/cookies',
  '/legal-center',
  '/legal/privacy',
  '/legal/terms'
];

describe('main routing utilities', () => {
  it('normalizes trailing slash and optional language prefix', () => {
    expect(stripTrailingSlash('/de/profit/')).toBe('/de/profit');
    expect(parsePathWithOptionalLanguage('/de/profit')).toEqual({
      language: 'de',
      normalizedPath: '/profit'
    });
    expect(parsePathWithOptionalLanguage('/profit')).toEqual({
      language: null,
      normalizedPath: '/profit'
    });
  });

  it('extracts hash path without language', () => {
    expect(getHashPathWithoutLanguageFromHash('#/fr/cashflow')).toBe('/cashflow');
    expect(getHashPathWithoutLanguageFromHash('')).toBe('');
  });

  it('resolves shared token from hash first, then pathname', () => {
    expect(getSharedToken('/s/pathToken', '/s/hashToken')).toBe('hashToken');
    expect(getSharedToken('/s/pathToken', '')).toBe('pathToken');
    expect(getSharedToken('/dashboard', '')).toBeNull();
  });

  it('detects embed routes with and without language', () => {
    expect(getEmbedRoute('/embed/profit', '')).toEqual({
      route: '/embed/profit',
      language: null
    });

    expect(getEmbedRoute('/embed/de/break-even', '')).toEqual({
      route: '/embed/breakeven',
      language: 'de'
    });

    expect(getEmbedRoute('/dashboard', '')).toBeNull();
  });

  it('prefers hash route and falls back to login when unsupported', () => {
    expect(getRoute('/dashboard', '/profit', ROUTES)).toBe('/profit');
    expect(getRoute('/unknown', '', ROUTES)).toBe('/login');
  });
});
