import type { ModuleId } from '@marginbase/domain-core';
import { WebAppService, type BreakEvenInputState, type CashflowInputState, type ProfitInputState } from './web-app-service';

type RoutePath =
  | '/login'
  | '/gate'
  | '/dashboard'
  | '/profit'
  | '/break-even'
  | '/cashflow'
  | '/subscription'
  | '/data'
  | '/settings'
  | '/legal/privacy'
  | '/legal/terms';

const ROUTES: RoutePath[] = [
  '/login',
  '/gate',
  '/dashboard',
  '/profit',
  '/break-even',
  '/cashflow',
  '/subscription',
  '/data',
  '/settings',
  '/legal/privacy',
  '/legal/terms'
];

const getRoute = (): RoutePath => {
  const hash = window.location.hash.replace('#', '') as RoutePath;
  return ROUTES.includes(hash) ? hash : '/login';
};

const goTo = (route: RoutePath): void => {
  window.location.hash = route;
};

const createActionButton = (label: string, onClick: () => void, className = ''): HTMLButtonElement => {
  const button = document.createElement('button');
  button.textContent = label;
  button.className = className;
  button.onclick = onClick;
  return button;
};

const emptyState = (title: string, description: string, actionText?: string, onAction?: () => void): HTMLElement => {
  const container = document.createElement('div');
  container.className = 'empty-state';
  container.innerHTML = `<h3>${title}</h3><p>${description}</p>`;

  if (actionText && onAction) {
    container.appendChild(createActionButton(actionText, onAction));
  }

  return container;
};

const addBaseStyles = (): void => {
  const existing = document.getElementById('web-app-styles');
  if (existing) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'web-app-styles';
  style.textContent = `
  body { margin: 0; font-family: Arial, sans-serif; background: #f5f6f8; color: #1f2937; }
  .page { padding: 20px; }
  .page-centered { min-height: 100vh; display: grid; place-items: center; }
  .page-login { min-height: 100vh; padding: 24px; display: grid; place-items: center; background: linear-gradient(180deg, #f8fafc 0%, #f3f4f6 100%); }
  .login-shell { width: min(1120px, 100%); display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; align-items: stretch; }
  .login-panel, .login-preview { box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08); }
  .login-panel { display: grid; gap: 18px; padding: 24px; }
  .login-heading { margin: 0; font-size: 34px; line-height: 1.15; }
  .login-subheading { margin: 0; color: #374151; font-size: 18px; line-height: 1.35; }
  .login-values { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
  .login-values li { color: #1f2937; }
  .login-auth { display: grid; gap: 10px; }
  .login-auth button { width: fit-content; min-width: 220px; }
  .login-trust { display: grid; gap: 6px; color: #4b5563; font-size: 13px; line-height: 1.35; }
  .login-footer { border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .login-preview { padding: 20px; display: grid; gap: 12px; }
  .preview-title { margin: 0; font-size: 18px; }
  .preview-subtitle { margin: 0; color: #6b7280; font-size: 13px; }
  .preview-surface { border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; padding: 12px; display: grid; gap: 10px; }
  .preview-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .preview-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; display: grid; gap: 4px; }
  .preview-kpi-label { font-size: 11px; color: #6b7280; }
  .preview-kpi-value { font-size: 14px; font-weight: 700; color: #111827; }
  .preview-chart { height: 96px; border-radius: 8px; border: 1px solid #dbeafe; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); position: relative; overflow: hidden; }
  .preview-chart::after { content: ''; position: absolute; inset: 18px 10px 12px 10px; border-left: 2px solid #93c5fd; border-bottom: 2px solid #93c5fd; border-radius: 0 0 0 6px; }
  .preview-chart::before { content: ''; position: absolute; left: 26px; right: 14px; bottom: 24px; height: 2px; background: linear-gradient(90deg, #60a5fa 0%, #2563eb 40%, #1d4ed8 100%); transform: skewX(-26deg) translateY(-4px); }
  .preview-calc { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; display: grid; gap: 8px; }
  .preview-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .preview-field { border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; height: 28px; }
  .preview-cta { height: 30px; border-radius: 6px; background: #2563eb; }
  @media (max-width: 940px) {
    .login-shell { grid-template-columns: 1fr; }
  }
  .auth-card { width: min(620px, calc(100vw - 48px)); padding: 26px; display: grid; gap: 18px; }
  .auth-copy { display: grid; gap: 10px; }
  .auth-copy h2, .auth-copy p { margin: 0; }
  .auth-copy h2 { font-size: 38px; line-height: 1.15; }
  .auth-copy p { font-size: 32px; line-height: 1.2; color: #374151; }
  .auth-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .auth-actions button { padding: 10px 14px; font-size: 15px; }
  .shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
  .sidebar { background: #111827; color: #f9fafb; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
  .sidebar button { text-align: left; background: #1f2937; color: #f9fafb; border: 0; padding: 10px; border-radius: 8px; }
  .main { padding: 24px; display: grid; gap: 16px; align-content: start; }
  .card { background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 16px; }
  .workspace { display: grid; grid-template-columns: 260px 1fr 320px; gap: 16px; align-items: start; }
  .scenario-list { display: flex; flex-direction: column; gap: 8px; }
  .scenario-create { align-self: flex-start; padding: 8px 12px; }
  .scenario-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
  .scenario-item span { flex: 1; min-width: 0; }
  .scenario-item button { padding: 6px 10px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-grid label { display: grid; gap: 6px; }
  .form-submit { grid-column: 1 / -1; justify-self: end; min-width: 180px; }
  .button-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .inline-error { border: 1px solid #fdba74; border-radius: 8px; background: #fff7ed; color: #9a3412; padding: 10px; }
  input, select, textarea { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
  button { cursor: pointer; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; background: #fff; }
  .primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .warning-banner { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 10px; border-radius: 8px; }
  .empty-state, .system-error-card { background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; text-align: center; }
  .locked-overlay { margin-top: 12px; padding: 12px; border: 1px dashed #f59e0b; border-radius: 8px; background: #fffbeb; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .ad-placeholder { margin-top: 12px; border: 1px dashed #d1d5db; border-radius: 10px; background: #f9fafb; color: #6b7280; text-align: center; padding: 14px; font-size: 14px; }
  .results-json { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
  .modal { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
  .modal:empty { display: none; }
  .space-y-6 { display: grid; gap: 24px; }
  `;

  document.head.appendChild(style);
};

