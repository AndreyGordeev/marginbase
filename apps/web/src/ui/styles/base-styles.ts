export const addBaseStyles = (): void => {
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
  .login-panel { display: flex; flex-direction: column; align-items: flex-start; gap: 0; padding: 24px; }
  .login-heading { margin: 0 0 10px; font-size: 34px; line-height: 1.15; }
  .login-subheading { margin: 0 0 16px; color: #374151; font-size: 18px; line-height: 1.35; }
  .login-values { margin: 0 0 18px; padding-left: 20px; display: grid; gap: 6px; }
  .login-values li { color: #1f2937; line-height: 1.28; margin: 0; }
  .login-auth { display: grid; gap: 8px; justify-items: start; margin: 0 0 16px; }
  .login-auth button { width: auto; min-width: 176px; height: 42px; padding: 0 14px; font-size: 14px; font-weight: 600; line-height: 1; border-radius: 10px; }
  .login-trust { display: grid; gap: 6px; color: #4b5563; font-size: 13px; line-height: 1.35; }
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
  .auth-card { width: min(700px, calc(100vw - 48px)); padding: 22px; display: grid; gap: 12px; }
  .auth-copy { display: grid; gap: 6px; max-width: 560px; }
  .auth-copy h2, .auth-copy p { margin: 0; }
  .auth-copy h2 { font-size: 28px; line-height: 1.2; }
  .auth-copy p { font-size: 16px; line-height: 1.4; color: #374151; max-width: 460px; }
  .auth-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .auth-actions button { min-height: 42px; padding: 0 14px; font-size: 14px; }
  .app-header { grid-column: 1 / -1; background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
  .app-logo { font-weight: 600; font-size: 18px; color: #111827; }
  .app-header-controls { display: flex; gap: 12px; align-items: center; }
  .app-header select { padding: 6px 10px; font-size: 14px; }
  .shell { display: grid; grid-template-columns: 220px 1fr; grid-template-rows: auto 1fr; min-height: 100vh; }
  .sidebar { background: #111827; color: #f9fafb; padding: 16px; display: flex; flex-direction: column; gap: 8px; grid-row: 2; }
  .sidebar button { text-align: left; background: #1f2937; color: #f9fafb; border: 0; padding: 10px; border-radius: 8px; }
  .main { padding: 24px; display: grid; gap: 16px; align-content: start; grid-row: 2; }
  .card { background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 16px; }
  .workspace { display: grid; grid-template-columns: 260px 1fr 320px; gap: 16px; align-items: start; }
  .scenario-list { display: flex; flex-direction: column; gap: 8px; }
  .scenario-list h3 { margin: 0; }
  .scenario-create { align-self: flex-start; padding: 8px 12px; }
  .scenario-item { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; }
  .scenario-item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .scenario-item button { padding: 6px 10px; flex-shrink: 0; }
  .scenario-item-active { background: #eff6ff; border-color: #3b82f6; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-grid label { display: grid; gap: 6px; }
  .form-inline-error { grid-column: 1 / -1; margin: 0; overflow-wrap: anywhere; }
  .form-submit { grid-column: 1 / -1; justify-self: end; min-width: 180px; }
  .button-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .inline-error { border: 1px solid #fdba74; border-radius: 8px; background: #fff7ed; color: #9a3412; padding: 10px; }
  input:not([type="checkbox"]):not([type="radio"]), select, textarea { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
  button { cursor: pointer; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 10px; background: #fff; }
  .primary { background: #2563eb; color: #fff; border-color: #2563eb; }
  .warning-banner { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; padding: 10px; border-radius: 8px; }
  .empty-state, .system-error-card { background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 12px; text-align: center; }
  .locked-overlay { margin-top: 12px; padding: 12px; border: 1px dashed #f59e0b; border-radius: 8px; background: #fffbeb; display: grid; gap: 10px; align-items: start; }
  .locked-overlay strong { display: block; color: #111827; }
  .status { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .ad-placeholder { margin-top: 12px; border: 1px dashed #d1d5db; border-radius: 10px; background: #f9fafb; color: #6b7280; text-align: center; padding: 14px; font-size: 14px; }
  .results-json { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
  .results-panel { display: grid; gap: 14px; }
  .results-summary { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb; display: grid; gap: 8px; }
  .results-summary-label { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
  .results-summary-value { font-size: 34px; font-weight: 700; line-height: 1; }
  .results-summary-status { font-size: 14px; font-weight: 600; }
  .results-secondary-lines { display: grid; gap: 6px; }
  .results-secondary-lines div { display: flex; justify-content: space-between; gap: 10px; font-size: 14px; }
  .results-secondary-lines span { color: #4b5563; }
  .results-secondary-lines strong { color: #111827; }
  .results-metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
  .results-metric-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #fff; display: grid; gap: 6px; }
  .results-metric-label { color: #6b7280; font-size: 12px; overflow-wrap: anywhere; }
  .results-metric-value { font-size: clamp(18px, 2vw, 22px); line-height: 1.1; font-weight: 600; overflow-wrap: anywhere; }
  .metric-positive { color: #166534; }
  .metric-negative { color: #991b1b; }
  .metric-neutral { color: #1f2937; }
  .results-warnings { border: 1px solid #fdba74; border-radius: 10px; background: #fff7ed; padding: 10px; }
  .results-warnings h4 { margin: 0 0 8px; font-size: 14px; color: #9a3412; }
  .results-warning-list { margin: 0; padding-left: 18px; color: #9a3412; display: grid; gap: 4px; }
  .results-debug-toggle { display: flex; align-items: center; gap: 8px; color: #6b7280; font-size: 13px; margin-top: 8px; }
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
