import type { MobileScreen, MobileScreenProps } from '../screen-types';
import {
  createButton,
  createCard,
  createScreenElement,
} from '../screen-types';

export const createLoginScreen = (): MobileScreen => ({
  route: '/login',
  title: 'Sign in',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-login', 'Welcome');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    content.appendChild(
      createCard(
        'MarginBase Mobile',
        'Plan your business with Profit, Break-even, and Cashflow calculators.',
      ),
    );

    // Platform-specific sign-in buttons
    if (typeof window !== 'undefined' && 'cordova' in window) {
      // Mobile platform (iOS/Android)
      const platform = navigator.userAgent.includes('iPhone') ? 'iOS' : 'Android';
      
      content.appendChild(
        createButton(
          `Sign in with ${platform}`,
          async () => {
            // Mock entitlement check - production would use native IAP
            const hasPurchase = false; // Replace with actual store check
            if (hasPurchase) {
              props.onNavigate('/home');
            } else {
              // Free trial access
              props.onNavigate('/home');
            }
          },
          'primary',
        ),
      );
    } else {
      // Web preview mode
      content.appendChild(
        createButton(
          'Continue as guest',
          () => {
            // Development/preview mode - allow direct access
            props.onNavigate('/home');
          },
          'primary',
        ),
      );
    }

    content.appendChild(
      createButton('Privacy', () => props.onNavigate('/legal/privacy')),
    );
    content.appendChild(
      createButton('Terms', () => props.onNavigate('/legal/terms')),
    );

    screen.appendChild(content);
    return screen;
  },
});
