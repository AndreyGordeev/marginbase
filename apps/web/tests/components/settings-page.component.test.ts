// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeI18nProvider } from '../../src/i18n';
import { renderSettingsPage } from '../../src/ui/pages/settings-page';

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

describe('settings page component', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await initializeI18nProvider();
  });

  it('renders consent UI and updates telemetry state via buttons', async () => {
    const service = {
      signOut: vi.fn(),
      getSignedInUserId: vi.fn().mockReturnValue('user-1'),
      getEntitlementCache: vi
        .fn()
        .mockReturnValue({ source: 'stripe', status: 'active' }),
      startBillingPortalSession: vi
        .fn()
        .mockResolvedValue('https://billing.example'),
      deleteAccount: vi.fn().mockResolvedValue(false),
      getTelemetryConsentState: vi.fn().mockReturnValue('not_decided'),
      setTelemetryConsentState: vi.fn(),
    } as never;

    const root = document.getElementById('root')!;
    const goTo = vi.fn();

    await renderSettingsPage(root, service, {
      createActionButton,
      goTo,
      setLegalBackTarget: vi.fn(),
    });

    const buttons = Array.from(root.querySelectorAll('button'));
    expect(buttons.length).toBeGreaterThan(3);

    const consentButton = buttons.find((btn) =>
      (btn.textContent ?? '').toLowerCase().includes('enable'),
    );
    expect(consentButton).toBeDefined();
    consentButton!.click();

    expect(
      (service as { setTelemetryConsentState: ReturnType<typeof vi.fn> })
        .setTelemetryConsentState,
    ).toHaveBeenCalledWith('enabled');
  });
});
