# MarginBase — Growth Features Implementation Spec (Copilot)

**Status:** Draft (ready for implementation)
**Scope:** Implement 3 growth features:
1) Business Report Export (PDF/XLSX) — local-only generation
2) Shareable Scenario Links — privacy-safe sharing via sanitized snapshots
3) Embeddable Calculators — stateless iframe-ready pages

## Implementation Status (2026-03-04)

- [x] Feature 1 (Report export): local report model + PDF + XLSX + web integration + tests
- [x] Feature 2 (Share links MVP): sanitize/migrate snapshot, create/get flow, shared route, import/save CTA gating
- [x] Feature 2 (Phase B): revoke + "My Shared Links" list + API/infra wiring + tests
- [x] Feature 3 (Embeds MVP): `/embed/profit`, `/embed/breakeven`, `/embed/cashflow`, query options, CTA prefill
- [x] Feature 3 (Phase B partial): embed hosting header policy added (`frame-ancestors` via CSP for `/embed/*`)
- [x] Optional hardening: replace remaining backend share lambda stub paths with full production data access/auth bindings
- [x] Optional: embed analytics events (strict allowlist, no monetary values)

This spec is written to guide GitHub Copilot code generation.
It must respect MarginBase non-negotiables:
- offline-first
- financial numbers never sent to cloud (no raw scenario values in backend/telemetry)
- UI never implements formulas (domain-core owns calculations)
- thin backend: auth / entitlements / telemetry only (extend minimally for share tokens)

---

## 0. Definitions

### Scenario
A locally stored user scenario (inputs + calculated outputs), persisted using existing storage package.

### Snapshot
A **sanitized, shareable representation** of a scenario:
- includes only fields required to render calculator state and recompute results locally
- excludes any PII, device IDs, vault data, history, notes, tags, file names, timestamps not needed

### Share Token
Opaque identifier that resolves to a Snapshot on backend.
Snapshot should be **encrypted at rest** and **expire** by policy.

