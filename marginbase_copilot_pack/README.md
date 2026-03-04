
# MarginBase Copilot Pack

This archive contains Copilot-oriented implementation guidance.

## Current baseline (2026-03-04)
- i18n in `apps/web` with `i18next` + browser language detector
- Supported languages: `en,de,fr,es,pl,it,ru`
- Language-aware app routes (internal app pages use `/:lang/...`)
- Public legacy routes remain unprefixed:
	- embeds: `/embed/profit`, `/embed/breakeven`, `/embed/cashflow`
	- shared scenario: `/s/:token`
- Privacy rules: no financial values in backend/telemetry

Entry docs:
- `docs/architecture/*`
- `.github/copilot-instructions.md`
