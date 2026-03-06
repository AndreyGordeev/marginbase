import type { MobileAppService } from '../mobile-app-service';

export type MobileScreenRoute = string;

export interface MobileScreenProps {
  service: MobileAppService;
  params?: Record<string, string>;
  onNavigate: (
    route: MobileScreenRoute,
    newParams?: Record<string, string>,
  ) => void;
}

export interface MobileScreen {
  route: MobileScreenRoute;
  title: string;
  render: (props: MobileScreenProps) => HTMLElement;
}

export const createScreenElement = (
  className: string,
  title?: string,
): HTMLElement => {
  const screen = document.createElement('div');
  screen.className = `mobile-screen ${className}`;
  if (title) {
    const header = document.createElement('header');
    header.className = 'mobile-screen-header';
    header.innerHTML = `<h1>${title}</h1>`;
    screen.appendChild(header);
  }
  return screen;
};

export const createButton = (
  label: string,
  onClick: () => void,
  className = '',
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.className = `mobile-btn ${className}`;
  button.textContent = label;
  button.onclick = onClick;
  return button;
};

export const createInput = (
  placeholder: string,
  type = 'text',
): HTMLInputElement => {
  const input = document.createElement('input');
  input.type = type;
  input.className = 'mobile-input';
  input.placeholder = placeholder;
  return input;
};

export const createCard = (title: string, content?: string): HTMLElement => {
  const card = document.createElement('div');
  card.className = 'mobile-card';
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  card.appendChild(titleEl);
  if (content) {
    const contentEl = document.createElement('p');
    contentEl.textContent = content;
    card.appendChild(contentEl);
  }
  return card;
};

export const parseRoute = (
  route: string,
): { base: string; params: Record<string, string> } => {
  const paramMatch = route.match(/:([a-zA-Z]+)/g);
  const params: Record<string, string> = {};

  if (paramMatch) {
    paramMatch.forEach((param) => {
      const key = param.substring(1); // Remove ':'
      params[key] = '';
    });
  }

  const base = route.replace(/:([a-zA-Z]+)/g, '[param]');
  return { base, params };
};
