import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { i18nResources, SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

const normalizeLanguage = (value: string | undefined | null): SupportedLanguage => {
  if (!value) {
    return FALLBACK_LANGUAGE;
  }

  const base = value.toLowerCase().split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(base) ? base : FALLBACK_LANGUAGE;
};

export const initializeI18nProvider = async (): Promise<void> => {
  if (i18next.isInitialized) {
    return;
  }

  await i18next
    .use(LanguageDetector)
    .init({
      resources: i18nResources,
      fallbackLng: FALLBACK_LANGUAGE,
      supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
      ns: ['common'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false
      },
      detection: {
        order: ['querystring', 'navigator', 'htmlTag'],
        lookupQuerystring: 'lang',
        caches: []
      }
    });

  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalizeLanguage(i18next.language);
  }

  i18next.on('languageChanged', (lng) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = normalizeLanguage(lng);
    }
  });
};

export const translate = (key: string, options?: Record<string, unknown>): string => {
  return i18next.t(key, options);
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return normalizeLanguage(i18next.language);
};

export const setCurrentLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18next.changeLanguage(language);
};
