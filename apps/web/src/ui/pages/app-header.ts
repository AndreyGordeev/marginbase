import { createLanguageSwitcher, translate } from '../../i18n';

export const renderAppHeader = (): HTMLElement => {
  const header = document.createElement('header');
  header.className = 'app-header';

  const logo = document.createElement('div');
  logo.className = 'app-logo';
  logo.textContent = translate('appName');

  const controls = document.createElement('div');
  controls.className = 'app-header-controls';
  controls.appendChild(createLanguageSwitcher());

  header.appendChild(logo);
  header.appendChild(controls);

  return header;
};
