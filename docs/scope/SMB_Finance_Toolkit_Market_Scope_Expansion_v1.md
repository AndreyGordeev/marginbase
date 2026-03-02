# SMB Finance Toolkit — Market Scope & Expansion Strategy (v1)
Date: 2026-02-28  |  Initial Market: European Union

## 1. Market Scope Decision (v1)
- Primary launch market: European Union (EU).
- Regulatory baseline: GDPR-compliant architecture.
- Backend hosting: EU region only.
- No active targeting of jurisdictions requiring data localization (e.g., Russia, China).

## 2. Strategic Principle: EU-First, Global-Ready
- Design architecture to support future regional expansion without major refactor.
- Avoid hardcoded EU-only assumptions in business logic.
- Use region-agnostic data models and entitlement systems.
- Ensure payment and tax systems can later support multi-region configuration.

## 3. Architecture Requirements for Expansion Readiness
- Separate application layer from region-specific compliance configuration.
- Support multi-region backend deployment (future).
- Abstract entitlement validation from regional billing providers.
- Design data storage with logical tenant separation (region-ready).
- Implement account deletion endpoint from V1.
- Ensure telemetry schema does not depend on region-specific identifiers.

## 4. Regulatory Expansion Considerations (Future)
- USA: CCPA/CPRA readiness (data deletion + opt-out notice).
- UK: UK GDPR compatibility (already aligned with EU baseline).
- Canada: PIPEDA alignment (privacy notice + access rights).
- Russia/China: Require local hosting and legal entity (out of V1 scope).

## 5. Non-Goals for MVP
- No multi-region deployment in V1.
- No regional tax engine in V1.
- No localized legal entities outside EU.
- No geo-based dynamic compliance logic in V1.

## 6. Risk Acknowledgement
- Users from non-EU jurisdictions may access the product without explicit targeting.
- Future expansion may require updated privacy policy and DPA agreements.
- Multi-region scaling will increase operational complexity and cost.