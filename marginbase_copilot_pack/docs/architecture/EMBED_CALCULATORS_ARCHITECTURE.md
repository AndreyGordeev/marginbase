
# MarginBase — Embed Calculators Architecture (iframe)

**Status:** Implemented baseline (2026-03-04)

## Supported calculators
- `profit`
- `breakeven`
- `cashflow`

## Routes
- `/embed/profit`
- `/embed/breakeven`
- `/embed/cashflow`

Examples:
- `/embed/profit?lang=en`
- `/embed/breakeven?lang=pl`
- `/embed/cashflow?lang=it`

## Embed mode restrictions
**Disabled in embed mode:**
- login / signup
- scenario persistence
- subscription management
- dashboard navigation
- import/export of private scenarios (unless explicitly allowed for embed-only export)

**Enabled in embed mode:**
- inputs and results
- local formatting and translations
- “Open advanced version” CTA (deep-link into full app)
- “Embed this calculator” CTA (viral loop)

## Standard embed snippet
```html
<iframe
  src="https://marginbase.app/embed/profit?lang=en"
  width="100%"
  height="600"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>
```

## Conversion CTA
Embed UI must contain a clear CTA:
- “Open advanced version”
- opens calculator route in full app (language resolved by i18n context/query)

## CTA
- “Open in MarginBase” CTA is implemented

## Privacy & telemetry
- **Never** send financial inputs or computed values to backend/telemetry.
- Allow only minimal event counters (opt-in):
  - `embed_loaded`
  - `embed_open_full_version_click`
  - `embed_copy_snippet_click`

No payload fields containing:
- revenue/costs/profit/margin
- prices
- cashflow values
- any user-entered financial numbers

## SEO note
iframe embeds are not SEO-friendly for the host page.
