import { getCurrentLanguage, setCurrentLanguage, translate } from './I18nProvider';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';

export interface UseLangResult {
  language: SupportedLanguage;
  supportedLanguages: readonly SupportedLanguage[];
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  t: typeof translate;
}

export const useLang = (): UseLangResult => {
  return {
    language: getCurrentLanguage(),
    supportedLanguages: SUPPORTED_LANGUAGES,
    setLanguage: setCurrentLanguage,
    t: translate
  };
};
