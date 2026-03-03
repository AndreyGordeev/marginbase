import type { LegalBackTarget } from '../legal/legal-render';

type LoginRoute = '/gate' | '/privacy' | '/terms' | '/legal-center';

type LoginRenderDeps = {
  createActionButton: (label: string, onClick: () => void, className?: string) => HTMLButtonElement;
  goTo: (route: LoginRoute) => void;
  setLegalBackTarget: (target: LegalBackTarget) => void;
};

export const renderLoginPage = (root: HTMLElement, deps: LoginRenderDeps): void => {
  const { createActionButton, goTo, setLegalBackTarget } = deps;

  const page = document.createElement('div');
  page.className = 'page-login';

  const wrap = document.createElement('div');
  wrap.className = 'login-wrap';

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
  `;

  left.appendChild(auth);
  left.appendChild(trust);

  const right = document.createElement('section');
  right.className = 'card login-preview';
  right.innerHTML = `
    <h3 class="preview-title">Product Preview</h3>
    <p class="preview-subtitle">Live calculations, structured insights, no spreadsheet chaos.</p>
    <div class="preview-surface">
      <div class="preview-kpis">
        <div class="preview-kpi"><span class="preview-kpi-label">Margin</span><span class="preview-kpi-value">31.8%</span><span class="preview-kpi-delta">↑ 2.1%</span></div>
        <div class="preview-kpi"><span class="preview-kpi-label">Break-even</span><span class="preview-kpi-value">174</span><span class="preview-kpi-delta">units</span></div>
        <div class="preview-kpi"><span class="preview-kpi-label">Cash Runway</span><span class="preview-kpi-value">5.4</span><span class="preview-kpi-delta">months</span></div>
      </div>
      <div class="preview-chart">
        <svg viewBox="0 0 320 118" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="previewArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.45" />
              <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.05" />
            </linearGradient>
          </defs>
          <path d="M0 94 C45 82, 90 68, 130 72 C175 76, 220 58, 260 48 C285 42, 305 32, 320 28 L320 118 L0 118 Z" fill="url(#previewArea)"/>
          <path d="M0 94 C45 82, 90 68, 130 72 C175 76, 220 58, 260 48 C285 42, 305 32, 320 28" stroke="#2563eb" stroke-width="3" fill="none" stroke-linecap="round"/>
          <circle cx="90" cy="68" r="4" fill="#2563eb"/>
          <circle cx="220" cy="58" r="4" fill="#2563eb"/>
          <circle cx="305" cy="32" r="4" fill="#2563eb"/>
        </svg>
      </div>
      <div class="preview-calc">
        <div class="preview-field"><span>Revenue</span><strong>120,000</strong></div>
        <div class="preview-field"><span>Costs</span><strong>82,000</strong></div>
        <div class="preview-result"><span>Margin</span><strong>31.8%</strong></div>
        <div class="preview-cta">Open Profit Calculator</div>
      </div>
    </div>
  `;

  shell.appendChild(left);
  shell.appendChild(right);

  const legal = document.createElement('div');
  legal.className = 'login-legal';
  const privacyLink = document.createElement('button');
  privacyLink.className = 'link-muted';
  privacyLink.textContent = 'Privacy Policy';
  privacyLink.onclick = () => {
    setLegalBackTarget('/login');
    goTo('/privacy');
  };

  const termsLink = document.createElement('button');
  termsLink.className = 'link-muted';
  termsLink.textContent = 'Terms of Service';
  termsLink.onclick = () => {
    setLegalBackTarget('/login');
    goTo('/terms');
  };

  const legalCenterLink = document.createElement('button');
  legalCenterLink.className = 'link-muted';
  legalCenterLink.textContent = 'Legal Center';
  legalCenterLink.onclick = () => {
    setLegalBackTarget('/login');
    goTo('/legal-center');
  };

  const separatorLeft = document.createElement('span');
  separatorLeft.className = 'login-legal-sep';
  separatorLeft.textContent = '·';

  const separatorRight = document.createElement('span');
  separatorRight.className = 'login-legal-sep';
  separatorRight.textContent = '·';

  legal.appendChild(privacyLink);
  legal.appendChild(separatorLeft);
  legal.appendChild(termsLink);
  legal.appendChild(separatorRight);
  legal.appendChild(legalCenterLink);

  wrap.appendChild(shell);
  wrap.appendChild(legal);
  page.appendChild(wrap);
  root.replaceChildren(page);
};