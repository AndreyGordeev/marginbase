import { translate } from '../../i18n';

export type LegalRoute = '/terms' | '/privacy' | '/legal' | '/cancellation' | '/refund' | '/cookies';

export type LegalBackTarget = '/login' | '/' | '/legal-center';

type LegalNavigationRoute = LegalRoute | LegalBackTarget;

export const setLegalBackTarget = (target: LegalBackTarget): void => {
  window.sessionStorage.setItem('legal-back-target', target);
};

export const resolveLegalBackTarget = (): LegalBackTarget => {
  const value = window.sessionStorage.getItem('legal-back-target');
  window.sessionStorage.removeItem('legal-back-target');
  if (value === '/login') {
    return '/login';
  }

  if (value === '/legal-center') {
    return '/legal-center';
  }

  return '/';
};

export const renderMarkdownSafe = (markdown: string): HTMLElement => {
  const article = document.createElement('article');
  article.className = 'legal-markdown';

  let list: HTMLUListElement | null = null;
  const lines = markdown.split('\n');

  const closeList = (): void => {
    if (list) {
      article.appendChild(list);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line === '---' || line === '------------------------------------------------------------------------') {
      closeList();
      article.appendChild(document.createElement('hr'));
      continue;
    }

    if (line.startsWith('- ')) {
      if (!list) {
        list = document.createElement('ul');
      }
      const li = document.createElement('li');
      li.textContent = line.slice(2);
      list.appendChild(li);
      continue;
    }

    closeList();

    if (line.startsWith('### ')) {
      const h3 = document.createElement('h3');
      h3.textContent = line.slice(4);
      article.appendChild(h3);
      continue;
    }

    if (line.startsWith('## ')) {
      const h2 = document.createElement('h2');
      h2.textContent = line.slice(3);
      article.appendChild(h2);
      continue;
    }

    if (line.startsWith('# ')) {
      const h1 = document.createElement('h1');
      h1.textContent = line.slice(2);
      article.appendChild(h1);
      continue;
    }

    const paragraph = document.createElement('p');
    paragraph.textContent = line.replace(/\*\*/g, '');
    article.appendChild(paragraph);
  }

  closeList();
  return article;
};

export const renderLegalDocument = (
  root: HTMLElement,
  route: LegalRoute,
  legalDocs: Record<LegalRoute, string>,
  goTo: (route: LegalNavigationRoute) => void
): void => {
  const page = document.createElement('div');
  page.className = 'legal-page';

  const container = document.createElement('div');
  container.className = 'legal-container';

  const back = document.createElement('a');
  back.href = '#';
  back.className = 'legal-back';
  back.textContent = `← ${translate('common.back')}`;
  back.onclick = (event) => {
    event.preventDefault();
    goTo(resolveLegalBackTarget());
  };

  container.appendChild(back);
  container.appendChild(renderMarkdownSafe(legalDocs[route]));
  page.appendChild(container);
  root.replaceChildren(page);
};

export const renderLegalCenter = (root: HTMLElement, goTo: (route: LegalNavigationRoute) => void): void => {
  const page = document.createElement('div');
  page.className = 'legal-page';

  const container = document.createElement('div');
  container.className = 'legal-container';

  const back = document.createElement('a');
  back.href = '#';
  back.className = 'legal-back';
  back.textContent = `← ${translate('common.back')}`;
  back.onclick = (event) => {
    event.preventDefault();
    goTo(resolveLegalBackTarget());
  };

  const heading = document.createElement('h1');
  heading.textContent = translate('legal.documents');

  const list = document.createElement('ul');
  list.className = 'legal-links';

  const entries: Array<{ label: string; route: LegalRoute }> = [
    { label: 'Terms of Service', route: '/terms' },
    { label: 'Privacy Policy', route: '/privacy' },
    { label: 'Cancellation & Withdrawal', route: '/cancellation' },
    { label: 'Refund Policy', route: '/refund' },
    { label: 'Cookie Policy', route: '/cookies' },
    { label: 'Legal Notice', route: '/legal' }
  ];

  for (const entry of entries) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = entry.label;
    link.onclick = (event) => {
      event.preventDefault();
      setLegalBackTarget('/legal-center');
      goTo(entry.route);
    };
    item.appendChild(link);
    list.appendChild(item);
  }

  container.appendChild(back);
  container.appendChild(heading);
  container.appendChild(list);
  page.appendChild(container);
  root.replaceChildren(page);
};