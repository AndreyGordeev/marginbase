import type { MobileScreen, MobileScreenProps } from '../screen-types';
import { createScreenElement, createButton, createInput } from '../screen-types';

export const createLoginScreen = (): MobileScreen => ({
  route: '/login',
  title: 'Sign In',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-login', 'MarginBase');

    const form = document.createElement('form');
    form.className = 'mobile-screen-form';
    form.onsubmit = (e) => {
      e.preventDefault();
      // In production, this would trigger Google OAuth or real authentication
      props.onNavigate('/gate');
    };

    const description = document.createElement('p');
    description.className = 'mobile-screen-description';
    description.textContent =
      'Sign in with your Google account to access MarginBase.';
    form.appendChild(description);

    const emailInput = createInput('Email address', 'email');
    emailInput.required = true;
    form.appendChild(emailInput);

    const signInButton = createButton(
      'Sign In with Google',
      () => form.dispatchEvent(new Event('submit')),
      'primary',
    );
    form.appendChild(signInButton);

    const guestButton = createButton('Continue as Guest', () =>
      props.onNavigate('/home'),
    );
    form.appendChild(guestButton);

    const legal = document.createElement('p');
    legal.className = 'mobile-screen-legal';
    legal.innerHTML =
      '🔒 Your data never leaves your device<br/>🇪🇺 EU-hosted infrastructure';
    form.appendChild(legal);

    screen.appendChild(form);
    return screen;
  },
});
