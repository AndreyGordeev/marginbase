import { translate } from '../../i18n';
import { WebAppService } from '../../web-app-service';
import type { ScenarioV1 } from '@marginbase/domain-core';

interface ScenarioListPanelDeps {
  createActionButton: (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
  emptyState: (title: string, description: string) => HTMLElement;
  onSelectScenario: (scenarioId: string) => void;
  onDeleteScenario: (scenarioId: string) => Promise<void>;
  onCreateNew: () => Promise<void>;
}

export const renderScenarioListPanel = (
  scenarios: ScenarioV1[],
  moduleTitle: string,
  selectedScenarioId: string | undefined,
  service: WebAppService,
  deps: ScenarioListPanelDeps
): HTMLElement => {
  const { createActionButton, emptyState, onSelectScenario, onDeleteScenario, onCreateNew } = deps;

  const listPanel = document.createElement('section');
  listPanel.className = 'card scenario-list';
  listPanel.innerHTML = `<h3>${moduleTitle} ${translate('workspace.scenarios')}</h3>`;

  listPanel.appendChild(createActionButton(translate('workspace.newScenario'), onCreateNew, 'primary scenario-create'));

  if (scenarios.length === 0) {
    listPanel.appendChild(emptyState(translate('workspace.noScenarios'), translate('workspace.noScenariosDesc')));
  } else {
    for (const scenario of scenarios) {
      const row = document.createElement('div');
      const isSelected = selectedScenarioId === scenario.scenarioId;
      row.className = isSelected ? 'scenario-item scenario-item-active' : 'scenario-item';

      const nameSpan = document.createElement('span');
      nameSpan.textContent = scenario.scenarioName;
      nameSpan.style.cursor = 'pointer';
      nameSpan.onclick = () => onSelectScenario(scenario.scenarioId);

      row.appendChild(nameSpan);
      row.appendChild(createActionButton(translate('workspace.delete'), async () => {
        await onDeleteScenario(scenario.scenarioId);
      }));
      listPanel.appendChild(row);
    }
  }

  return listPanel;
};
