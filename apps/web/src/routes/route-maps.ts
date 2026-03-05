import { translate } from '../i18n';
import type { AppRoutePath } from '../ui/pages/page-types';
import type { ModuleId } from '@marginbase/domain-core';

export const MODULE_MAP: Record<'/profit' | '/break-even' | '/cashflow', ModuleId> = {
  '/profit': 'profit',
  '/break-even': 'breakeven',
  '/cashflow': 'cashflow'
};

export const MODULE_TITLE_MAP: Record<ModuleId, string> = {
  profit: translate('workspace.module.profit'),
  breakeven: translate('workspace.module.breakeven'),
  cashflow: translate('workspace.module.cashflow')
};

export const PROTECTED_ROUTES = ['/dashboard', '/profit', '/break-even', '/cashflow', '/subscription', '/data', '/settings'] as const;

export const isProtectedRoute = (route: AppRoutePath): route is '/dashboard' | '/profit' | '/break-even' | '/cashflow' | '/subscription' | '/data' | '/settings' => {
  return PROTECTED_ROUTES.includes(route as typeof PROTECTED_ROUTES[number]);
};
