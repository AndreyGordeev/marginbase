import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Locale = 'en' | 'de' | 'fr' | 'es' | 'pl' | 'it' | 'ru';

const LOCALES: Locale[] = ['en', 'de', 'fr', 'es', 'pl', 'it', 'ru'];

const loadLocale = (locale: Locale): Record<string, string> => {
  const filePath = join(__dirname, '..', 'src', 'i18n', 'locales', locale, 'common.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, string>;
};

describe('i18n parity', () => {
  it('keeps all locale common.json files aligned to English keys', () => {
    const en = loadLocale('en');
    const enKeys = Object.keys(en).sort();

    for (const locale of LOCALES) {
      if (locale === 'en') {
        continue;
      }

      const current = loadLocale(locale);
      const currentKeys = Object.keys(current).sort();

      const missing = enKeys.filter((key) => !currentKeys.includes(key));
      const extra = currentKeys.filter((key) => !enKeys.includes(key));

      expect(
        { missing, extra },
        `Locale ${locale} must match en keys exactly. Missing: ${missing.join(', ') || 'none'}; Extra: ${extra.join(', ') || 'none'}`
      ).toEqual({ missing: [], extra: [] });
    }
  });
});
