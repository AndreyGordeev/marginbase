// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileRouter } from '../src/ui/mobile-router';

describe('mobile router component flows', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.location.hash = '';
  });

  it('navigates login -> home and renders expected screen shells', () => {
    const container = document.getElementById('app')!;

    const service = {
      canOpenModule: vi.fn().mockReturnValue(false),
      listScenarios: vi.fn().mockResolvedValue([]),
      duplicateScenario: vi.fn(),
      deleteScenario: vi.fn(),
      saveProfitScenario: vi.fn(),
      saveBreakevenScenario: vi.fn(),
      saveCashflowScenario: vi.fn(),
      exportScenariosJson: vi.fn().mockResolvedValue('{}'),
      previewImport: vi.fn(),
      applyImport: vi.fn(),
      clearAllData: vi.fn(),
      verifyPurchaseOnDevice: vi.fn(),
      refreshEntitlementsIfNeeded: vi.fn(),
      signOut: vi.fn(),
    } as never;

    const router = new MobileRouter(container, service);

    router.navigateTo('/login');
    expect(container.querySelector('.screen-login')).not.toBeNull();

    router.navigateTo('/home');
    expect(container.querySelector('.screen-home')).not.toBeNull();
    expect(document.title).toBe('Dashboard');
  });
});
