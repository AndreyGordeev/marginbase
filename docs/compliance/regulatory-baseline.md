## Regulatory & Compliance Baseline (v1)
Date: 2026-02-28  |  Scope: Web + iOS + Android (EU primary market)

## 1. Applicable Regulations
- GDPR (EU General Data Protection Regulation) — applicable due to processing of personal data (email, user ID, telemetry identifiers).
- ePrivacy / Cookie Directive (Web) — applicable if non-essential cookies or analytics are used.
- Consumer protection law (EU) — applies to subscription transparency and billing clarity.
- PCI DSS — NOT directly applicable (payment processing delegated to Stripe / App Store / Google Play).

## 2. Personal Data Processed
- Google account email address.
- Internal user ID (generated).
- Subscription status and entitlement metadata.
- Telemetry events (non-financial, no scenario numeric values).
- Technical metadata (IP address via backend logs).

Note: Financial scenario values remain stored locally on device/browser in V1 (offline-first).

## 3. Data Minimization & Purpose Limitation
- No storage of scenario financial values in backend.
- Telemetry excludes monetary amounts and sensitive financial details.
- Only essential user identifiers stored server-side.
- No profiling, no marketing resale, no behavioral advertising.

## 4. Data Retention Policy (v1)
- Backend application logs: 30–90 days rolling retention.
- Telemetry: aggregated and anonymized where possible.
- User account metadata: retained while account active.
- Local scenario data: stored on device until user deletion or uninstall.

## 5. User Rights (GDPR Compliance)
- Right of access — user can request stored personal data.
- Right to data portability — scenario export (JSON).
- Right to erasure — account deletion mechanism (to be implemented).
- Right to transparency — Privacy Policy required.
- Right to withdraw consent (where applicable).

## 6. Security Controls (Baseline)
- OAuth via Google for authentication.
- Secure storage of tokens (Keychain / Keystore on mobile).
- Encryption at rest for local mobile scenario database.
- TLS enforced for all backend communication.
- Webhook signature verification for payment providers.

## 7. Data Hosting & Localization
- Backend hosted in EU region.
- No intentional cross-border data transfers outside EU in V1.
- If third-party services used, they must provide GDPR-compliant DPA.

## 8. Legal Artifacts Required Before Launch
- Privacy Policy (clear description of data processing).
- Terms of Service (including subscription and disclaimer).
- Disclaimer: Informational tool only. Not financial advice.
- Data Processing Agreements with providers (if required).
