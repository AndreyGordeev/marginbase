import type { ScenarioV1 } from '@marginbase/domain-core';
import type {
  MobileBreakEvenInput,
  MobileCashflowInput,
  MobileModuleId,
  MobileProfitInput,
} from '../../mobile-app-service';
import type { MobileScreen, MobileScreenProps } from '../screen-types';
import {
  createButton,
  createCard,
  createInput,
  createScreenElement,
} from '../screen-types';

const moduleEditorRoute = (
  moduleId: MobileModuleId,
  scenarioId: string,
): string => {
  if (moduleId === 'profit') {
    return `/module/profit/editor/${scenarioId}`;
  }
  if (moduleId === 'breakeven') {
    return `/module/breakeven/editor/${scenarioId}`;
  }
  return `/module/cashflow/editor/${scenarioId}`;
};

const parseModuleId = (value: string | undefined): MobileModuleId => {
  if (value === 'breakeven' || value === 'cashflow') {
    return value;
  }
  return 'profit';
};

const readScenarioById = async (
  props: MobileScreenProps,
  moduleId: MobileModuleId,
  scenarioId: string,
): Promise<ScenarioV1 | null> => {
  const scenarios = await props.service.listScenarios(moduleId);
  return (
    scenarios.find(
      (scenario: ScenarioV1) => scenario.scenarioId === scenarioId,
    ) || null
  );
};

