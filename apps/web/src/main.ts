import type { ModuleId } from '@marginbase/domain-core';
import { WebAppService, type BreakEvenInputState, type CashflowInputState, type ProfitInputState } from './web-app-service';

type RoutePath =
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

const ROUTES: RoutePath[] = [
  '/',
  '/login',
  '/gate',
  '/dashboard',
  '/profit',
  '/break-even',
  '/cashflow',
  '/subscription',
  '/data',
  '/settings',
  '/terms',
  '/privacy',
  '/legal',
  '/cancellation',
  '/refund',
  '/cookies',
  '/legal-center',
  '/legal/privacy',
  '/legal/terms'
];

const getRoute = (): RoutePath => {
  const hash = window.location.hash.replace('#', '') as RoutePath;
  if (ROUTES.includes(hash)) {
    return hash;
  }

  const path = window.location.pathname as RoutePath;
  return ROUTES.includes(path) ? path : '/login';
};

const goTo = (route: RoutePath): void => {
  window.location.hash = route;
};

type LegalRoute = '/terms' | '/privacy' | '/legal' | '/cancellation' | '/refund' | '/cookies';

const LEGAL_DOCS: Record<LegalRoute, string> = {
  '/terms': `# Terms of Service

**Effective Date:** 2026-03-03

These Terms of Service ("Terms") govern access to and use of the SMB Finance Toolkit ("Service"). By accessing or using the Service, you agree to be bound by these Terms.

------------------------------------------------------------------------

## 1. Service Provider

The Service is operated by:

**Andrii Gordieiev**
Sole Trader (Jednoosobowa Działalność Gospodarcza)
Address: Przyjaźni Polsko-Węgierskiej 6A/102, 30-644 Kraków, Poland
NIP: 6793258209
VAT ID: PL6793258209
Contact: andrii.gordieiev@gmail.com

The Service is operated under Polish law.

------------------------------------------------------------------------

## 2. Description of the Service

SMB Finance Toolkit provides digital financial calculation and modeling tools, including:

- Profit and margin calculations
- Break-even analysis
- Cashflow forecasting

The Service may operate partially or fully offline using local computation engines.

We reserve the right to modify, suspend, or discontinue features where legally permitted.

------------------------------------------------------------------------

## 3. No Financial, Legal, or Tax Advice

The Service provides calculation tools for informational purposes only.

The Service does NOT provide:

- Financial advice
- Investment advice
- Tax advice
- Accounting advice
- Legal advice

Nothing within the Service constitutes professional advice under Polish or EU law.

Users are solely responsible for verifying outputs and consulting qualified professionals before making financial decisions.

Use of the Service does not create a fiduciary, advisory, or professional-client relationship.

------------------------------------------------------------------------

## 4. Free Trial and Subscription Model

The Service is provided on a subscription basis.

### 4.1 Free Trial

A one-month free trial may be offered.
Payment details (credit or debit card) are required to activate the trial.

By starting a trial, you:

- Explicitly request immediate access to digital content, and
- Acknowledge that upon full performance of the digital service, your 14-day withdrawal right may be lost in accordance with EU consumer law.

If not cancelled before the end of the trial period, the subscription automatically converts into a paid subscription.

### 4.2 Auto-Renewal

Subscriptions automatically renew at the end of each billing period unless cancelled prior to renewal.

Cancellation can be performed through:

- The web account dashboard (if subscribed via Stripe), or
- The respective app marketplace (App Store / Google Play).

For subscriptions purchased via Apple App Store or Google Play, billing and cancellation are governed by the respective platform's terms.

------------------------------------------------------------------------

## 5. Consumer Rights (EU & Poland)

If you are a consumer within the meaning of EU or Polish law:

- You may have a 14-day right of withdrawal for digital services, unless performance has begun with your express consent and acknowledgment of loss of that right.
- Mandatory consumer protection provisions cannot be excluded.

Business users are not entitled to consumer withdrawal rights.

------------------------------------------------------------------------

## 6. Fees and VAT

All prices are displayed including VAT where applicable, in accordance with Polish and EU VAT regulations.

As a VAT-registered business (VAT czynny), VAT is applied in compliance with EU VAT rules.

We reserve the right to change pricing with prior notice.

------------------------------------------------------------------------

## 7. Accuracy Disclaimer

All outputs depend entirely on user-provided data.

We do not guarantee:

- Accuracy of calculations
- Suitability for a specific business purpose
- Continuous or uninterrupted availability

Users assume full responsibility for decisions made based on Service outputs.

------------------------------------------------------------------------

## 8. Intellectual Property

All intellectual property rights in the Service, including software, algorithms, branding, and design, remain the exclusive property of the Service Provider.

Users are granted a limited, non-exclusive, non-transferable license to use the Service.

Users MAY:

- Use calculation results for personal or commercial purposes
- Include generated outputs in reports, presentations, or business documentation

Users MAY NOT:

- Resell or sublicense access to the Service
- Copy, reproduce, or distribute the software
- Reverse engineer, decompile, or attempt to extract source code
- Bypass payment systems or entitlement controls

------------------------------------------------------------------------

## 9. Limitation of Liability

To the maximum extent permitted by Polish and EU law, the Service Provider shall not be liable for:

- Loss of profit
- Business interruption
- Indirect or consequential damages
- Financial losses resulting from decisions based on calculations
- Data loss not caused by gross negligence

Nothing in these Terms excludes liability for:

- Death or personal injury caused by negligence
- Fraud or fraudulent misrepresentation
- Mandatory consumer rights under applicable law

Where liability may be limited, total liability shall not exceed the total subscription fees paid by the user in the preceding 12 months.

------------------------------------------------------------------------

## 10. Data Protection

Processing of personal data is governed by the Privacy Policy and complies with:

- Regulation (EU) 2016/679 (GDPR)
- Polish data protection laws

------------------------------------------------------------------------

## 11. Termination

We may suspend or terminate access for:

- Violation of these Terms
- Misuse of the Service
- Legal obligations

Users may discontinue use at any time.

------------------------------------------------------------------------

## 12. Governing Law and Jurisdiction

These Terms are governed by the laws of Poland.

For consumers, mandatory consumer protection provisions of their country of residence apply where required by EU law.

Disputes shall be resolved before competent courts in Poland, without prejudice to mandatory consumer jurisdiction rights.

------------------------------------------------------------------------

## 13. Force Majeure

The Service Provider shall not be liable for failure to perform due to events beyond reasonable control.

------------------------------------------------------------------------

## 14. Severability

If any provision of these Terms is found invalid, the remaining provisions remain in effect.

------------------------------------------------------------------------

## 15. Amendments

We may update these Terms from time to time.

Continued use of the Service after updates constitutes acceptance of revised Terms.

------------------------------------------------------------------------

By using the Service, you confirm that you have read, understood, and agreed to these Terms.
`,
  '/privacy': `# Privacy Policy

**Effective Date:** 2026-03-03

This Privacy Policy explains how personal data is processed in connection with the SMB Finance Toolkit ("Service").

The Service complies with:

- Regulation (EU) 2016/679 (General Data Protection Regulation -- GDPR)
- Polish data protection laws

By using the Service, you acknowledge this Privacy Policy.

------------------------------------------------------------------------

## 1. Data Controller

The Data Controller is:

**Andrii Gordieiev**
Sole Trader (Jednoosobowa Działalność Gospodarcza)
Address: Przyjaźni Polsko-Węgierskiej 6A/102, 30-644 Kraków, Poland
NIP: 6793258209
VAT ID: PL6793258209
Email: andrii.gordieiev@gmail.com

------------------------------------------------------------------------

## 2. Categories of Personal Data Processed

Depending on usage, the following categories of personal data may be processed:

### 2.1 Account & Identity Data

- Name (if provided)
- Email address
- Authentication provider identifier (e.g., Google ID)
- Account ID

### 2.2 Subscription & Billing Data

- Subscription status
- Entitlement metadata
- Billing identifiers (processed via third-party payment providers)

### 2.3 Technical & Security Data

- IP address
- Device/browser metadata
- Log data necessary for service security

### 2.4 Financial Modeling Data

Financial scenario inputs and calculation data remain stored locally on the user's device unless explicitly exported by the user.

The Service does not store or access local financial scenario values on backend servers.

------------------------------------------------------------------------

## 3. Legal Basis for Processing (GDPR Art. 6)

Personal data is processed under the following legal bases:

- Performance of a contract (Art. 6(1)(b)) -- account creation, subscription access
- Legal obligation (Art. 6(1)(c)) -- tax and accounting compliance
- Legitimate interests (Art. 6(1)(f)) -- service security, fraud prevention
- Consent (Art. 6(1)(a)) -- where required (e.g., optional analytics)

------------------------------------------------------------------------

## 4. Purpose of Processing

Personal data is processed to:

- Provide access to the Service
- Manage subscriptions and trial activation
- Process payments and billing
- Ensure platform security
- Comply with legal obligations

Personal data is not sold.

------------------------------------------------------------------------

## 5. Payment & Platform Processors

Payments may be processed by:

- Stripe (for web subscriptions)
- Apple App Store
- Google Play Store

When subscribing via Apple or Google platforms, billing data is processed directly by the respective platform under their own privacy policies.

------------------------------------------------------------------------

## 6. Data Retention

Personal data is retained only as long as necessary:

- Account data: for the duration of account activity
- Billing data: as required by Polish tax law
- Security logs: limited retention for security purposes

Upon account deletion, personal data is deleted or anonymized unless retention is required by law.

Local financial data remains solely on the user's device.

------------------------------------------------------------------------

## 7. Data Sharing

Personal data may be shared with:

- Hosting infrastructure providers (EU-based where applicable)
- Authentication providers (e.g., Google)
- Payment processors (Stripe, Apple, Google)
- Legal authorities when required by law

Data Processing Agreements (DPAs) are in place where required.

Personal data is not transferred outside the European Economic Area (EEA) without appropriate safeguards (e.g., Standard Contractual Clauses).

------------------------------------------------------------------------

## 8. Data Security

Appropriate technical and organizational measures are implemented, including:

- TLS encryption in transit
- Restricted access controls
- Infrastructure-level monitoring
- Minimal data processing architecture

Users are responsible for securing their own devices and locally stored data.

------------------------------------------------------------------------

## 9. Your GDPR Rights

Under GDPR, you have the right to:

- Access your personal data
- Rectify inaccurate data
- Request erasure
- Restrict processing
- Object to processing
- Data portability
- Withdraw consent where applicable
- Lodge a complaint with a supervisory authority

Requests may be submitted to: andrii.gordieiev@gmail.com

In Poland, the supervisory authority is the President of the Personal Data Protection Office (UODO).

------------------------------------------------------------------------

## 10. Automated Decision-Making

The Service does not conduct automated decision-making producing legal or similarly significant effects within the meaning of Article 22 GDPR.

------------------------------------------------------------------------

## 11. Cookies

Essential cookies may be used for authentication and security purposes.

If analytics or non-essential cookies are introduced, explicit consent will be obtained where required by law.

------------------------------------------------------------------------

## 12. Children's Data

The Service is not intended for individuals under 18 years of age.

Personal data of minors is not knowingly collected.

------------------------------------------------------------------------

## 13. Changes to This Policy

This Privacy Policy may be updated from time to time.

Material changes will be communicated appropriately.

Continued use of the Service after updates constitutes acceptance of the revised Policy.

------------------------------------------------------------------------

By using the Service, you confirm that you have read and understood this Privacy Policy.
`,
  '/legal': `# Legal Notice

Service Provider:

Andrii Gordieiev
Jednoosobowa Działalność Gospodarcza
Przyjaźni Polsko-Węgierskiej 6A/102
30-644 Kraków, Poland

NIP: 6793258209
VAT ID: PL6793258209

Contact: andrii.gordieiev@gmail.com

The Service is operated under Polish law.
`,
  '/cancellation': `# Cancellation & Withdrawal Policy

**Effective Date:** 2026-03-03

This policy applies to subscriptions for SMB Finance Toolkit.

## 1. Right of Withdrawal (EU Consumers)

If you are a consumer within the European Union, you have the right to withdraw from a digital services contract within 14 days without giving any reason.

However, by starting a free trial or subscription that provides immediate access to digital content, you:

- Explicitly request immediate performance of the digital service; and
- Acknowledge that you may lose your right of withdrawal once the service has been fully performed.

If the service has not been fully performed, you may withdraw within 14 days by contacting: andrii.gordieiev@gmail.com

## 2. Cancellation of Subscription

Subscriptions renew automatically unless cancelled before the renewal date.

You may cancel:

- Via your web account dashboard (Stripe subscriptions); or
- Through Apple App Store or Google Play subscription settings.

Cancellation prevents future charges but does not refund past billing periods unless required by law.

## 3. Effect of Cancellation

After cancellation:
- Access remains active until the end of the current billing period.
- No further charges will occur.
`,
  '/refund': `# Refund Policy

**Effective Date:** 2026-03-03

## 1. General Rule

Subscription fees are non-refundable once a billing period has started, except where required by applicable EU or Polish consumer protection law.

## 2. Free Trial

If a subscription is not cancelled before the end of the free trial period, it automatically converts into a paid subscription and the first billing cycle begins.

Charges after trial conversion are non-refundable unless legally required.

## 3. App Store / Google Play Purchases

Refunds for subscriptions purchased via Apple App Store or Google Play are governed exclusively by the policies of the respective platform.

## 4. Chargebacks

Improper chargebacks may result in account suspension.
`,
  '/cookies': `# Cookie Policy

**Effective Date:** 2026-03-03

## 1. Essential Cookies

The Service uses essential cookies necessary for authentication, session management, and security.

These cookies cannot be disabled as they are required for operation.

## 2. Analytics & Optional Cookies

If analytics or tracking tools are introduced, explicit consent will be requested in accordance with EU ePrivacy and GDPR requirements.

## 3. Cookie Management

Users may manage cookies via browser settings.

Any future implementation of non-essential cookies will require prior consent.
`
};

