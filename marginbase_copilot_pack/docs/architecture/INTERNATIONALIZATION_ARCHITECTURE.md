
# MarginBase — Internationalization Architecture (i18n)

**Status:** Implemented baseline (2026-03-04)  
**Scope:** Web app UI localization + language-aware routing + number/currency formatting  
**Non‑negotiables:** Offline-first, domain-core owns formulas, no financial values leave device

## Supported languages
- `en` English (base)
- `de` German
- `fr` French
- `es` Spanish
- `pl` Polish
- `it` Italian
- `ru` Russian

## Smart Translation Scope (Variant B)
### Must translate (V1)
- Calculator screens (profit/breakeven/cashflow)
- Onboarding / first-run
- Paywall / subscription UI
- Error states and empty states
- Export UI (PDF/XLSX export labels)
- Share flows (share dialogs, “copy link”, expiry messaging)
- Embed + Widget UI (CTA labels, small hints)

### Can remain English (V1)
- Legal pages: ToS / Privacy / Cookie / Refund / Cancellation
- Extended docs / help center
- Developer docs

## Hard rule: domain-core never contains translated strings
- `packages/domain-core` returns numbers and stable keys only.
- UI maps keys to translations.

Example output from domain:
```ts
{ profit: 123.45, marginPct: 12.34 }
```

UI chooses:
- **en:** “Profit”
- **de:** “Gewinn”
- etc.

## URL language routing (current model)
Language is first-class for internal app routes, while public legacy routes are preserved.

Examples:
- `/en/profit`
- `/pl/breakeven`
- `/it/cashflow`

Internal app examples:
- `/en/profit`
- `/pl/break-even`
- `/it/cashflow`

Public legacy routes:
- embeds: `/embed/profit`, `/embed/breakeven`, `/embed/cashflow`
- shared scenario: `/s/:token`

### Fallback & canonicalization (current)
- Internal routes without `:lang` are localized via language-prefixed URL rewriting.
- Public legacy routes (`/embed/*`, `/s/:token`) remain unprefixed for compatibility.
- Language can also be supplied via query parameter (`?lang=`) for embed/open-entry flows.

## Library choice
Use:
- `i18next`
- `i18next-browser-languagedetector`

Requirements:
- Keep translations in `apps/web/src/i18n/locales/*/common.json`.
- Use translation keys consistently across app, embed, and shared scenario surfaces.

## Translation file structure (current)
```
apps/web/src/i18n/
  locales/
    en/common.json
    de/common.json
    fr/common.json
    es/common.json
    pl/common.json
    it/common.json
    ru/common.json
```

Current baseline uses a unified `common` namespace.

## Number and currency formatting
Never manually format monetary values. Use `Intl.NumberFormat`.

Provide a shared helper (UI layer only):
- `formatCurrency(amount, { locale, currency })`
- `formatNumber(amount, { locale, decimals })`
- `formatPercent(value, { locale, decimals })`

Locale source:
- prefer URL lang → map to locale (`pl-PL`, `de-DE`, etc.)
- fallback to `navigator.language`

## Acceptance criteria
- All calculator UIs appear in each supported language.
- All embed and shared-scenario surfaces appear in each supported language.
- Currency/number formatting matches locale conventions.
- No localization strings in domain-core or shared calculation packages.
