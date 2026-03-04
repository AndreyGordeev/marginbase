# MarginBase — Copilot Refactoring Plan (Code + Docs + Tests)
Date: 2026-03-04  
Audience: GitHub Copilot / dev team  
Goal: Reduce complexity, remove duplication, and align documentation/tests with the current shipped behavior.

## Execution Status (Final)

Date closed: 2026-03-04  
Program status: ✅ Completed (PR-R1 … PR-R10)

Completed increments:
- ✅ PR-R1 — page-module split (`d68dff7`)
- ✅ PR-R2 — `WebAppService` internal decomposition (`d68dff7`)
- ✅ PR-R3 — stateless embed-route refactor (covered in subsequent merged increments)
- ✅ PR-R4 — route-focused tests + shared-link edge cases (`e182d03`)
- ✅ PR-R5 — split `web-app-service` tests by responsibility (`d68dff7`)
- ✅ PR-R6 — docs consistency sweep for share/embed wording (`1660dc1`)
- ✅ PR-R7 — telemetry docs/code policy alignment (`bd167d2`)
- ✅ PR-R8 — i18n parity + automated guard test (`4e1f0c1`)
- ✅ PR-R9 — domain calc specs completed (`267d047`)
- ✅ PR-R10 — durable release-notes structure + appendix (`4cd837e`)

Outcome summary:
- Hotspots decomposed and regression risk reduced by targeted test coverage.
- Canonical docs synchronized with shipped behavior and route/telemetry/share contracts.
- Release notes converted to concise + appendix format for lower merge conflict risk.

---

## 0) Source of truth (must read first)
1. `PROJECT_CONTEXT.md` (primary anchor)
2. `.github/copilot-instructions.md` (boundaries)
3. `docs/architecture/*`
4. `docs/contracts/api.md`
5. `docs/release-notes-v1.md`

Hard rules (carry into every refactor PR):
- Keep formulas only in `packages/domain-core`
- Keep persistence behind repositories (`packages/storage`)
- No monetary scenario values in telemetry/backend
- Keep documentation updated in same PR as behavior changes

Delivery workflow:
- One refactor step = one branch + one PR
- No mixed-step PRs

---

## 1) Current audit summary (refactor signals)

### Code complexity hotspots
- `apps/web/src/ui/pages/app-pages.ts` is a high-coupling "god file" (~836 lines) with multiple page renderers and repeated UI patterns.
- `apps/web/src/web-app-service.ts` is a high-responsibility service (~771 lines) handling entitlements, storage, reports, telemetry, share crypto, import/export.
- Embed route files repeat the same `toPlainJson` and near-identical render/recalc scaffolding.

### Test architecture hotspots
- `apps/web/tests/web-app-service.test.ts` is very large (~700+ lines) and mixes unrelated concerns.
- Route-level behavior (`main.ts` route normalization, `/embed/:lang/:calculator`, shared route edge cases) has low direct test coverage.

### Documentation inconsistency hotspots
- `PROJECT_CONTEXT.md` and `README.md` still describe old embed route shape (`/embed/profit` only) and stale share wording (sanitized-only wording without explicit client-side key flow).
- `docs/contracts/api.md` has overlapping/contradictory wording in shared rules (sanitized exception + encrypted-only rule).
- `docs/architecture/telemetry-allowlist.md` diverges from current `packages/telemetry/src/index.ts` allowlist.
- `docs/domain/calc-*.md` remain TODO placeholders.

### Localization consistency hotspot
- Non-English locale files are missing new keys:
  - `embed.exportInputs`
  - `data.exportWatermarkFree`
  - `data.exportWatermarkUpgrade`

---

## 2) Step plan (sequential PRs)

### PR-R1: Split `app-pages.ts` into feature page modules
**Goal:** reduce UI coupling and improve maintainability.

Implement:
1. Extract pages into dedicated modules:
   - dashboard
   - workspace
   - subscription
   - data-backup
   - settings
2. Keep shared primitives in one small shared file (sidebar/action helpers).
3. Preserve public API consumed by `main.ts`.

Acceptance:
- No behavior changes.
- `main.ts` imports become simpler and explicit.
- Web tests and typecheck remain green.

Files likely touched:
- `apps/web/src/ui/pages/*`
- `apps/web/src/main.ts`
- `apps/web/tests/*` (import path updates)

---

### PR-R2: Decompose `web-app-service.ts` into internal domain services
**Goal:** isolate responsibilities and reduce regression risk.

Implement:
1. Extract internal service modules:
   - entitlement state + cache
   - report export policy (watermark/free-pro)
   - share-link encryption/decryption flow
   - import/export helpers
2. Move duplicated `toPlainJson` into one reusable utility.
3. Keep `WebAppService` as facade only.

Acceptance:
- Public methods/signatures remain stable.
- No telemetry/data policy regressions.
- Existing tests pass with smaller targeted additions.

Files likely touched:
- `apps/web/src/web-app-service.ts`
- `apps/web/src/services/*` (new)
- `apps/web/src/utils/*` (new)
- `apps/web/tests/web-app-service*.test.ts`

---

### PR-R3: Refactor embed routes into shared stateless renderer
**Goal:** remove duplication across profit/breakeven/cashflow embed pages.

Implement:
1. Introduce generic embed form/compute renderer helper.
2. Reuse a single result-action row builder (open-in-app + export inputs JSON).
3. Keep module-specific input schema and calculator call as pluggable config.

Acceptance:
- `/embed/:calculator` and `/embed/:lang/:calculator` behavior remains unchanged.
- Powered-by toggle and telemetry hooks remain intact.
- Less duplicated route code.