const renderSidebar = (active: RoutePath): HTMLElement => {
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  const links: Array<{ label: string; route: RoutePath }> = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Profit', route: '/profit' },
    { label: 'Break-even', route: '/break-even' },
    { label: 'Cashflow', route: '/cashflow' },
    { label: 'Subscription', route: '/subscription' },
    { label: 'Data & Backup', route: '/data' },
    { label: 'Settings', route: '/settings' }
  ];

  const title = document.createElement('h3');
  title.textContent = 'Margin Base';
  sidebar.appendChild(title);

  for (const link of links) {
    sidebar.appendChild(
      createActionButton(link.label, () => goTo(link.route), link.route === active ? 'primary' : '')
    );
  }

  return sidebar;
};

const renderLogin = (root: HTMLElement): void => {
  const page = document.createElement('div');
  page.className = 'page-login';

  const shell = document.createElement('div');
  shell.className = 'login-shell';

  const left = document.createElement('section');
  left.className = 'card login-panel';
  left.innerHTML = `
    <h1 class="login-heading">SMB Finance Toolkit</h1>
    <p class="login-subheading">Financial clarity for small businesses.</p>
    <ul class="login-values">
      <li>Profit & margin analysis in seconds</li>
      <li>Break-even modeling for smarter pricing</li>
      <li>Cashflow forecasting without spreadsheets</li>
    </ul>
  `;

  const auth = document.createElement('div');
  auth.className = 'login-auth';
  auth.appendChild(createActionButton('Continue with Google', () => goTo('/gate'), 'primary'));

  const trust = document.createElement('div');
  trust.className = 'login-trust';
  trust.innerHTML = `
    <div>🔒 Offline-first. Your data stays on your device.</div>
    <div>🇪🇺 EU-hosted infrastructure</div>
    <div>No spreadsheets required</div>
    <div>No credit card required</div>
  `;

  const footer = document.createElement('div');
  footer.className = 'login-footer';
  footer.appendChild(createActionButton('Privacy Policy', () => goTo('/legal/privacy')));
  footer.appendChild(createActionButton('Terms of Service', () => goTo('/legal/terms')));

  left.appendChild(auth);
  left.appendChild(trust);
  left.appendChild(footer);

  const right = document.createElement('section');
  right.className = 'card login-preview';
  right.innerHTML = `
    <h3 class="preview-title">Product Preview</h3>
    <p class="preview-subtitle">Live calculations, structured insights, no spreadsheet chaos.</p>
    <div class="preview-surface">
      <div class="preview-kpis">
        <div class="preview-kpi"><span class="preview-kpi-label">Margin</span><span class="preview-kpi-value">31.8%</span></div>
        <div class="preview-kpi"><span class="preview-kpi-label">Break-even</span><span class="preview-kpi-value">174 u</span></div>
        <div class="preview-kpi"><span class="preview-kpi-label">Cash Runway</span><span class="preview-kpi-value">5.4 mo</span></div>
      </div>
      <div class="preview-chart"></div>
      <div class="preview-calc">
        <div class="preview-row"><div class="preview-field"></div><div class="preview-field"></div></div>
        <div class="preview-row"><div class="preview-field"></div><div class="preview-field"></div></div>
        <div class="preview-cta"></div>
      </div>
    </div>
  `;

  shell.appendChild(left);
  shell.appendChild(right);
  page.appendChild(shell);
  root.replaceChildren(page);
};

