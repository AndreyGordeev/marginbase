import deCommon from './locales/de/common.json';
import enCommon from './locales/en/common.json';
import esCommon from './locales/es/common.json';
import frCommon from './locales/fr/common.json';
import itCommon from './locales/it/common.json';
import plCommon from './locales/pl/common.json';
import ruCommon from './locales/ru/common.json';

export const SUPPORTED_LANGUAGES = ['en', 'de', 'fr', 'es', 'pl', 'it', 'ru'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const i18nResources = {
  en: { common: enCommon },
  de: { common: deCommon },
  fr: { common: frCommon },
  es: { common: esCommon },
  pl: { common: plCommon },
  it: { common: itCommon },
  ru: { common: ruCommon }
} as const;
