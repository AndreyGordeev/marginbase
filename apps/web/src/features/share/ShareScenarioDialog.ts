import { translate } from '../../i18n';

export interface ShareScenarioDialogInput {
  shareUrl: string;
  expiresAt: string;
  onCopy: () => Promise<void>;
  onClose: () => void;
  createActionButton: (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
}

export const renderShareScenarioDialog = (input: ShareScenarioDialogInput): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'modal';

  const title = document.createElement('h3');
  title.textContent = translate('shared.title');

  const copy = document.createElement('p');
  copy.textContent = `${translate('data.share.expires')}: ${input.expiresAt}`;

  const link = document.createElement('textarea');
  link.readOnly = true;
  link.rows = 3;
  link.value = input.shareUrl;

  const actions = document.createElement('div');
  actions.className = 'button-row';

  const copyButton = input.createActionButton(translate('shared.copyLink'), () => {
    void input.onCopy();
  }, 'primary');

  const closeButton = input.createActionButton(translate('common.close'), input.onClose);

  actions.appendChild(copyButton);
  actions.appendChild(closeButton);

  container.appendChild(title);
  container.appendChild(copy);
  container.appendChild(link);
  container.appendChild(actions);

  return container;
};
