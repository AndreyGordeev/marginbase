/**
 * Factory for creating i18n test states and language configurations.
 * Use these to test language switching, missing translation keys, and locale selection.
 */

export type SupportedLocale = 'en' | 'pl' | 'de' | 'ru';

export interface LanguageState {
  currentLocale: SupportedLocale;
  fallbackLocale: SupportedLocale;
}

/**
 * All supported locales by the app
 */
export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'pl', 'de', 'ru'];

/**
 * Create a language state for a given locale
 */
export const languageStateFactory = (locale: SupportedLocale = 'en'): LanguageState => {
  return {
    currentLocale: locale,
    fallbackLocale: 'en'
  };
};

/**
 * Create test states for all supported locales
 */
export const allLanguageStatesFactory = (): LanguageState[] => {
  return SUPPORTED_LOCALES.map((locale) => languageStateFactory(locale));
};

/**
 * List of locales that should be tested in critical E2E paths (breadth coverage)
 */
export const primaryTestLocalesFactory = (): SupportedLocale[] => {
  return ['en', 'pl', 'ru']; // canonical English + EU primary + EU secondary
};

/**
 * Helper to generate viewport preferences for different locales
 * (e.g., RTL detection if we support Arabic in future)
 */
export interface LocaleViewportConfig {
  locale: SupportedLocale;
  viewport: { width: number; height: number };
  isRTL: boolean;
}

export const localeViewportFactory = (locale: SupportedLocale = 'en'): LocaleViewportConfig => {
  const viewport = { width: 1365, height: 768 };
  // Placeholder for future RTL support (if Arabic is added)
  const isRTL = false;

  return {
    locale,
    viewport,
    isRTL
  };
};
