import { setCurrentLanguage } from './I18nProvider';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources';
import { useLang } from './useLang';

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  pl: 'Polski',
  it: 'Italiano',
  ru: 'Русский'
};

const updateUrlLanguage = (language: SupportedLanguage): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('lang', language);
  window.location.href = url.toString();
};

export const createLanguageSwitcher = (className = 'lang-switcher'): HTMLElement => {
  const lang = useLang();

  const container = document.createElement('label');
  container.className = className;

  const label = document.createElement('span');
  label.textContent = `${lang.t('lang.label')}: `;

  const select = document.createElement('select');
  select.name = 'language';

  for (const language of SUPPORTED_LANGUAGES) {
    const option = document.createElement('option');
    option.value = language;
    option.textContent = LANGUAGE_LABELS[language];
    option.selected = language === lang.language;
    select.appendChild(option);
  }

  select.onchange = () => {
    const selected = select.value as SupportedLanguage;
    void setCurrentLanguage(selected).then(() => {
      updateUrlLanguage(selected);
    });
  };

  container.appendChild(label);
  container.appendChild(select);

  return container;
};