const asNumber = (value: string, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const createEditorActions = (
  props: MobileScreenProps,
  moduleId: MobileModuleId,
  scenarioId: string,
): HTMLElement => {
  const row = document.createElement('div');
  row.className = 'mobile-screen-content';
  row.appendChild(
    createButton('Back to list', () =>
      props.onNavigate(`/module/${moduleId}/scenarios`),
    ),
  );
  if (scenarioId !== 'new') {
    row.appendChild(
      createButton('Delete', async () => {
        await props.service.deleteScenario(scenarioId);
        props.onNavigate(`/module/${moduleId}/scenarios`);
      }),
    );
  }
  return row;
};

export const createGateScreen = (): MobileScreen => ({
  route: '/gate',
  title: 'Upgrade',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-gate', 'Unlock calculators');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    content.appendChild(
      createCard(
        'Free plan',
        'Profit is available. Break-even and Cashflow require active entitlement.',
      ),
    );
    content.appendChild(
      createButton(
        'View subscription',
        () => props.onNavigate('/subscription'),
        'primary',
      ),
    );
    content.appendChild(
      createButton('Continue to dashboard', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createScenarioListScreen = (): MobileScreen => ({
  route: '/module/:moduleId/scenarios',
  title: 'Scenarios',
  render: (props: MobileScreenProps) => {
    const moduleId = parseModuleId(props.params?.moduleId);
    const screen = createScreenElement(
      'screen-scenarios',
      `${moduleId} scenarios`,
    );
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    const listContainer = document.createElement('div');
    listContainer.className = 'mobile-screen-content';
    listContainer.textContent = 'Loading scenarios...';

    content.appendChild(
      createButton(
        'New scenario',
        () => props.onNavigate(moduleEditorRoute(moduleId, 'new')),
        'primary',
      ),
    );
    content.appendChild(
      createButton('Dashboard', () => props.onNavigate('/home')),
    );
    content.appendChild(listContainer);

    void (async () => {
      const scenarios = await props.service.listScenarios(moduleId);
      listContainer.replaceChildren();

      if (scenarios.length === 0) {
        listContainer.appendChild(
          createCard(
            'No scenarios yet',
            'Create your first scenario from this screen.',
          ),
        );
        return;
      }

      for (const scenario of scenarios) {
        const card = document.createElement('div');
        card.className = 'mobile-card';
        const title = document.createElement('h3');
        title.textContent = scenario.scenarioName;
        const meta = document.createElement('p');
        meta.textContent = `Updated: ${scenario.updatedAt}`;
        card.appendChild(title);
        card.appendChild(meta);

        card.appendChild(
          createButton('Edit', () =>
            props.onNavigate(moduleEditorRoute(moduleId, scenario.scenarioId)),
          ),
        );
        card.appendChild(
          createButton('Duplicate', async () => {
            await props.service.duplicateScenario(scenario.scenarioId);
            props.onNavigate(`/module/${moduleId}/scenarios`);
          }),
        );
        card.appendChild(
          createButton('Delete', async () => {
            await props.service.deleteScenario(scenario.scenarioId);
            props.onNavigate(`/module/${moduleId}/scenarios`);
          }),
        );
        listContainer.appendChild(card);
      }
    })();

    screen.appendChild(content);
    return screen;
  },
});

export const createProfitEditorScreen = (): MobileScreen => ({
  route: '/module/profit/editor/:scenarioId',
  title: 'Profit editor',
  render: (props: MobileScreenProps) => {
    const scenarioId = props.params?.scenarioId || 'new';
    const screen = createScreenElement('screen-editor', 'Profit calculator');
    const form = document.createElement('form');
    form.className = 'mobile-screen-form';

    const nameInput = createInput('Scenario name');
    const unitPriceInput = createInput('Unit price (minor)', 'number');
    const quantityInput = createInput('Quantity', 'number');
    const variableCostInput = createInput(
      'Variable cost per unit (minor)',
      'number',
    );
    const fixedCostsInput = createInput('Fixed costs (minor)', 'number');
    const resultView = createCard(
      'Result',
      'Fill values and save to calculate',
    );

    const renderResult = async (): Promise<void> => {
      const preview = await props.service.saveProfitScenario({
        scenarioId: 'preview_only',
        scenarioName: nameInput.value || 'Preview',
        unitPriceMinor: asNumber(unitPriceInput.value),
        quantity: asNumber(quantityInput.value),
        variableCostPerUnitMinor: asNumber(variableCostInput.value),
        fixedCostsMinor: asNumber(fixedCostsInput.value),
      });
      resultView.querySelector('p')!.textContent = JSON.stringify(
        preview.calculatedData,
      );
      await props.service.deleteScenario('preview_only');
    };

    void (async () => {
      if (scenarioId === 'new') {
        return;
      }
      const scenario = await readScenarioById(props, 'profit', scenarioId);
      if (!scenario) {
        return;
      }
      nameInput.value = scenario.scenarioName;
      unitPriceInput.value = String(scenario.inputData.unitPriceMinor || 0);
      quantityInput.value = String(scenario.inputData.quantity || 0);
      variableCostInput.value = String(
        scenario.inputData.variableCostPerUnitMinor || 0,
      );
      fixedCostsInput.value = String(scenario.inputData.fixedCostsMinor || 0);
      resultView.querySelector('p')!.textContent = JSON.stringify(
        scenario.calculatedData || {},
      );
    })();

    form.appendChild(nameInput);
    form.appendChild(unitPriceInput);
    form.appendChild(quantityInput);
    form.appendChild(variableCostInput);
    form.appendChild(fixedCostsInput);
    form.appendChild(resultView);

    form.appendChild(
      createButton('Preview', async () => {
        await renderResult();
      }),
    );

    form.appendChild(
      createButton(
        'Save',
        async () => {
          const payload: MobileProfitInput = {
            scenarioId: scenarioId === 'new' ? undefined : scenarioId,
            scenarioName: nameInput.value || 'Profit scenario',
            unitPriceMinor: asNumber(unitPriceInput.value),
            quantity: asNumber(quantityInput.value),
            variableCostPerUnitMinor: asNumber(variableCostInput.value),
            fixedCostsMinor: asNumber(fixedCostsInput.value),
          };
          await props.service.saveProfitScenario(payload);
          props.onNavigate('/module/profit/scenarios');
        },
        'primary',
      ),
    );

    screen.appendChild(form);
    screen.appendChild(createEditorActions(props, 'profit', scenarioId));
    return screen;
  },
});

export const createBreakevenEditorScreen = (): MobileScreen => ({
  route: '/module/breakeven/editor/:scenarioId',
  title: 'Break-even editor',
  render: (props: MobileScreenProps) => {
    const scenarioId = props.params?.scenarioId || 'new';
    const screen = createScreenElement(
      'screen-editor',
      'Break-even calculator',
    );
    const form = document.createElement('form');
    form.className = 'mobile-screen-form';

    const nameInput = createInput('Scenario name');
    const unitPriceInput = createInput('Unit price (minor)', 'number');
    const variableCostInput = createInput(
      'Variable cost per unit (minor)',
      'number',
    );
    const fixedCostsInput = createInput('Fixed costs (minor)', 'number');
    const targetProfitInput = createInput('Target profit (minor)', 'number');
    const plannedQuantityInput = createInput('Planned quantity', 'number');
    const resultView = createCard(
      'Result',
      'Fill values and save to calculate',
    );

    void (async () => {
      if (scenarioId === 'new') {
        return;
      }
      const scenario = await readScenarioById(props, 'breakeven', scenarioId);
      if (!scenario) {
        return;
      }
      nameInput.value = scenario.scenarioName;
      unitPriceInput.value = String(scenario.inputData.unitPriceMinor || 0);
      variableCostInput.value = String(
        scenario.inputData.variableCostPerUnitMinor || 0,
      );
      fixedCostsInput.value = String(scenario.inputData.fixedCostsMinor || 0);
      targetProfitInput.value = String(
        scenario.inputData.targetProfitMinor || 0,
      );
      plannedQuantityInput.value = String(
        scenario.inputData.plannedQuantity || 0,
      );
      resultView.querySelector('p')!.textContent = JSON.stringify(
        scenario.calculatedData || {},
      );
    })();

    form.appendChild(nameInput);
    form.appendChild(unitPriceInput);
    form.appendChild(variableCostInput);
    form.appendChild(fixedCostsInput);
    form.appendChild(targetProfitInput);
    form.appendChild(plannedQuantityInput);
    form.appendChild(resultView);

    form.appendChild(
      createButton(
        'Save',
        async () => {
          const payload: MobileBreakEvenInput = {
            scenarioId: scenarioId === 'new' ? undefined : scenarioId,
            scenarioName: nameInput.value || 'Break-even scenario',
            unitPriceMinor: asNumber(unitPriceInput.value),
            variableCostPerUnitMinor: asNumber(variableCostInput.value),
            fixedCostsMinor: asNumber(fixedCostsInput.value),
            targetProfitMinor: asNumber(targetProfitInput.value),
            plannedQuantity: asNumber(plannedQuantityInput.value),
          };
          const saved = await props.service.saveBreakEvenScenario(payload);
          resultView.querySelector('p')!.textContent = JSON.stringify(
            saved.calculatedData || {},
          );
          props.onNavigate('/module/breakeven/scenarios');
        },
        'primary',
      ),
    );

    screen.appendChild(form);
    screen.appendChild(createEditorActions(props, 'breakeven', scenarioId));
    return screen;
  },
});

export const createCashflowEditorScreen = (): MobileScreen => ({
  route: '/module/cashflow/editor/:scenarioId',
  title: 'Cashflow editor',
  render: (props: MobileScreenProps) => {
    const scenarioId = props.params?.scenarioId || 'new';
    const screen = createScreenElement('screen-editor', 'Cashflow calculator');
    const form = document.createElement('form');
    form.className = 'mobile-screen-form';

    const nameInput = createInput('Scenario name');
    const startingCashInput = createInput('Starting cash (minor)', 'number');
    const revenueInput = createInput('Monthly revenue (minor)', 'number');
    const fixedCostsInput = createInput(
      'Fixed monthly costs (minor)',
      'number',
    );
    const variableCostsInput = createInput(
      'Variable monthly costs (minor)',
      'number',
    );
    const monthsInput = createInput('Forecast months', 'number');
    const growthInput = createInput('Growth rate (e.g. 0.02)', 'number');
    const resultView = createCard(
      'Result',
      'Fill values and save to calculate',
    );

    void (async () => {
      if (scenarioId === 'new') {
        return;
      }
      const scenario = await readScenarioById(props, 'cashflow', scenarioId);
      if (!scenario) {
        return;
      }
      nameInput.value = scenario.scenarioName;
      startingCashInput.value = String(
        scenario.inputData.startingCashMinor || 0,
      );
      revenueInput.value = String(
        scenario.inputData.baseMonthlyRevenueMinor || 0,
      );
      fixedCostsInput.value = String(
        scenario.inputData.fixedMonthlyCostsMinor || 0,
      );
      variableCostsInput.value = String(
        scenario.inputData.variableMonthlyCostsMinor || 0,
      );
      monthsInput.value = String(scenario.inputData.forecastMonths || 6);
      growthInput.value = String(scenario.inputData.monthlyGrowthRate || 0);
      resultView.querySelector('p')!.textContent = JSON.stringify(
        scenario.calculatedData || {},
      );
    })();

    form.appendChild(nameInput);
    form.appendChild(startingCashInput);
    form.appendChild(revenueInput);
    form.appendChild(fixedCostsInput);
    form.appendChild(variableCostsInput);
    form.appendChild(monthsInput);
    form.appendChild(growthInput);
    form.appendChild(resultView);

    form.appendChild(
      createButton(
        'Save',
        async () => {
          const payload: MobileCashflowInput = {
            scenarioId: scenarioId === 'new' ? undefined : scenarioId,
            scenarioName: nameInput.value || 'Cashflow scenario',
            startingCashMinor: asNumber(startingCashInput.value),
            baseMonthlyRevenueMinor: asNumber(revenueInput.value),
            fixedMonthlyCostsMinor: asNumber(fixedCostsInput.value),
            variableMonthlyCostsMinor: asNumber(variableCostsInput.value),
            forecastMonths: asNumber(monthsInput.value, 6),
            monthlyGrowthRate: asNumber(growthInput.value, 0),
          };
          const saved = await props.service.saveCashflowScenario(payload);
          resultView.querySelector('p')!.textContent = JSON.stringify(
            saved.calculatedData || {},
          );
          props.onNavigate('/module/cashflow/scenarios');
        },
        'primary',
      ),
    );

    screen.appendChild(form);
    screen.appendChild(createEditorActions(props, 'cashflow', scenarioId));
    return screen;
  },
});

export const createSettingsScreen = (): MobileScreen => ({
  route: '/settings',
  title: 'Settings',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-settings', 'Settings');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    content.appendChild(
      createCard('Data', 'Export or import scenarios locally.'),
    );
    content.appendChild(
      createButton(
        'Export JSON',
        async () => {
          const json = await props.service.exportScenariosJson();
          const blob = new Blob([json], { type: 'application/json' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'marginbase-mobile-export.json';
          link.click();
          URL.revokeObjectURL(link.href);
        },
        'primary',
      ),
    );
    content.appendChild(
      createButton('Import JSON', async () => {
        const text = window.prompt('Paste exported JSON');
        if (!text) {
          return;
        }
        const preview = props.service.previewImport(text);
        const result = await props.service.applyImport(preview);
        window.alert(result.message);
        props.onNavigate('/import-export-result');
      }),
    );
    content.appendChild(
      createButton('Privacy', () => props.onNavigate('/legal/privacy')),
    );
    content.appendChild(
      createButton('Terms', () => props.onNavigate('/legal/terms')),
    );
    content.appendChild(
      createButton('Back to dashboard', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createSubscriptionScreen = (): MobileScreen => ({
  route: '/subscription',
  title: 'Subscription',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-subscription', 'Plan status');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';

    const hasBundle =
      props.service.canOpenModule('breakeven') &&
      props.service.canOpenModule('cashflow');
    content.appendChild(
      createCard(
        hasBundle ? 'Active plan' : 'Free plan',
        hasBundle
          ? 'All calculators are unlocked.'
          : 'Upgrade is required for Break-even and Cashflow.',
      ),
    );
    content.appendChild(
      createButton('Go to gate', () => props.onNavigate('/gate'), 'primary'),
    );
    content.appendChild(
      createButton('Settings', () => props.onNavigate('/settings')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createPrivacyScreen = (): MobileScreen => ({
  route: '/legal/privacy',
  title: 'Privacy',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-legal', 'Privacy policy');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard(
        'Data handling',
        'Scenarios are stored locally. Backend receives auth, entitlement and telemetry metadata only.',
      ),
    );
    content.appendChild(
      createButton('Back', () => props.onNavigate('/settings')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createTermsScreen = (): MobileScreen => ({
  route: '/legal/terms',
  title: 'Terms',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-legal', 'Terms of service');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard(
        'Terms',
        'MarginBase provides planning tools. Financial decisions remain user responsibility.',
      ),
    );
    content.appendChild(
      createButton('Back', () => props.onNavigate('/settings')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createImportExportResultScreen = (): MobileScreen => ({
  route: '/import-export-result',
  title: 'Import/Export',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-result', 'Data transfer');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('Operation complete', 'Review data in scenario lists.'),
    );
    content.appendChild(
      createButton('Dashboard', () => props.onNavigate('/home')),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createErrorModalScreen = (): MobileScreen => ({
  route: '/error-modal',
  title: 'Error',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-modal screen-error', 'Error');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('Operation failed', 'Please retry from the previous screen.'),
    );
    content.appendChild(createButton('Back', () => props.onNavigate('/home')));
    screen.appendChild(content);
    return screen;
  },
});

export const createEmptyStateScreen = (): MobileScreen => ({
  route: '/empty-state',
  title: 'Empty',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-empty', 'No scenarios');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('No data', 'Create your first profit scenario.'),
    );
    content.appendChild(
      createButton('Create scenario', () =>
        props.onNavigate('/module/profit/editor/new'),
      ),
    );
    screen.appendChild(content);
    return screen;
  },
});

export const createSplashScreen = (): MobileScreen => ({
  route: '/splash',
  title: 'Splash',
  render: (props: MobileScreenProps) => {
    const screen = createScreenElement('screen-splash');
    const content = document.createElement('div');
    content.className = 'mobile-screen-content';
    content.appendChild(
      createCard('MarginBase', 'Loading mobile workspace...'),
    );
    content.appendChild(
      createButton('Continue', () => props.onNavigate('/login'), 'primary'),
    );
    screen.appendChild(content);
    return screen;
  },
});
