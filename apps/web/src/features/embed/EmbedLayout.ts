export interface EmbedOptions {
  theme: 'light' | 'dark';
  currencyCode: string;
  lang: string;
  poweredBy: boolean;
}

export const parseEmbedOptions = (search: string): EmbedOptions => {
  const params = new URLSearchParams(search);

  const themeParam = params.get('theme');
  const theme: 'light' | 'dark' = themeParam === 'dark' ? 'dark' : 'light';

  const currencyParam = (params.get('currency') ?? 'EUR').toUpperCase();
  const currencyCode = /^[A-Z]{3}$/.test(currencyParam) ? currencyParam : 'EUR';

  const lang = params.get('lang') ?? 'en';
  const poweredByParam = params.get('poweredBy');
  const poweredBy = poweredByParam === null ? true : poweredByParam !== '0';

  return {
    theme,
    currencyCode,
    lang,
    poweredBy
  };
};

export const createEmbedShell = (title: string, options: EmbedOptions): HTMLElement => {
  const shell = document.createElement('div');
  shell.className = 'page';
  shell.setAttribute('data-embed-theme', options.theme);

  const card = document.createElement('section');
  card.className = 'card';
  card.innerHTML = `<h2>${title}</h2><p>Stateless embed calculator. Computation runs locally.</p>`;

  shell.appendChild(card);
  return shell;
};

export const createPoweredByFooter = (options: EmbedOptions): HTMLElement | null => {
  if (!options.poweredBy) {
    return null;
  }

  const footer = document.createElement('div');
  footer.className = 'card';

  const link = document.createElement('a');
  link.href = '/login';
  link.textContent = 'Powered by MarginBase';

  footer.appendChild(link);
  return footer;
};
