## Telemetry allowlist (v1)

Source of truth: `packages/telemetry/src/index.ts` (`TELEMETRY_EVENT_ALLOWLIST` + `EVENT_ALLOWED_KEYS`).

### Event names (allowed)
- `app_opened`
- `auth_login_success`
- `auth_login_failure`
- `trial_started`
- `paywall_shown`
- `upgrade_clicked`
- `checkout_redirected`
- `purchase_confirmed`
- `subscription_purchase_started`
- `subscription_purchase_success`
- `subscription_purchase_failed`
- `module_opened`
- `embed_opened`
- `embed_cta_clicked`
- `export_clicked`
- `scenario_created`
- `scenario_saved`
- `scenario_deleted`
- `export_completed`
- `import_completed`
- `import_failed`
- `app_crash`

### Allowed properties per event
- `app_opened`: none
- `auth_login_success`: none
- `auth_login_failure`: `reasonCode`
- `trial_started`: none
- `paywall_shown`: `moduleId`
- `upgrade_clicked`: none
- `checkout_redirected`: none
- `purchase_confirmed`: `succeeded`
- `subscription_purchase_started`: none
- `subscription_purchase_success`: none
- `subscription_purchase_failed`: `reasonCode`
- `module_opened`: `moduleId`
- `embed_opened`: `moduleId`, `poweredBy`
- `embed_cta_clicked`: `moduleId`
- `export_clicked`: `format`
- `scenario_created`: `moduleId`
- `scenario_saved`: `moduleId`
- `scenario_deleted`: `moduleId`
- `export_completed`: none
- `import_completed`: none
- `import_failed`: `reasonCode`
- `app_crash`: `reasonCode`

### Global constraints
- Property values must be `string | boolean` only.
- `moduleId`, when present, must be one of: `profit`, `breakeven`, `cashflow`.
- Monetary-like keys are forbidden across all events (case-insensitive patterns): `amount`, `revenue`, `cost`, `price`, `money`, `profit`, `margin`, `cash`.
- Non-allowlisted property keys are rejected.
- Queue/batch byte-size accounting uses UTF-8 length and must support both Node and browser runtimes (Node `Buffer` when available, `TextEncoder` fallback in browser).

### Change checklist (new telemetry event)
1. Add event name to `TELEMETRY_EVENT_ALLOWLIST` in `packages/telemetry/src/index.ts`.
2. Add explicit allowed property keys in `EVENT_ALLOWED_KEYS`.
3. Ensure no key violates forbidden monetary patterns.
4. Add/adjust tests in `packages/telemetry/tests/telemetry-queue.test.ts`.
5. Update this document in the same PR.
