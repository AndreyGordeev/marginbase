
# Copilot Instructions — MarginBase (Strict)

You are implementing features in the MarginBase monorepo. Follow these rules.

## 1) Architectural non-negotiables
- Offline-first product: calculators must work without backend.
- Thin backend only for auth/entitlements/telemetry batching (no scenario values).
- **Never send financial values to cloud**, including telemetry, logs, analytics, errors, or embeds.
- All calculation formulas and numeric policy must live in `packages/domain-core`.
- UI must not re-implement formulas. UI calls domain-core functions.
- Storage access must go through `packages/storage` repositories/adapters.

## 2) Localization rules
- Localization (i18n) is **UI-only**: `apps/web`.
- `packages/domain-core` must not contain translated strings.
- Use current routing model:
  - internal app routes are language-aware (`/:lang/...`)
  - legacy public routes stay unprefixed (`/embed/*`, `/s/:token`)
- Supported langs: `en,de,fr,es,pl,it,ru`.
- Use `Intl.NumberFormat` for currency/number formatting.

## 3) Embeds and widgets
- iframe embed routes: `/embed/profit`, `/embed/breakeven`, `/embed/cashflow`.
- Embed language is controlled by i18n state/query (`lang`) and current provider, not by path segment.
- Inline widget bundle (`/widgets/marginbase.js`) is **planned**, not current baseline.

## 4) Privacy constraints (hard)
Forbidden anywhere outside local-only storage:
- revenue, costs, profit, margin, cashflow values
- scenario contents
- any user-entered monetary numbers

Telemetry allowed ONLY as aggregate counters:
- embed_loaded
- embed_open_full_version_click
- embed_copy_snippet_click

Planned-only counters (for future widget runtime):
- widget_loaded
- widget_open_full_version_click
- copy_snippet_click

Do not include input values or computed values in telemetry payloads.

If implementing telemetry, add runtime guard that rejects payloads containing forbidden keys.

## 5) Code quality expectations
- Prefer small, composable modules with clear boundaries.
- Add tests for:
  - language routing
  - embed mode restrictions
  - telemetry forbidden-key guard
- If implementing widgets in future phases, keep widget bundle lightweight with lazy-loaded translations.

## 6) Deliverables
Implement docs-defined features according to:
- `docs/architecture/INTERNATIONALIZATION_ARCHITECTURE.md`
- `docs/architecture/EMBED_CALCULATORS_ARCHITECTURE.md`
- `docs/architecture/WIDGET_SYSTEM_ARCHITECTURE.md`
- `docs/architecture/WIDGET_API_SPEC.md`
- `docs/architecture/OFFLINE_WIDGET_RUNTIME.md`

When docs describe future features, do not assume they already exist in runtime code unless implemented in the current branch.

When unsure: prioritize privacy, offline-first behavior, and domain-core ownership of math.