### Privacy rules (hard)
- Backend MUST NOT receive raw scenario values unless they are within a Snapshot AND that snapshot is:
  - sanitized (no PII, no metadata)
  - minimal (only what's needed)
  - stored encrypted
  - expiring
- Telemetry MUST NOT contain any monetary numbers, unit price, revenue, cost, margin, cashflow, etc.

---

## 1) Feature: Business Report Export (Local Only)

### 1.1 Goals
- Generate a user-friendly “Business Report” from a scenario:
  - Profitability summary
  - Break-even summary
  - Cashflow 12-month projection
  - Simple risk indicators (derived, non-sensitive, computed locally)
- Export formats:
  - PDF (MVP)
  - XLSX (MVP or phase 1.1)
- No backend calls required.

### 1.2 UX
In each calculator workspace (and/or unified scenario view):
- Button: **Generate Report**
- Secondary: **Export PDF**, **Export Excel**

Report preview can be:
- a modal view (HTML preview)
- then export triggers file generation & download/share (web) or native share sheet (mobile later)

### 1.3 Architecture
Add package: `packages/reporting`
- Pure functions to build report model from `domain-core` outputs
- Exporters:
  - PDF exporter
  - XLSX exporter

Flow:
`Scenario (inputs) -> domain-core calc -> ReportModel -> Exporter -> File`

### 1.4 Data Model
Create type: `ReportModel`
- `summary`: title, generatedAtLocal (optional), currency symbol (if known), locale
- `profitability`: key metrics
- `breakeven`: key metrics
- `cashflow`: month-by-month table
- `riskIndicators`: list of computed flags (no PII)

Important:
- report model is derived from scenario inputs/outputs locally
- do not store report content in backend
- report content should not be sent to telemetry

### 1.5 PDF Export (Web)
Implementation options:
- Use a client-side PDF library (e.g., `pdf-lib`) OR render HTML -> PDF via print (browser print-to-PDF)
- Prefer deterministic library-based generation for consistent layout.

Guidelines:
- Keep PDF style simple: headings, tables, a few charts optional (phase 2)
- Include disclaimer: “Generated locally on your device”

### 1.6 XLSX Export (Web)
Use a client-side XLSX library.
Sheets:
- Summary
- Profitability
- Break-even
- Cashflow

### 1.7 File/Module changes (suggested)
- `packages/reporting/`
  - `src/index.ts`
  - `src/model/report-model.ts`
  - `src/builders/build-report.ts`
  - `src/export/pdf/export-pdf.ts`
  - `src/export/xlsx/export-xlsx.ts`
- `apps/web/src/features/reporting/`
  - `ReportButton.tsx`
  - `ReportPreviewModal.tsx`
  - `useReport.ts`

### 1.8 Tests
- Unit tests: report builder should be deterministic for given scenario
- Snapshot tests: ensure risk indicators and sections appear for known inputs
- No tests should require network

---

## 2) Feature: Shareable Scenario Links (Sanitized Snapshots)

### 2.1 Goals
- Allow users to share a scenario via link:
  - Viewer can open in browser and see calculator(s) with the snapshot preloaded
  - Viewer can edit values locally
  - To save/import/export advanced actions: require sign-in + entitlements (policy-based)

### 2.2 UX
Button: **Share Scenario**
- options:
  - “Create share link”
  - “Copy link”
  - optional: “Expire in: 7 days / 30 days / never” (policy; default 30 days)
  - optional: “Allow editing” (always allowed locally; sharing just preloads inputs)

Public viewer route:
- `/s/:token`

### 2.3 Backend API (minimal extension)
Add endpoints in `packages/api-client` + backend:
- `POST /share/create`
  - request: `{ snapshot: EncryptedPayload?, snapshot_plain?: Snapshot }`
  - response: `{ token: string, expiresAt: string }`
- `GET /share/:token`
  - response: `{ snapshot: Snapshot }` (or encrypted payload if decrypt client-side)
- `DELETE /share/:token` (optional, authenticated) — revoke

Important:
- If you do encryption server-side: server must encrypt at rest anyway.
- Prefer encryption-at-rest using KMS and store encrypted blob in DynamoDB/S3.

### 2.4 Storage (backend)
Create DynamoDB table: `ShareSnapshots`
- `pk`: token
- `encryptedBlob`: base64
- `expiresAt`: epoch (TTL enabled)
- `createdAt`: epoch
- `schemaVersion`
- optional: `ownerUserIdHash` (NOT raw userId; use stable hash if needed for revocation listing)

TTL:
- enable DynamoDB TTL on `expiresAt`

### 2.5 Sanitization Rules
Implement `sanitizeScenarioForShare(scenario) -> Snapshot`

Snapshot MUST NOT include:
- user identifiers
- emails
- device IDs
- vault salt / vault pointers
- scenario name, tags, notes
- timestamps not required
- any telemetry-related identifiers

Snapshot SHOULD include:
- calculator type(s)
- input fields required to reconstruct
- unit/currency info IF it’s non-PII and needed for display
- `schemaVersion`

### 2.6 Schema & migrations
Snapshot versioning must be independent:
- `snapshot.schemaVersion`
- Provide migrations: `migrateSnapshot(snapshot)`

### 2.7 Rendering shared scenario
Route `/s/:token` loads snapshot -> creates in-memory scenario -> runs domain-core calcs -> shows results.

No DB writes by default.
Provide CTA:
- “Import this scenario” (requires sign-in)
- “Save to My Scenarios” (requires entitlements if saving is Pro)

### 2.8 Security / Abuse
- Rate limit share create endpoint
- Token should be unguessable (>= 128-bit)
- Optional: payload size limit (e.g., 8–32KB)
- CORS: allow `GET /share/:token` from main domain; disallow wildcard if possible

### 2.9 File/Module changes (suggested)
- `packages/domain-core/` (if needed: snapshot schema definitions)
- `packages/storage/` (optional: import snapshot to local scenarios)
- `packages/api-client/src/share.ts`
- `apps/web/src/routes/sharedScenario.tsx`
- `apps/web/src/features/share/ShareScenarioDialog.tsx`
- `apps/web/src/features/share/sanitizeScenarioForShare.ts`

Backend (infra/aws + lambdas):
- Add Lambda: `share-create`
- Add Lambda: `share-get`
- Add DynamoDB table + TTL
- Update API Gateway routes

### 2.10 Tests
- Unit: sanitization removes forbidden fields
- Unit: snapshot migrations
- Integration: create->get roundtrip (local test harness)

---

## 3) Feature: Embeddable Calculators (iframe-friendly)

### 3.1 Goals
- Provide lightweight, stateless calculator pages for embedding:
  - Profit
  - Break-even
  - Cashflow
- Must run computations locally (domain-core)
- No auth required
- No storage by default (optional ephemeral state only)
- Include “Powered by MarginBase” footer with link (configurable)

### 3.2 Routes
Add public routes:
- `/embed/profit`
- `/embed/breakeven`
- `/embed/cashflow`

These routes must:
- disable app chrome/navigation
- render compact UI
- fit well in iframes (responsive height)

### 3.3 Embed options (query params)
Support optional params:
- `?theme=light|dark`
- `?currency=USD|EUR|PLN` (display only, no backend)
- `?lang=en|pl|ru` (if localization exists)
- `?poweredBy=1|0`

### 3.4 Hosting / Headers
Set headers appropriate for embedding:
- `Content-Security-Policy` should allow embedding (do NOT set `frame-ancestors 'none'`)
- Consider `frame-ancestors *` or a curated allowlist (phase 2)
- Ensure no cookies required

### 3.5 CTA for conversion
Inside embed:
- basic calculation free
- CTA button:
  - “Open in MarginBase” -> deep link to full app page with prefilled inputs via URL-safe encoding (NOT server storage)
Example:
`/profit?prefill=<base64url-json>`

### 3.6 Privacy
Embeds must:
- not write to telemetry unless it’s non-sensitive and explicitly allowed
- never send monetary values

### 3.7 File/Module changes (suggested)
- `apps/web/src/routes/embedProfit.tsx`
- `apps/web/src/routes/embedBreakeven.tsx`
- `apps/web/src/routes/embedCashflow.tsx`
- `apps/web/src/features/embed/EmbedLayout.tsx`
- `apps/web/src/features/embed/prefill.ts`

### 3.8 Tests
- Render tests for embed routes
- Query param parsing tests

---

## 4) Delivery Plan (Suggested Phasing)

### Phase A (MVP)
1. PDF report export (local)
2. Embeddable calculators (basic)
3. Shareable links (create/get, TTL, sanitized snapshot)

### Phase B
1. XLSX export
2. Share revocation & “my shared links” list
3. Embed allowlist + analytics (non-sensitive only)

---

## 5) Acceptance Criteria (Global)

- Feature 1: Report
  - Generates PDF from a scenario offline
  - PDF contains required sections and values match domain-core outputs
  - No backend calls

- Feature 2: Share links
  - Creates link and opens in incognito (no auth) and reproduces calculator state
  - Snapshot stored encrypted and auto-expires
  - Sanitization verified by tests

- Feature 3: Embeds
  - Works in iframe on external page
  - Stateless; no auth; no persistence
  - CTA opens full app with prefilled inputs

---

## 6) Non-negotiables (repeat)

- UI never contains formulas; only domain-core
- No raw financial values in telemetry
- Thin backend only; minimal new API surface
- Offline-first remains primary mode
- Sharing uses sanitized snapshots, encrypted at rest, expiring by TTL