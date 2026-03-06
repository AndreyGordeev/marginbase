import type { LegalBackTarget } from '../legal/legal-render';
import { createLanguageSwitcher, translate } from '../../i18n';
import type { GoogleOAuthService } from '../../services/google-oauth-service';

type LoginRoute =
  | '/gate'
  | '/dashboard'
  | '/privacy'
  | '/terms'
  | '/legal-center';

type LoginRenderDeps = {
  createActionButton: (
    label: string,
    onClick: () => void,
    className?: string,
  ) => HTMLButtonElement;
  goTo: (route: LoginRoute) => void;
  setLegalBackTarget: (target: LegalBackTarget) => void;
  googleOAuthService?: GoogleOAuthService;
  onGoogleSignIn?: (idToken: string) => Promise<void>;
  apiBaseUrl?: string;
};

export const renderLoginPage = (
  root: HTMLElement,
  deps: LoginRenderDeps,
): void => {
  const {
    createActionButton,
    goTo,
    setLegalBackTarget,
    googleOAuthService,
    onGoogleSignIn,
  } = deps;

  const page = document.createElement('div');
  page.className = 'page-login';

  const wrap = document.createElement('div');
  wrap.className = 'login-wrap';

  const shell = document.createElement('div');
  shell.className = 'login-shell';

  const left = document.createElement('section');
  left.className = 'card login-panel';
  left.innerHTML = `
    <h1 class="login-heading">${translate('login.heading')}</h1>
    <p class="login-subheading">${translate('login.subheading')}</p>
    <ul class="login-values">
      <li>${translate('login.value1')}</li>
      <li>${translate('login.value2')}</li>
      <li>${translate('login.value3')}</li>
    </ul>
  `;

  const auth = document.createElement('div');
  auth.className = 'login-auth';
  auth.appendChild(createLanguageSwitcher());

  // Google OAuth button or fallback
  if (googleOAuthService) {
    const googleButtonContainer = document.createElement('div');
    googleButtonContainer.id = 'google-signin-button';
    googleButtonContainer.style.margin = '1rem 0';
    auth.appendChild(googleButtonContainer);

    // Initialize Google Sign-In button
    googleOAuthService.initializeButton(
      'google-signin-button',
      async (idToken: string) => {
        try {
          if (onGoogleSignIn) {
            await onGoogleSignIn(idToken);
            goTo('/gate');
          }
        } catch (error) {
          console.error('Google sign-in failed:', error);
          alert('Sign-in failed. Please try again.');
        }
      },
      (error: Error) => {
        console.error('Google button initialization failed:', error);
      },
    );
  } else {
    // Fallback path is development-only.
    // Production must not silently sign in with a local mock user.
    auth.appendChild(
      createActionButton(
        translate('login.continueWithGoogle'),
        () => {
          if (import.meta.env.DEV && typeof localStorage !== 'undefined') {
            localStorage.setItem('marginbase_signed_in', 'true');
            localStorage.setItem(
              'marginbase_signed_in_user_id',
              'local_web_user',
            );
            goTo('/gate');
            return;
          }

          window.alert(translate('subscription.signInRequired'));
        },
        'primary',
      ),
    );
  }

  auth.appendChild(
    createActionButton(translate('login.continueAsGuest'), () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('marginbase_signed_in', 'false');
        localStorage.removeItem('marginbase_signed_in_user_id');
      }

      goTo('/dashboard');
    }),
  );

  const trust = document.createElement('div');
  trust.className = 'login-trust';
  trust.innerHTML = `
    <div>${translate('login.trust1')}</div>
    <div>${translate('login.trust2')}</div>
    <div>${translate('login.trust3')}</div>
  `;

  left.appendChild(auth);
  left.appendChild(trust);

  const right = document.createElement('section');
  right.className = 'card login-preview';
  right.innerHTML = `
    <h3 class="preview-title">${translate('login.previewTitle')}</h3>
    <p class="preview-subtitle">${translate('login.previewSubtitle')}</p>
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
        <div class="preview-cta">${translate('login.previewCta')}</div>
      </div>
    </div>
  `;

  shell.appendChild(left);
  shell.appendChild(right);

  const legal = document.createElement('div');
  legal.className = 'login-legal';
  const privacyLink = document.createElement('button');
  privacyLink.className = 'link-muted';
  privacyLink.textContent = translate('legal.privacy');
  privacyLink.onclick = () => {
    setLegalBackTarget('/login');
    goTo('/privacy');
  };

  const termsLink = document.createElement('button');
  termsLink.className = 'link-muted';
  termsLink.textContent = translate('legal.terms');
  termsLink.onclick = () => {
    setLegalBackTarget('/login');
    goTo('/terms');
  };

  const legalCenterLink = document.createElement('button');
  legalCenterLink.className = 'link-muted';
  legalCenterLink.textContent = translate('legal.center');
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