Files likely touched:
- `apps/web/src/routes/embed*.ts`
- `apps/web/src/features/embed/*`
- `apps/web/src/main.ts`

---

### PR-R4: Add route-focused test suite (router + embeds + shared link edge cases)
**Goal:** close coverage gap outside service-level tests.

Implement:
1. Add tests for `main.ts` route normalization/parsing:
   - language-prefixed routes
   - legacy public routes
   - `/embed/:lang/:calculator`
2. Add tests for shared-link key extraction edge cases (`#k=` missing/invalid).
3. Add small UI-route smoke tests for embed route rendering.

Acceptance:
- Route behavior codified by tests.
- Regression risk for routing/i18n reduced.

Files likely touched:
- `apps/web/tests/main-routing.test.ts` (new)
- `apps/web/tests/embed-routes.test.ts` (new)
- `apps/web/tests/shared-route.test.ts` (new)

---

### PR-R5: Split `web-app-service.test.ts` by responsibility
**Goal:** improve test readability and targeted maintenance.

Implement:
1. Split current monolithic spec into focused specs:
   - entitlement/vault
   - reports/export
   - share links
   - telemetry
2. Move test fixtures/utilities to shared helpers.
3. Keep assertions equivalent.

Acceptance:
- Same or better total coverage.
- Faster diagnosis when tests fail.

Files likely touched:
- `apps/web/tests/web-app-service*.test.ts`
- `apps/web/tests/helpers/*` (new)

---

### PR-R6: Documentation consistency sweep (product/architecture/contracts)
**Goal:** align all canonical docs with current shipped behavior.

Implement:
1. Update scope wording in:
   - `PROJECT_CONTEXT.md`
   - `README.md`
   - `docs/INDEX.md`
2. Normalize share-link wording:
   - encrypted payload in backend
   - key in URL fragment (`#k=`)
3. Normalize embed route wording:
   - `/embed/:calculator`
   - `/embed/:lang/:calculator`
4. Resolve contradictory wording in `docs/contracts/api.md` shared rules.

Acceptance:
- No contradictory statements across top-level docs.
- Terminology is consistent and current.

Files likely touched:
- `PROJECT_CONTEXT.md`
- `README.md`
- `docs/INDEX.md`
- `docs/contracts/api.md`
- `docs/architecture/overview.md`

---

### PR-R7: Telemetry docs/code alignment pass
**Goal:** make telemetry allowlist docs authoritative and synchronized with code.

Implement:
1. Reconcile `docs/architecture/telemetry-allowlist.md` with `packages/telemetry/src/index.ts`.
2. Document event property constraints and forbidden monetary key policy in one consistent format.
3. Add quick checklist for adding future events safely.

Acceptance:
- Docs and code list the same event names and keys.
- Policy is explicit enough for future contributors.

Files likely touched:
- `docs/architecture/telemetry-allowlist.md`
- `packages/telemetry/src/index.ts` (only if docs reveal drift needing code change)
- `packages/telemetry/tests/telemetry-queue.test.ts` (if adjustments needed)

---

### PR-R8: i18n parity and translation governance
**Goal:** remove locale key drift and prevent recurrence.

Implement:
1. Add missing keys for `de/fr/es/pl/it/ru` based on `en/common.json`.
2. Add a lightweight key-parity test or script in CI.
3. Document translation update rule in docs policy.

Acceptance:
- All locale files have full key parity with English baseline.
- CI/test catches future missing keys.

Files likely touched:
- `apps/web/src/i18n/locales/*/common.json`
- `apps/web/tests/i18n-parity.test.ts` (new) or scripts
- `docs/documentation-sync-policy.md`

---

### PR-R9: Replace domain TODO placeholders with real specs
**Goal:** complete authoritative domain documentation.

Implement:
1. Fill:
   - `docs/domain/calc-profit.md`
   - `docs/domain/calc-breakeven.md`
   - `docs/domain/calc-cashflow.md`
2. Include concrete inputs/outputs/edge cases and link to tests.
3. Ensure formulas/terms map to `packages/domain-core` behavior.

Acceptance:
- Domain docs are no longer TODO placeholders.
- Docs reflect implemented formulas and warning semantics.

Files likely touched:
- `docs/domain/calc-*.md`
- `docs/domain/numeric-policy.md` (if clarifications needed)

---

### PR-R10: Release notes refactor into durable changelog structure
**Goal:** keep release notes maintainable after many incremental PRs.

Implement:
1. Keep `docs/release-notes-v1.md` concise and split historical detail into appendices if needed.
2. Add predictable section template for each new increment.
3. Remove accidental duplication/drift from conflict resolutions.

Acceptance:
- Release notes remain readable and increment-friendly.
- Future merges produce fewer doc conflicts.

Files likely touched:
- `docs/release-notes-v1.md`
- `docs/INDEX.md`

---

## 3) Execution order recommendation
1. R1 → R3 (structural code refactors first)
2. R4 → R5 (test architecture and coverage)
3. R6 → R10 (docs + governance alignment)

Reasoning:
- Stabilize code boundaries first.
- Lock behavior with tests second.
- Finalize and enforce documentation consistency last.

---

## 4) Definition of done for this refactor program
- Core hotspots decomposed (`app-pages`, `web-app-service`, embed routes).
- Route and i18n regressions protected by explicit tests.
- Docs fully synchronized with shipped behavior (share encryption + embed routing).
- Domain formula docs complete (no TODO placeholders).
- CI includes at least one automated consistency guard (i18n parity and/or docs contract check).