const setLegalBackTarget = (target: '/login' | '/' | '/legal-center'): void => {
  window.sessionStorage.setItem('legal-back-target', target);
};

const resolveLegalBackTarget = (): RoutePath => {
  const value = window.sessionStorage.getItem('legal-back-target');
  window.sessionStorage.removeItem('legal-back-target');
  if (value === '/login') {
    return '/login';
  }

  if (value === '/legal-center') {
    return '/legal-center';
  }

  return '/';
};

const renderMarkdownSafe = (markdown: string): HTMLElement => {
  const article = document.createElement('article');
  article.className = 'legal-markdown';

  let list: HTMLUListElement | null = null;
  const lines = markdown.split('\n');

  const closeList = (): void => {
    if (list) {
      article.appendChild(list);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      continue;
    }

    if (line === '---' || line === '------------------------------------------------------------------------') {
      closeList();
      article.appendChild(document.createElement('hr'));
      continue;
    }

    if (line.startsWith('- ')) {
      if (!list) {
        list = document.createElement('ul');
      }
      const li = document.createElement('li');
      li.textContent = line.slice(2);
      list.appendChild(li);
      continue;
    }

    closeList();

    if (line.startsWith('### ')) {
      const h3 = document.createElement('h3');
      h3.textContent = line.slice(4);
      article.appendChild(h3);
      continue;
    }

    if (line.startsWith('## ')) {
      const h2 = document.createElement('h2');
      h2.textContent = line.slice(3);
      article.appendChild(h2);
      continue;
    }

    if (line.startsWith('# ')) {
      const h1 = document.createElement('h1');
      h1.textContent = line.slice(2);
      article.appendChild(h1);
      continue;
    }

    const paragraph = document.createElement('p');
    paragraph.textContent = line.replace(/\*\*/g, '');
    article.appendChild(paragraph);
  }

  closeList();
  return article;
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
  .login-wrap { width: min(1120px, 100%); display: grid; gap: 12px; }
  .login-shell { width: 100%; display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 18px; align-items: stretch; }
  .login-panel, .login-preview { box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08); }
  .login-panel { display: grid; gap: 10px; padding: 24px; }
  .login-heading { margin: 0; font-size: 34px; line-height: 1.15; }
  .login-subheading { margin: 0; color: #374151; font-size: 18px; line-height: 1.35; }
  .login-values { margin: 2px 0 0; padding-left: 20px; display: grid; gap: 4px; }
  .login-values li { color: #1f2937; line-height: 1.25; }
  .login-auth { display: grid; gap: 8px; justify-items: start; margin-top: 2px; }
  .login-auth button { width: auto; min-width: 176px; height: 42px; padding: 0 14px; font-size: 14px; font-weight: 600; line-height: 1; border-radius: 10px; }
  .login-trust { display: grid; gap: 4px; color: #4b5563; font-size: 13px; line-height: 1.3; }
  .login-legal { border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; gap: 8px; align-items: center; color: #6b7280; font-size: 13px; }
  .login-legal-sep { color: #9ca3af; }
  .link-muted { background: transparent; border: 0; padding: 0; margin: 0; color: #6b7280; font-size: 13px; text-decoration: none; }
  .link-muted:hover { text-decoration: underline; }
  .login-preview { padding: 20px; display: grid; gap: 12px; }
  .preview-title { margin: 0; font-size: 18px; }
  .preview-subtitle { margin: 0; color: #6b7280; font-size: 13px; }
  .preview-surface { border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; padding: 12px; display: grid; gap: 10px; }
  .preview-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .preview-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; display: grid; gap: 4px; }
  .preview-kpi-label { font-size: 12px; color: #6b7280; }
  .preview-kpi-value { font-size: 30px; line-height: 1; font-weight: 600; color: #111827; letter-spacing: -0.02em; }
  .preview-kpi-delta { font-size: 12px; color: #16a34a; }
  .preview-chart { height: 118px; border-radius: 8px; border: 1px solid #dbeafe; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%); }
  .preview-chart svg { width: 100%; height: 100%; display: block; }
  .preview-calc { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; display: grid; gap: 8px; }
  .preview-row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: #374151; }
  .preview-field { display: flex; justify-content: space-between; align-items: center; border: 1px solid #e5e7eb; border-radius: 6px; background: #f9fafb; padding: 6px 8px; font-size: 12px; color: #6b7280; }
  .preview-field strong { color: #111827; font-size: 13px; }
  .preview-result { border: 1px solid #bfdbfe; border-radius: 6px; background: #eff6ff; padding: 8px; display: flex; justify-content: space-between; align-items: center; }
  .preview-result strong { font-size: 20px; color: #1d4ed8; }
  .preview-cta { height: 30px; border-radius: 6px; background: #2563eb; color: #fff; display: grid; place-items: center; font-size: 12px; }
  @media (max-width: 940px) {
    .login-shell { grid-template-columns: 1fr; }
    .login-wrap { gap: 10px; }
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
  .legal-page { padding: 12px 20px 28px; }
  .legal-container { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; }
  .legal-back { display: inline-block; margin-bottom: 10px; color: #4b5563; text-decoration: none; font-size: 13px; }
  .legal-back:hover { text-decoration: underline; }
  .legal-markdown { max-width: 760px; line-height: 1.6; }
  .legal-markdown h1 { margin: 0 0 10px; font-size: 30px; }
  .legal-markdown h2 { margin: 18px 0 8px; font-size: 20px; }
  .legal-markdown h3 { margin: 12px 0 6px; font-size: 16px; }
  .legal-markdown p { margin: 8px 0; }
  .legal-markdown ul { margin: 8px 0 8px 18px; padding: 0; }
  .legal-markdown hr { border: 0; border-top: 1px solid #e5e7eb; margin: 14px 0; }
  .legal-links { margin: 6px 0 0 18px; display: grid; gap: 6px; }
  .legal-links a { color: #374151; text-decoration: none; }
  .legal-links a:hover { text-decoration: underline; }
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

const renderLegalDocument = (root: HTMLElement, route: LegalRoute): void => {
  const page = document.createElement('div');
  page.className = 'legal-page';

  const container = document.createElement('div');
  container.className = 'legal-container';

  const back = document.createElement('a');
  back.href = '#';
  back.className = 'legal-back';
  back.textContent = '← Back';
  back.onclick = (event) => {
    event.preventDefault();
    goTo(resolveLegalBackTarget());
  };

  container.appendChild(back);
  container.appendChild(renderMarkdownSafe(LEGAL_DOCS[route]));
  page.appendChild(container);
  root.replaceChildren(page);
};

const renderLegalCenter = (root: HTMLElement): void => {
  const page = document.createElement('div');
  page.className = 'legal-page';

  const container = document.createElement('div');
  container.className = 'legal-container';

  const back = document.createElement('a');
  back.href = '#';
  back.className = 'legal-back';
  back.textContent = '← Back';
  back.onclick = (event) => {
    event.preventDefault();
    goTo(resolveLegalBackTarget());
  };

  const heading = document.createElement('h1');
  heading.textContent = 'Legal documents';

  const list = document.createElement('ul');
  list.className = 'legal-links';

  const entries: Array<{ label: string; route: LegalRoute }> = [
    { label: 'Terms of Service', route: '/terms' },
    { label: 'Privacy Policy', route: '/privacy' },
    { label: 'Cancellation & Withdrawal', route: '/cancellation' },
    { label: 'Refund Policy', route: '/refund' },
    { label: 'Cookie Policy', route: '/cookies' },
    { label: 'Legal Notice', route: '/legal' }
  ];

  for (const entry of entries) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = entry.label;
    link.onclick = (event) => {
      event.preventDefault();
      setLegalBackTarget('/legal-center');
      goTo(entry.route);
    };
    item.appendChild(link);
    list.appendChild(item);
  }

  container.appendChild(back);
  container.appendChild(heading);
  container.appendChild(list);
  page.appendChild(container);
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

  const disclosure = document.createElement('div');
  disclosure.className = 'inline-error';
  disclosure.innerHTML = '<p>Free trial requires a payment method.</p><p>After the trial, your subscription renews automatically unless cancelled.</p>';

  const disclosureLinks = document.createElement('div');
  disclosureLinks.className = 'button-row';
  const termsLink = document.createElement('button');
  termsLink.className = 'link-muted';
  termsLink.textContent = 'Terms';
  termsLink.onclick = () => {
    setLegalBackTarget('/');
    goTo('/terms');
  };

  const cancellationLink = document.createElement('button');
  cancellationLink.className = 'link-muted';
  cancellationLink.textContent = 'Cancellation';
  cancellationLink.onclick = () => {
    setLegalBackTarget('/');
    goTo('/cancellation');
  };

  disclosureLinks.appendChild(termsLink);
  disclosureLinks.appendChild(cancellationLink);

  card.appendChild(actions);
  card.appendChild(disclosure);
  card.appendChild(disclosureLinks);
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

  const legalCard = document.createElement('div');
  legalCard.className = 'card';
  legalCard.innerHTML = '<h3>Legal</h3>';

  const legalLinks = document.createElement('ul');
  legalLinks.className = 'legal-links';
  const settingsEntries: Array<{ label: string; route: LegalRoute }> = [
    { label: 'Terms of Service', route: '/terms' },
    { label: 'Privacy Policy', route: '/privacy' },
    { label: 'Cancellation & Withdrawal', route: '/cancellation' },
    { label: 'Refund Policy', route: '/refund' },
    { label: 'Legal Notice', route: '/legal' },
    { label: 'Cookie Policy', route: '/cookies' }
  ];

  for (const entry of settingsEntries) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = entry.label;
    link.onclick = (event) => {
      event.preventDefault();
      setLegalBackTarget('/');
      goTo(entry.route);
    };
    item.appendChild(link);
    legalLinks.appendChild(item);
  }

  legalCard.appendChild(legalLinks);
  main.appendChild(card);
  main.appendChild(legalCard);
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

  if (route === '/' || route === '/login') {
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

  if (route === '/legal-center') {
    renderLegalCenter(root);
    return;
  }

  const legalRouteMap: Record<RoutePath, LegalRoute | null> = {
    '/': null,
    '/login': null,
    '/gate': null,
    '/dashboard': null,
    '/profit': null,
    '/break-even': null,
    '/cashflow': null,
    '/subscription': null,
    '/data': null,
    '/settings': null,
    '/terms': '/terms',
    '/privacy': '/privacy',
    '/legal': '/legal',
    '/cancellation': '/cancellation',
    '/refund': '/refund',
    '/cookies': '/cookies',
    '/legal-center': null,
    '/legal/privacy': '/privacy',
    '/legal/terms': '/terms'
  };

  const mappedLegalRoute = legalRouteMap[route];
  if (mappedLegalRoute) {
    renderLegalDocument(root, mappedLegalRoute);
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
    const path = window.location.pathname as RoutePath;
    if (!ROUTES.includes(path)) {
      goTo('/login');
    }
  }

  void render();
} else {
  console.log('Web app bundle built. Open in browser environment to run UI.');
}