const renderLegal = (root: HTMLElement, route: '/legal/privacy' | '/legal/terms'): void => {
  const page = document.createElement('div');
  page.className = 'page page-centered';

  const card = document.createElement('div');
  card.className = 'card auth-card';
  const copy = document.createElement('div');
  copy.className = 'auth-copy';

  if (route === '/legal/privacy') {
    copy.innerHTML = '<h2>Privacy Policy</h2><p>Only minimal identity and entitlement metadata is handled by backend services. Financial scenario values remain local-only.</p>';
  } else {
    copy.innerHTML = '<h2>Terms of Service</h2><p>Subscription access is governed by active entitlements. Calculations remain available offline through local engines.</p>';
  }

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  actions.appendChild(createActionButton('Back to Login', () => goTo('/login')));

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};

const renderGate = (root: HTMLElement, service: WebAppService): void => {
  const page = document.createElement('div');
  page.className = 'page page-centered';
  const card = document.createElement('div');
  card.className = 'card auth-card';

  const copy = document.createElement('div');
  copy.className = 'auth-copy';
  copy.innerHTML = '<h2>Access Status</h2><p>Unlock calculators to save and compare scenarios.</p>';

  const actions = document.createElement('div');
  actions.className = 'auth-actions';
  actions.appendChild(createActionButton('Start Free Trial', () => service.activateTrial(), 'primary'));
  actions.appendChild(createActionButton('Continue to Dashboard', () => goTo('/dashboard')));

  card.appendChild(copy);
  card.appendChild(actions);
  page.appendChild(card);
  root.replaceChildren(page);
};

