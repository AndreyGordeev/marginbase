import type { MobileScreen, MobileScreenProps } from '../screen-types';
import { createScreenElement, createButton, createCard } from '../screen-types';

export const createHomeScreen = (): MobileScreen => ({
  route: '/home',
  title: 'Dashboard',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-home', 'Dashboard');

    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    // Access status
    const statusCard = createCard(
      'Module Access',
      `Profit: ${props.service.canOpenModule('profit') ? '✓ Unlocked' : '🔒 Locked'}`,
    );
    content.appendChild(statusCard);

    // Quick access buttons
    const modules = [
      { id: 'profit', label: 'Profit Calculator', icon: '📊' },
      { id: 'breakeven', label: 'Break-even', icon: '⚖️' },
      { id: 'cashflow', label: 'Cashflow Forecast', icon: '📈' },
    ];

    for (const mod of modules) {
      const isLocked = !props.service.canOpenModule(mod.id as 'profit' | 'breakeven' | 'cashflow');
      const button = createButton(
        `${mod.icon} ${mod.label}${isLocked ? ' (Locked)' : ''}`,
        () => props.onNavigate(`/module/${mod.id}/scenarios`),
        isLocked ? 'disabled' : 'primary',
      );
      button.disabled = isLocked;
      content.appendChild(button);
    }

    const navButton1 = createButton('📱 Scenarios', () =>
      props.onNavigate('/module/profit/scenarios'),
    );
    const navButton2 = createButton('⚙️ Settings', () =>
      props.onNavigate('/settings'),
    );
    const navButton3 = createButton('🔒 Subscription', () =>
      props.onNavigate('/subscription'),
    );

    content.appendChild(navButton1);
    content.appendChild(navButton2);
    content.appendChild(navButton3);

    screen.appendChild(content);
    return screen;
  },
});
