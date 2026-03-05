#!/usr/bin/env node

/**
 * i18n Key Parity Checker
 *
 * Validates that all locale files contain the same set of keys as the canonical English locale.
 * Fails CI if:
 * - Any locale is missing keys from English (canonical)
 * - Any locale has extra keys not in English (unless allowlisted)
 *
 * Usage:
 *   node scripts/i18n-key-parity.ts
 *   pnpm run i18n:parity
 */

import fs from 'fs';
import path from 'path';

const LOCALES_DIR = path.join(process.cwd(), 'apps/web/src/i18n/locales');
const CANONICAL_LOCALE = 'en';
const STRICT_MODE = true; // Fail on extra keys

interface LocaleFileMap {
  locale: string;
  path: string;
  keys: Set<string>;
  raw: Record<string, unknown>;
}

const flattenKeys = (obj: Record<string, unknown>, prefix = ''): Set<string> => {
  const keys = new Set<string>();

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively flatten nested objects
      const nestedKeys = flattenKeys(value as Record<string, unknown>, fullKey);
      nestedKeys.forEach((k) => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }

  return keys;
};

const loadLocaleFile = (locale: string): LocaleFileMap => {
  const filePath = path.join(LOCALES_DIR, locale, 'common.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const raw = JSON.parse(content) as Record<string, unknown>;
  const keys = flattenKeys(raw);

  return { locale, path: filePath, keys, raw };
};

const getAllLocales = (): string[] => {
  const items = fs.readdirSync(LOCALES_DIR);
  return items.filter((item) => fs.statSync(path.join(LOCALES_DIR, item)).isDirectory());
};

const main = () => {
  const locales = getAllLocales();

  if (!locales.includes(CANONICAL_LOCALE)) {
    console.error(`❌ Canonical locale '${CANONICAL_LOCALE}' not found in ${LOCALES_DIR}`);
    process.exit(1);
  }

  const canonicalFile = loadLocaleFile(CANONICAL_LOCALE);
  const otherLocales = locales.filter((l) => l !== CANONICAL_LOCALE).map(loadLocaleFile);

  console.log(`\n📝 i18n Key Parity Check`);
  console.log(`Canonical: ${CANONICAL_LOCALE} (${canonicalFile.keys.size} keys)`);
  console.log(`Checking: ${otherLocales.map((l) => l.locale).join(', ')}\n`);

  let hasErrors = false;

  for (const locale of otherLocales) {
    const missing = Array.from(canonicalFile.keys).filter((k) => !locale.keys.has(k));
    const extra = Array.from(locale.keys).filter((k) => !canonicalFile.keys.has(k));

    if (missing.length > 0) {
      console.error(`❌ ${locale.locale}: Missing ${missing.length} keys:`);
      missing.slice(0, 10).forEach((k) => console.error(`   - ${k}`));
      if (missing.length > 10) {
        console.error(`   ... and ${missing.length - 10} more`);
      }
      hasErrors = true;
    }

    if (extra.length > 0 && STRICT_MODE) {
      console.error(`❌ ${locale.locale}: Extra ${extra.length} keys (strict mode enabled):`);
      extra.slice(0, 10).forEach((k) => console.error(`   + ${k}`));
      if (extra.length > 10) {
        console.error(`   ... and ${extra.length - 10} more`);
      }
      hasErrors = true;
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✅ ${locale.locale}: OK (${locale.keys.size} keys)`);
    } else if (missing.length === 0 && extra.length > 0 && !STRICT_MODE) {
      console.log(`⚠️  ${locale.locale}: OK (${extra.length} extra keys, warnings only)`);
    }
  }

  if (hasErrors) {
    console.error(`\n❌ i18n Key Parity Check FAILED`);
    process.exit(1);
  } else {
    console.log(`\n✅ i18n Key Parity Check PASSED`);
    process.exit(0);
  }
};

main();
