## Telemetry allowlist (v1)
- auth_login_success / auth_login_failure (reason code only)
- trial_started
- subscription_purchase_started / subscription_purchase_success / subscription_purchase_failed (reason code only)
- pricing_viewed (source)
- paywall_viewed (moduleId, source)
- locked_module_attempt (moduleId)
- checkout_abandoned (stage, reason)
- module_opened (moduleId)
- embed_opened (moduleId, poweredBy)
- embed_cta_clicked (moduleId)
- scenario_created / scenario_saved / scenario_deleted (moduleId only, no amounts)
- export_completed / import_completed / import_failed (reason code)
- app_crash (via crash SDK)

Consent policy:
- Non-essential analytics is OFF by default.
- Events are uploaded only when user enables telemetry consent in Settings.
