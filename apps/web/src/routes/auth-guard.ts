import type { AppRoutePath } from '../ui/pages/page-types';
import { WebAppService } from '../web-app-service';
import { PROTECTED_ROUTES } from './route-maps';

export const checkAuthenticationGuard = (route: AppRoutePath, service: WebAppService, goTo: (route: AppRoutePath) => void): boolean => {
  const isProtected = PROTECTED_ROUTES.includes(route as typeof PROTECTED_ROUTES[number]);

  if (isProtected && !service.isSignedIn()) {
    goTo('/login');
    return false;
  }

  return true;
};

export const handleInitialPathRedirect = (path: string, service: WebAppService, goTo: (route: AppRoutePath) => void, ROUTES: AppRoutePath[]): void => {
  const isLegacyPublicPath =
    path === '/s' ||
    path.startsWith('/s/') ||
    path === '/embed' ||
    path.startsWith('/embed/');

  const isProtectedRoute = PROTECTED_ROUTES.includes(path as typeof PROTECTED_ROUTES[number]);

  if (!ROUTES.includes(path as AppRoutePath) && !isLegacyPublicPath) {
    goTo('/login');
  } else if (isProtectedRoute && !service.isSignedIn()) {
    goTo('/login');
  }
};
