import type { MobileScreen, MobileScreenProps } from '../screen-types';
import {
  createButton,
  createCard,
  createScreenElement,
} from '../screen-types';

export const createHomeScreen = (): MobileScreen => ({
  route: '/home',
  title: 'Dashboard',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-home', 'Dashboard');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    content.appendChild(
      createCard('Calculators', 'Select a module to manage scenarios.'),
    );

    // Profit calculator (always available)
    content.appendChild(
      createButton(
        'Profit calculator',
        () => props.onNavigate('/module/profit/scenarios'),
        'primary',
      ),
    );

    // Break-even calculator (gated)
    if (props.service.canOpenModule('breakeven')) {
      content.appendChild(
        createButton('Break-even calculator', () =>
          props.onNavigate('/module/breakeven/scenarios'),
        ),
      );
    } else {
      const lockedBtn = createButton(
        'Break-even calculator (locked)',
        () => props.onNavigate('/gate'),
      );
      lockedBtn.disabled = false;
      lockedBtn.style.opacity = '0.6';
      content.appendChild(lockedBtn);
    }

    // Cashflow calculator (gated)
    if (props.service.canOpenModule('cashflow')) {
      content.appendChild(
        createButton('Cashflow calculator', () =>
          props.onNavigate('/module/cashflow/scenarios'),
        ),
      );
    } else {
      const lockedBtn = createButton(
        'Cashflow calculator (locked)',
        () => props.onNavigate('/gate'),
      );
      lockedBtn.disabled = false;
      lockedBtn.style.opacity = '0.6';
      content.appendChild(lockedBtn);
    }

    // Settings and subscription links
    content.appendChild(
      createCard('Account', 'Manage settings and subscription.'),
    );
    content.appendChild(
      createButton('Settings', () => props.onNavigate('/settings')),
    );
    content.appendChild(
      createButton('Subscription', () => props.onNavigate('/subscription')),
    );

    screen.appendChild(content);
    return screen;
  },
});