const renderDashboard = async (root: HTMLElement, service: WebAppService): Promise<void> => {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/dashboard'));

  const main = document.createElement('main');
  main.className = 'main';
  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = '<h2>Dashboard</h2><span class="status">Soft gate enabled</span>';
  main.appendChild(header);

  const moduleGrid = document.createElement('div');
  moduleGrid.className = 'grid-3';
  const modules: Array<{ title: string; route: RoutePath; moduleId: ModuleId }> = [
    { title: 'Profit Calculator', route: '/profit', moduleId: 'profit' },
    { title: 'Break-even Calculator', route: '/break-even', moduleId: 'breakeven' },
    { title: 'Cashflow Forecaster', route: '/cashflow', moduleId: 'cashflow' }
  ];

  for (const moduleItem of modules) {
    const card = document.createElement('div');
    card.className = 'card';
    const allowed = service.canOpenModule(moduleItem.moduleId);
    card.innerHTML = `<h3>${moduleItem.title}</h3><p>Status: ${allowed ? 'Active' : 'Locked'}</p>`;
    card.appendChild(
      createActionButton('Open', () => (allowed ? goTo(moduleItem.route) : goTo('/subscription')), allowed ? 'primary' : '')
    );
    moduleGrid.appendChild(card);
  }

  main.appendChild(moduleGrid);

  const recentCard = document.createElement('div');
  recentCard.className = 'card';
  recentCard.innerHTML = '<h3>Recent scenarios</h3>';
  const allScenarios = await service.listAllScenarios();

  if (allScenarios.length === 0) {
    recentCard.appendChild(emptyState('No recent activity', 'Your recent scenarios will appear here.', 'Open Profit Calculator', () => goTo('/profit')));
  } else {
    const list = document.createElement('ul');
    for (const scenario of allScenarios.slice(0, 5)) {
      const item = document.createElement('li');
      item.textContent = `${scenario.module}: ${scenario.scenarioName} (${scenario.updatedAt})`;
      list.appendChild(item);
    }
    recentCard.appendChild(list);
  }

  main.appendChild(recentCard);
  const ad = document.createElement('div');
  ad.className = 'card';
  ad.innerHTML = '<div class="ad-placeholder">Ad block placeholder</div>';
  main.appendChild(ad);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

const parseNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const renderWorkspace = async (
  root: HTMLElement,
  service: WebAppService,
  route: '/profit' | '/break-even' | '/cashflow'
): Promise<void> => {
  const moduleMap: Record<typeof route, ModuleId> = {
    '/profit': 'profit',
    '/break-even': 'breakeven',
    '/cashflow': 'cashflow'
  };
  const moduleTitleMap: Record<ModuleId, string> = {
    profit: 'Profit',
    breakeven: 'Break-even',
    cashflow: 'Cashflow'
  };

  const moduleId = moduleMap[route];
  const moduleTitle = moduleTitleMap[moduleId];
  const allowed = service.canOpenModule(moduleId);
  const scenarios = await service.listScenarios(moduleId);
  const selectedScenario = scenarios[0] ?? null;

  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar(route));

  const main = document.createElement('main');
  main.className = 'main';
  const workspace = document.createElement('div');
  workspace.className = 'workspace';

  const listPanel = document.createElement('section');
  listPanel.className = 'card scenario-list';
  listPanel.innerHTML = `<h3>${moduleTitle} Scenarios</h3>`;
  listPanel.appendChild(createActionButton('+ New Scenario', async () => {
    await service.createDefaultScenario(moduleId);
    await render();
  }, 'primary scenario-create'));

  if (scenarios.length === 0) {
    listPanel.appendChild(emptyState('No scenarios yet', 'Create your first scenario to start analyzing.'));
  } else {
    for (const scenario of scenarios) {
      const row = document.createElement('div');
      row.className = 'scenario-item';
      row.innerHTML = `<span>${scenario.scenarioName}</span>`;
      row.appendChild(createActionButton('Delete', async () => {
        await service.deleteScenario(scenario.scenarioId);
        await render();
      }));
      listPanel.appendChild(row);
    }
  }

  const center = document.createElement('section');
  center.className = 'card';
  center.innerHTML = `<h3>${moduleTitle} Editor</h3>`;

  const form = document.createElement('form');
  form.className = 'form-grid';

  if (moduleId === 'profit') {
    const state: ProfitInputState = service.getProfitInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Unit price (minor)<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>Quantity<input name="quantity" type="number" value="${state.quantity}" /></label>
      <label>Variable cost / unit<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>Fixed costs<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
    `;
  }

  if (moduleId === 'breakeven') {
    const state: BreakEvenInputState = service.getBreakEvenInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Unit price (minor)<input name="unitPriceMinor" type="number" value="${state.unitPriceMinor}" /></label>
      <label>Variable cost / unit<input name="variableCostPerUnitMinor" type="number" value="${state.variableCostPerUnitMinor}" /></label>
      <label>Fixed costs<input name="fixedCostsMinor" type="number" value="${state.fixedCostsMinor}" /></label>
      <label>Target profit<input name="targetProfitMinor" type="number" value="${state.targetProfitMinor}" /></label>
      <label>Planned quantity<input name="plannedQuantity" type="number" value="${state.plannedQuantity}" /></label>
    `;
  }

  if (moduleId === 'cashflow') {
    const state: CashflowInputState = service.getCashflowInputState(selectedScenario?.inputData);
    form.innerHTML = `
      <label>Scenario Name<input name="scenarioName" value="${selectedScenario?.scenarioName ?? state.scenarioName}" /></label>
      <label>Starting cash<input name="startingCashMinor" type="number" value="${state.startingCashMinor}" /></label>
      <label>Base revenue<input name="baseMonthlyRevenueMinor" type="number" value="${state.baseMonthlyRevenueMinor}" /></label>
      <label>Fixed monthly costs<input name="fixedMonthlyCostsMinor" type="number" value="${state.fixedMonthlyCostsMinor}" /></label>
      <label>Variable monthly costs<input name="variableMonthlyCostsMinor" type="number" value="${state.variableMonthlyCostsMinor}" /></label>
      <label>Months<input name="forecastMonths" type="number" value="${state.forecastMonths}" /></label>
      <label>Growth rate<input name="monthlyGrowthRate" type="number" step="0.01" value="${state.monthlyGrowthRate}" /></label>
    `;
  }

  form.appendChild(
    createActionButton('Save Scenario', async () => {
      const data = new FormData(form);

      if (moduleId === 'profit') {
        await service.saveProfitScenario({
          scenarioId: selectedScenario?.scenarioId,
          scenarioName: String(data.get('scenarioName') ?? ''),
          unitPriceMinor: parseNumber(String(data.get('unitPriceMinor') ?? '0'), 0),
          quantity: parseNumber(String(data.get('quantity') ?? '0'), 0),
          variableCostPerUnitMinor: parseNumber(String(data.get('variableCostPerUnitMinor') ?? '0'), 0),
          fixedCostsMinor: parseNumber(String(data.get('fixedCostsMinor') ?? '0'), 0)
        });
      }

      if (moduleId === 'breakeven') {
        await service.saveBreakEvenScenario({
          scenarioId: selectedScenario?.scenarioId,
          scenarioName: String(data.get('scenarioName') ?? ''),
          unitPriceMinor: parseNumber(String(data.get('unitPriceMinor') ?? '0'), 0),
          variableCostPerUnitMinor: parseNumber(String(data.get('variableCostPerUnitMinor') ?? '0'), 0),
          fixedCostsMinor: parseNumber(String(data.get('fixedCostsMinor') ?? '0'), 0),
          targetProfitMinor: parseNumber(String(data.get('targetProfitMinor') ?? '0'), 0),
          plannedQuantity: parseNumber(String(data.get('plannedQuantity') ?? '0'), 0)
        });
      }

      if (moduleId === 'cashflow') {
        await service.saveCashflowScenario({
          scenarioId: selectedScenario?.scenarioId,
          scenarioName: String(data.get('scenarioName') ?? ''),
          startingCashMinor: parseNumber(String(data.get('startingCashMinor') ?? '0'), 0),
          baseMonthlyRevenueMinor: parseNumber(String(data.get('baseMonthlyRevenueMinor') ?? '0'), 0),
          fixedMonthlyCostsMinor: parseNumber(String(data.get('fixedMonthlyCostsMinor') ?? '0'), 0),
          variableMonthlyCostsMinor: parseNumber(String(data.get('variableMonthlyCostsMinor') ?? '0'), 0),
          forecastMonths: parseNumber(String(data.get('forecastMonths') ?? '1'), 1),
          monthlyGrowthRate: parseNumber(String(data.get('monthlyGrowthRate') ?? '0'), 0)
        });
      }

      await render();
    }, 'primary form-submit')
  );

  center.appendChild(form);
  const ad = document.createElement('div');
  ad.className = 'ad-placeholder';
  ad.textContent = 'Ad block placeholder';
  center.appendChild(ad);

  const results = document.createElement('section');
  results.className = 'card';
  results.innerHTML = '<h3>Results</h3>';
  if (selectedScenario?.calculatedData) {
    const pre = document.createElement('pre');
    pre.className = 'results-json';
    pre.textContent = JSON.stringify(selectedScenario.calculatedData, null, 2);
    results.appendChild(pre);
  } else {
    results.appendChild(emptyState('No results yet', 'Save scenario to calculate outputs.'));
  }

  if (!allowed) {
    const overlay = document.createElement('div');
    overlay.className = 'locked-overlay';
    overlay.innerHTML = '<strong>This module requires an active subscription.</strong>';
    overlay.appendChild(createActionButton('Go to Subscription', () => goTo('/subscription'), 'primary'));
    overlay.appendChild(createActionButton('Back to Dashboard', () => goTo('/dashboard')));
    results.appendChild(overlay);
  }

  workspace.appendChild(listPanel);
  workspace.appendChild(center);
  workspace.appendChild(results);
  main.appendChild(workspace);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

const renderSubscription = (root: HTMLElement, service: WebAppService): void => {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/subscription'));
  const main = document.createElement('main');
  main.className = 'main';
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<h2>Subscription</h2><p>Monthly plans (Price TBD)</p>';

  const actions = document.createElement('div');
  actions.className = 'button-row';
  actions.appendChild(createActionButton('Activate Bundle (Local Mock)', () => {
    service.activateBundle();
    goTo('/dashboard');
  }, 'primary'));
  actions.appendChild(createActionButton('Refresh Subscription Status', () => goTo('/subscription')));

  card.appendChild(actions);
  main.appendChild(card);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

const renderDataBackup = async (root: HTMLElement, service: WebAppService): Promise<void> => {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/data'));

  const main = document.createElement('main');
  main.className = 'main';

  const title = document.createElement('h2');
  title.textContent = 'Data & Backup';

  const sections = document.createElement('div');
  sections.className = 'space-y-6';

  const exportButton = createActionButton('Export all scenarios (JSON)', async () => {
    const payload = await service.exportScenariosJson();
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'marginbase-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
    window.alert('Export completed.');
  }, 'primary');

  const importInput = document.createElement('textarea');
  importInput.placeholder = 'Paste import JSON here';
  importInput.rows = 10;

  const importSummary = document.createElement('div');
  importSummary.className = 'modal';

  const previewButton = createActionButton('Preview Import', () => {
    const preview = service.previewImport(importInput.value);
    if (!preview.ok) {
      importSummary.innerHTML = `<div class="inline-error"><strong>Preview failed.</strong> ${preview.errors[0]?.message ?? 'Import preview failed.'}</div>`;
      return;
    }

    importSummary.innerHTML = `
      <h3>Import Scenarios</h3>
      <p>Total: ${preview.summary.total}</p>
      <p>Profit: ${preview.summary.profit}</p>
      <p>Break-even: ${preview.summary.breakeven}</p>
      <p>Cashflow: ${preview.summary.cashflow}</p>
      <p><strong>This will replace all existing scenarios.</strong></p>
    `;
  });

  const confirmButton = createActionButton('Confirm Import (Replace all)', async () => {
    const result = service.previewImport(importInput.value);
    if (!result.ok) {
      window.alert('Import failed.');
      return;
    }

    await service.applyImport(result);
    window.alert('Import completed.');
    await render();
  }, 'primary');

  const exportCard = document.createElement('section');
  exportCard.className = 'card';
  exportCard.innerHTML = '<h3>Export</h3><p>Export all local scenarios to a JSON file.</p>';
  exportCard.appendChild(exportButton);

  const importCard = document.createElement('section');
  importCard.className = 'card';
  importCard.innerHTML = '<h3>Import</h3><p>Import scenarios from JSON. This replaces all existing scenarios.</p>';
  const importActions = document.createElement('div');
  importActions.className = 'button-row';
  importCard.appendChild(importInput);
  importActions.appendChild(previewButton);
  importActions.appendChild(confirmButton);
  importCard.appendChild(importActions);
  importCard.appendChild(importSummary);

  sections.appendChild(exportCard);
  sections.appendChild(importCard);

  main.appendChild(title);
  main.appendChild(sections);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

const renderSettings = async (root: HTMLElement, service: WebAppService): Promise<void> => {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.appendChild(renderSidebar('/settings'));
  const main = document.createElement('main');
  main.className = 'main';

  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = '<h2>Settings</h2><p>Account actions and future configuration options.</p>';

  const deleteAccountButton = createActionButton('Delete account data', async () => {
    const deleted = await service.deleteAccount('local_web_user');
    if (deleted) {
      window.alert('Account data deleted.');
      goTo('/login');
    }
  });

  card.appendChild(deleteAccountButton);
  main.appendChild(card);
  shell.appendChild(main);
  root.replaceChildren(shell);
};

const service = WebAppService.createDefault();

const render = async (): Promise<void> => {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  addBaseStyles();
  const route = getRoute();

  if (route === '/login') {
    renderLogin(root);
    return;
  }

  if (route === '/gate') {
    renderGate(root, service);
    return;
  }

  if (route === '/dashboard') {
    await renderDashboard(root, service);
    return;
  }

  if (route === '/profit' || route === '/break-even' || route === '/cashflow') {
    await renderWorkspace(root, service, route);
    return;
  }

  if (route === '/subscription') {
    renderSubscription(root, service);
    return;
  }

  if (route === '/data') {
    await renderDataBackup(root, service);
    return;
  }

  if (route === '/settings') {
    await renderSettings(root, service);
    return;
  }

  if (route === '/legal/privacy' || route === '/legal/terms') {
    renderLegal(root, route);
  }
};

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (!document.getElementById('app')) {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
  }

  window.addEventListener('hashchange', () => {
    void render();
  });

  if (!window.location.hash) {
    goTo('/login');
  }

  void render();
} else {
  console.log('Web app bundle built. Open in browser environment to run UI.');
}
