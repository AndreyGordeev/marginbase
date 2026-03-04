# Copilot Instructions (MarginBase)

Use PROJECT_CONTEXT.md as the primary source of truth.

## Boundaries
- Formulas + schema + migrations: packages/domain-core (pure functions only)
- Persistence: packages/storage (repositories + adapters)
- Entitlements policy + gating: packages/entitlements
- Telemetry queue + allowlist: packages/telemetry
- API calls: packages/api-client (typed, minimal endpoints)

## Do
- Use minor-units for money, decimal lib for ratios, explicit rounding policy
- Keep DB behind repository interfaces
- Validate scenario schema on save/import
- Batch telemetry and debounce entitlement refresh
- Update all affected documentation files in the same change whenever behavior/contracts/architecture/UI are modified

## Don't
- Store scenario financial values in backend or telemetry
- Duplicate formulas in UI
- Log secrets/tokens/receipts or full telemetry payloads

## Docs Map
- docs/architecture/overview.md
- docs/architecture/quality-attributes.md
- docs/architecture/entitlements-policy.md
- docs/architecture/telemetry-allowlist.md
- docs/architecture/logical.md
- docs/architecture/deployment-aws.md
- docs/architecture/tech-stack.md
- docs/decisions/adr.md
- docs/compliance/regulatory-baseline.md
- docs/architecture/drivers.md
- docs/documentation-sync-policy.md
