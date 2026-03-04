# MarginBase Release Notes — V1

Date: 2026-03-04
Scope: production increments delivered to `main` during V1.

## Delivery Baseline

- Delivery model: one increment = one branch + one PR.
- V1 milestone: roadmap Steps 0–13 complete.
- Current canonical public routes: share `/s/:token#k=<shareKey>`, embed `/embed/:calculator`, localized embed `/embed/:lang/:calculator`.

## Increment Log

| Date       | Increment | Summary |
|------------|-----------|---------|
| 2026-03-02 | V1 Baseline (Steps 0–13) | Core platform, domain calculators, storage, entitlements, telemetry allowlist, API, web/mobile shells, AWS backend + infra readiness. |
| 2026-03-03 | Stripe Subscription Scope Closure | Checkout + webhook flow, entitlement lifecycle alignment, legal/compliance and go-live artifacts. |
| 2026-03-04 | i18n Coverage & Documentation Governance | Web i18n rollout, locale parity, and documentation-sync policy enforcement. |
| 2026-03-04 | PR-5 Local Export Watermark | Free exports watermark, paid exports clean, offline export behavior preserved. |
| 2026-03-04 | PR-6 Encrypted Share Links | Encrypted snapshot transport/storage and fragment key flow (`#k=`). |
| 2026-03-04 | PR-7 Stateless Embed Routes | Added `/embed/:lang/:calculator` route shape and local JSON input export for embed flows. |

## Detailed History

- Full detail for all increments is maintained in `docs/release-notes-v1-appendix.md`.

## Template for New Increments

Use this exact structure for each new release-note entry:

```md
## <Increment name> (<YYYY-MM-DD>)

### What changed
- <behavior and contract changes>

### Validation
- <tests/typecheck/build evidence>

### Docs updated
- <list of updated documentation files>

### Notes
- <compatibility, migration, or rollout notes if needed>
```
