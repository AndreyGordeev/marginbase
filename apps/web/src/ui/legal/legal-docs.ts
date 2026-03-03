import type { LegalRoute } from './legal-render';

export const LEGAL_DOCS: Record<LegalRoute, string> = {
  '/terms': `# Terms of Service

**Effective Date:** 2026-03-03

These Terms of Service ("Terms") govern access to and use of the SMB Finance Toolkit ("Service"). By accessing or using the Service, you agree to be bound by these Terms.

------------------------------------------------------------------------

## 1. Service Provider

The Service is operated by:

**Andrii Gordieiev**
Sole Trader (Jednoosobowa Działalność Gospodarcza)
Address: Przyjaźni Polsko-Węgierskiej 6A/102, 30-644 Kraków, Poland
NIP: 6793258209
VAT ID: PL6793258209
Contact: andrii.gordieiev@gmail.com

The Service is operated under Polish law.

------------------------------------------------------------------------

## 2. Description of the Service

SMB Finance Toolkit provides digital financial calculation and modeling tools, including:

- Profit and margin calculations
- Break-even analysis
- Cashflow forecasting

The Service may operate partially or fully offline using local computation engines.

We reserve the right to modify, suspend, or discontinue features where legally permitted.

------------------------------------------------------------------------

## 3. No Financial, Legal, or Tax Advice

The Service provides calculation tools for informational purposes only.

The Service does NOT provide:

- Financial advice
- Investment advice
- Tax advice
- Accounting advice
- Legal advice

Nothing within the Service constitutes professional advice under Polish or EU law.

Users are solely responsible for verifying outputs and consulting qualified professionals before making financial decisions.

Use of the Service does not create a fiduciary, advisory, or professional-client relationship.

------------------------------------------------------------------------

## 4. Free Trial and Subscription Model

The Service is provided on a subscription basis.

### 4.1 Free Trial

A one-month free trial may be offered.
Payment details (credit or debit card) are required to activate the trial.

By starting a trial, you:

- Explicitly request immediate access to digital content, and
- Acknowledge that upon full performance of the digital service, your 14-day withdrawal right may be lost in accordance with EU consumer law.

If not cancelled before the end of the trial period, the subscription automatically converts into a paid subscription.

### 4.2 Auto-Renewal

Subscriptions automatically renew at the end of each billing period unless cancelled prior to renewal.

Cancellation can be performed through:

- The web account dashboard (if subscribed via Stripe), or
- The respective app marketplace (App Store / Google Play).

For subscriptions purchased via Apple App Store or Google Play, billing and cancellation are governed by the respective platform's terms.

### 4.3 Subscription Lifecycle, Payment Failure, and Chargebacks

For web subscriptions processed via Stripe, the subscription lifecycle may include statuses such as trialing, active, past_due, and canceled, depending on payment and cancellation state.

If payment fails (for example, card decline or expired payment method), subscription status may change to past_due and access to paid modules may be restricted until payment is successfully resolved.

Users remain responsible for valid payment methods and timely update of billing details.

Chargebacks and payment disputes are handled under Stripe and issuer network rules. Where a chargeback is found improper or abusive, we may suspend or terminate access to paid features, subject to mandatory consumer protections.

------------------------------------------------------------------------

## 5. Consumer Rights (EU & Poland)

If you are a consumer within the meaning of EU or Polish law:

- You may have a 14-day right of withdrawal for digital services, unless performance has begun with your express consent and acknowledgment of loss of that right.
- Mandatory consumer protection provisions cannot be excluded.

Business users are not entitled to consumer withdrawal rights.

------------------------------------------------------------------------

## 6. Fees and VAT

All prices are displayed including VAT where applicable, in accordance with Polish and EU VAT regulations.

As a VAT-registered business (VAT czynny), VAT is applied in compliance with EU VAT rules.

We reserve the right to change pricing with prior notice.

------------------------------------------------------------------------

## 7. Accuracy Disclaimer

All outputs depend entirely on user-provided data.

We do not guarantee:

- Accuracy of calculations
- Suitability for a specific business purpose
- Continuous or uninterrupted availability

Users assume full responsibility for decisions made based on Service outputs.

------------------------------------------------------------------------

## 8. Intellectual Property

All intellectual property rights in the Service, including software, algorithms, branding, and design, remain the exclusive property of the Service Provider.

Users are granted a limited, non-exclusive, non-transferable license to use the Service.

Users MAY:

- Use calculation results for personal or commercial purposes
- Include generated outputs in reports, presentations, or business documentation

Users MAY NOT:

- Resell or sublicense access to the Service
- Copy, reproduce, or distribute the software
- Reverse engineer, decompile, or attempt to extract source code
- Bypass payment systems or entitlement controls

------------------------------------------------------------------------

## 9. Limitation of Liability

To the maximum extent permitted by Polish and EU law, the Service Provider shall not be liable for:

- Loss of profit
- Business interruption
- Indirect or consequential damages
- Financial losses resulting from decisions based on calculations
- Data loss not caused by gross negligence

Nothing in these Terms excludes liability for:

- Death or personal injury caused by negligence
- Fraud or fraudulent misrepresentation
- Mandatory consumer rights under applicable law

Where liability may be limited, total liability shall not exceed the total subscription fees paid by the user in the preceding 12 months.

------------------------------------------------------------------------

## 10. Data Protection

Processing of personal data is governed by the Privacy Policy and complies with:

- Regulation (EU) 2016/679 (GDPR)
- Polish data protection laws

------------------------------------------------------------------------

## 11. Termination

We may suspend or terminate access for:

- Violation of these Terms
- Misuse of the Service
- Legal obligations

Users may discontinue use at any time.

------------------------------------------------------------------------

## 12. Governing Law and Jurisdiction

These Terms are governed by the laws of Poland.

For consumers, mandatory consumer protection provisions of their country of residence apply where required by EU law.

Disputes shall be resolved before competent courts in Poland, without prejudice to mandatory consumer jurisdiction rights.

------------------------------------------------------------------------

## 13. Force Majeure

The Service Provider shall not be liable for failure to perform due to events beyond reasonable control.

------------------------------------------------------------------------

## 14. Severability

If any provision of these Terms is found invalid, the remaining provisions remain in effect.

------------------------------------------------------------------------

## 15. Amendments

We may update these Terms from time to time.

Continued use of the Service after updates constitutes acceptance of revised Terms.

------------------------------------------------------------------------

By using the Service, you confirm that you have read, understood, and agreed to these Terms.
`,
  '/privacy': `# Privacy Policy

**Effective Date:** 2026-03-03

This Privacy Policy explains how personal data is processed in connection with the SMB Finance Toolkit ("Service").

The Service complies with:

- Regulation (EU) 2016/679 (General Data Protection Regulation -- GDPR)
- Polish data protection laws

By using the Service, you acknowledge this Privacy Policy.

------------------------------------------------------------------------

## 1. Data Controller

The Data Controller is:

**Andrii Gordieiev**
Sole Trader (Jednoosobowa Działalność Gospodarcza)
Address: Przyjaźni Polsko-Węgierskiej 6A/102, 30-644 Kraków, Poland
NIP: 6793258209
VAT ID: PL6793258209
Email: andrii.gordieiev@gmail.com

------------------------------------------------------------------------

## 2. Categories of Personal Data Processed

Depending on usage, the following categories of personal data may be processed:

### 2.1 Account & Identity Data

- Name (if provided)
- Email address
- Authentication provider identifier (e.g., Google ID)
- Account ID

### 2.2 Subscription & Billing Data

- Subscription status
- Entitlement metadata
- Billing identifiers (processed via third-party payment providers)
- Stripe customer / subscription / invoice identifiers (web only)
- Payment event metadata (e.g., payment success/failure, cancellation, chargeback/dispute status)

### 2.3 Technical & Security Data

- IP address
- Device/browser metadata
- Log data necessary for service security

### 2.4 Financial Modeling Data

Financial scenario inputs and calculation data remain stored locally on the user's device unless explicitly exported by the user.

The Service does not store or access local financial scenario values on backend servers.

------------------------------------------------------------------------

## 3. Legal Basis for Processing (GDPR Art. 6)

Personal data is processed under the following legal bases:

- Performance of a contract (Art. 6(1)(b)) -- account creation, subscription access
- Legal obligation (Art. 6(1)(c)) -- tax and accounting compliance
- Legitimate interests (Art. 6(1)(f)) -- service security, fraud prevention
- Consent (Art. 6(1)(a)) -- where required (e.g., optional analytics)

------------------------------------------------------------------------

## 4. Purpose of Processing

Personal data is processed to:

- Provide access to the Service
- Manage subscriptions and trial activation
- Process payments and billing
- Ensure platform security
- Comply with legal obligations

Personal data is not sold.

------------------------------------------------------------------------

## 5. Payment & Platform Processors

Payments may be processed by:

- Stripe (for web subscriptions)
- Apple App Store
- Google Play Store

When subscribing via Apple or Google platforms, billing data is processed directly by the respective platform under their own privacy policies.

For Stripe web subscriptions, payment card data is processed by Stripe as independent payment processor under Stripe's PCI-compliant systems. The Service does not store full card numbers or card security codes.

The Service may process webhook-derived billing lifecycle metadata (including trial conversion, renewal status, payment failures, and chargeback indicators) solely to manage lawful access control, subscription administration, fraud prevention, and accounting compliance.

------------------------------------------------------------------------

## 6. Data Retention

Personal data is retained only as long as necessary:

- Account data: for the duration of account activity
- Billing data: as required by Polish tax law
- Security logs: limited retention for security purposes

Upon account deletion, personal data is deleted or anonymized unless retention is required by law.

Local financial data remains solely on the user's device.

------------------------------------------------------------------------

## 7. Data Sharing

Personal data may be shared with:

- Hosting infrastructure providers (EU-based where applicable)
- Authentication providers (e.g., Google)
- Payment processors (Stripe, Apple, Google)
- Legal authorities when required by law

Data Processing Agreements (DPAs) are in place where required.

Personal data is not transferred outside the European Economic Area (EEA) without appropriate safeguards (e.g., Standard Contractual Clauses).

------------------------------------------------------------------------

## 8. Data Security

Appropriate technical and organizational measures are implemented, including:

- TLS encryption in transit
- Restricted access controls
- Infrastructure-level monitoring
- Minimal data processing architecture

Users are responsible for securing their own devices and locally stored data.

------------------------------------------------------------------------

## 9. Your GDPR Rights

Under GDPR, you have the right to:

- Access your personal data
- Rectify inaccurate data
- Request erasure
- Restrict processing
- Object to processing
- Data portability
- Withdraw consent where applicable
- Lodge a complaint with a supervisory authority

Requests may be submitted to: andrii.gordieiev@gmail.com

In Poland, the supervisory authority is the President of the Personal Data Protection Office (UODO).

------------------------------------------------------------------------

## 10. Automated Decision-Making

The Service does not conduct automated decision-making producing legal or similarly significant effects within the meaning of Article 22 GDPR.

------------------------------------------------------------------------

## 11. Cookies

Essential cookies may be used for authentication and security purposes.

If analytics or non-essential cookies are introduced, explicit consent will be obtained where required by law.

------------------------------------------------------------------------

## 12. Children's Data

The Service is not intended for individuals under 18 years of age.

Personal data of minors is not knowingly collected.

------------------------------------------------------------------------

## 13. Changes to This Policy

This Privacy Policy may be updated from time to time.

Material changes will be communicated appropriately.

Continued use of the Service after updates constitutes acceptance of the revised Policy.

------------------------------------------------------------------------

By using the Service, you confirm that you have read and understood this Privacy Policy.
`,
  '/legal': `# Legal Notice

Service Provider:

Andrii Gordieiev
Jednoosobowa Działalność Gospodarcza
Przyjaźni Polsko-Węgierskiej 6A/102
30-644 Kraków, Poland

NIP: 6793258209
VAT ID: PL6793258209

Contact: andrii.gordieiev@gmail.com

The Service is operated under Polish law.
`,
  '/cancellation': `# Cancellation & Withdrawal Policy

**Effective Date:** 2026-03-03

This policy applies to subscriptions for SMB Finance Toolkit.

## 1. Right of Withdrawal (EU Consumers)

If you are a consumer within the European Union, you have the right to withdraw from a digital services contract within 14 days without giving any reason.

However, by starting a free trial or subscription that provides immediate access to digital content, you:

- Explicitly request immediate performance of the digital service; and
- Acknowledge that you may lose your right of withdrawal once the service has been fully performed.

If the service has not been fully performed, you may withdraw within 14 days by contacting: andrii.gordieiev@gmail.com

## 2. Cancellation of Subscription

Subscriptions renew automatically unless cancelled before the renewal date.

You may cancel:

- Via your web account dashboard (Stripe subscriptions); or
- Through Apple App Store or Google Play subscription settings.

Cancellation prevents future charges but does not refund past billing periods unless required by law.

## 3. Effect of Cancellation

After cancellation:
- Access remains active until the end of the current billing period.
- No further charges will occur.

## 4. Payment Failure

If a renewal payment fails, subscription status may be marked as past_due and paid access may be limited until payment is resolved.

You are responsible for maintaining valid payment details with the relevant provider (Stripe, Apple, or Google).

## 5. Chargebacks and Payment Disputes

Chargebacks and payment disputes are handled according to the payment provider and card network procedures.

Where a dispute is resolved against the user or is deemed abusive, paid access may be suspended, subject to mandatory consumer rights.
`,
  '/refund': `# Refund Policy

**Effective Date:** 2026-03-03

## 1. General Rule

Subscription fees are non-refundable once a billing period has started, except where required by applicable EU or Polish consumer protection law.

## 2. Free Trial

If a subscription is not cancelled before the end of the free trial period, it automatically converts into a paid subscription and the first billing cycle begins.

Charges after trial conversion are non-refundable unless legally required.

## 3. App Store / Google Play Purchases

Refunds for subscriptions purchased via Apple App Store or Google Play are governed exclusively by the policies of the respective platform.

## 4. Chargebacks

Improper chargebacks may result in account suspension.

Chargebacks and payment disputes are reviewed under provider and card network rules. If a dispute is accepted by the issuing bank/payment provider, any required adjustment will be applied accordingly.

## 5. Payment Failure

Failed renewal payments do not create an automatic refund entitlement. Access to paid features may be limited until payment is successfully completed or the subscription is cancelled.
`,
  '/cookies': `# Cookie Policy

**Effective Date:** 2026-03-03

## 1. Essential Cookies

The Service uses essential cookies necessary for authentication, session management, and security.

These cookies cannot be disabled as they are required for operation.

## 2. Analytics & Optional Cookies

If analytics or tracking tools are introduced, explicit consent will be requested in accordance with EU ePrivacy and GDPR requirements.

## 3. Cookie Management

Users may manage cookies via browser settings.

Any future implementation of non-essential cookies will require prior consent.
`
};