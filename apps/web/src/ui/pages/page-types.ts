import type { LegalBackTarget } from '../legal/legal-render';

export type AppRoutePath =
  | '/'
  | '/login'
  | '/gate'
  | '/dashboard'
  | '/profit'
  | '/break-even'
  | '/cashflow'
  | '/subscription'
  | '/data'
  | '/settings'
  | '/terms'
  | '/privacy'
  | '/legal'
  | '/cancellation'
  | '/refund'
  | '/cookies'
  | '/legal-center'
  | '/legal/privacy'
  | '/legal/terms';

export type ActionButtonFactory = (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
export type EmptyStateFactory = (title: string, description: string, actionText?: string, onAction?: () => void) => HTMLElement;

export type CommonDeps = {
  createActionButton: ActionButtonFactory;
  emptyState: EmptyStateFactory;
  goTo: (route: AppRoutePath) => void;
  setLegalBackTarget: (target: LegalBackTarget) => void;
  render: () => Promise<void>;
};

export type WorkspaceDeps = CommonDeps & {
  debugResultsEnabled: boolean;
  getShowDebugJson: () => boolean;
  setShowDebugJson: (value: boolean) => void;
};
