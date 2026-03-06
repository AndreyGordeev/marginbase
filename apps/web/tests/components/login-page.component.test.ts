// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeI18nProvider } from '../../src/i18n';
import { renderLoginPage } from '../../src/ui/auth/login-page';

const createActionButton = (
  label: string,
  onClick: () => void,
  className?: string,
): HTMLButtonElement => {
  const button = document.createElement('button');
  button.textContent = label;
  button.className = className ?? '';
  button.onclick = onClick;
  return button;
};

describe('login-page component', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await initializeI18nProvider();
  });

  it('renders login widget and guest action', () => {
    const root = document.getElementById('root')!;
    const goTo = vi.fn();

    renderLoginPage(root, {
      createActionButton,
      goTo,
      setLegalBackTarget: vi.fn(),
      googleOAuthService: undefined,
    });

    expect(root.querySelector('.page-login')).not.toBeNull();
    const buttons = Array.from(root.querySelectorAll('button')).map(
      (b) => b.textContent?.toLowerCase() ?? '',
    );
    expect(buttons.some((text) => text.includes('guest'))).toBe(true);
  });

  it('navigates to dashboard when guest button is clicked', () => {
    const root = document.getElementById('root')!;
    const goTo = vi.fn();

    renderLoginPage(root, {
      createActionButton,
      goTo,
      setLegalBackTarget: vi.fn(),
      googleOAuthService: undefined,
    });

    const guestButton = Array.from(root.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').toLowerCase().includes('guest'),
    );

    expect(guestButton).toBeDefined();
    guestButton!.click();
    expect(goTo).toHaveBeenCalledWith('/dashboard');
  });
});
