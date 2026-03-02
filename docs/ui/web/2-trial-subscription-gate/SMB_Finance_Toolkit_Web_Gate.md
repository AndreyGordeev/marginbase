# SMB Finance Toolkit
## UI Blueprint – Web Screen 2: Trial Status / Subscription Gate

---

## 1. Route
`/gate`

Routing rules:
- After successful login, if the user has **no active entitlements** and trial is **not active** (or just ended) → show `/gate` once.
- User can always navigate to `/dashboard` (soft gate).

---

## 2. Purpose
- Clearly communicate current access state (Trial / Active / Expired / None).
- Allow the user to start a trial (if eligible).
- Allow the user to choose a subscription:
  - per-module monthly subscription
  - bundle monthly subscription
- Provide “Continue to Dashboard” (soft gate behavior).

---

## 3. Layout Model
**Centered Card + Supporting Panel**

Full-height page with a centered card that contains:
- status summary
- plan options
- primary CTA

---

## 4. Layout Zones

### Z1 – Brand / Context
- Product name + short line: “Unlock calculators to save and compare scenarios.”

### Z2 – Status Banner
Shows one of:
- Trial available
- Trial active (with days left)
- Trial expired
- Subscription active (then this screen is rarely shown; can redirect to dashboard)

### Z3 – Plans
Two groups:
- **Bundle** (recommended)
- **Modules** (Profit / Break-even / Cashflow)

Each plan card contains:
- Plan name
- Short value line
- Monthly price placeholder: “Price TBD” (we define later)
- CTA: “Select” / “Manage”

### Z4 – Actions
- Primary CTA (contextual):
  - “Start Free Trial” (if eligible)
  - “Subscribe to Bundle” (if trial ended or user skips)
- Secondary action:
  - “Continue to Dashboard” (soft gate)

### Z5 – Legal / Restore
- “Refresh status”
- Links: Terms / Privacy

### Z6 – Ad Block
- **No ad block** on this screen (keeps trust; reduces distraction).

---

## 5. Components
- `GateCard`
- `StatusBanner`
- `PlanCard` (bundle)
- `PlanCard` (module) × 3
- `PrimaryCTAButton`
- `SecondaryLinkButton`
- `RestoreOrRefreshStatusLink`
- `LegalLinks`
- `InlineNotice` (e.g., “Prices will be finalized after MVP validation”)

---

## 6. State Model

```yaml
gateState:
  auth:
    - signed_in
    - signed_out
  entitlementStatus:
    - none
    - trial_available
    - trial_active
    - trial_expired
    - active_module_profit
    - active_module_breakeven
    - active_module_cashflow
    - active_bundle
  ui:
    - idle
    - loading
    - error
```

Rules:
- If `active_bundle` or any `active_module_*` → status “Active” and default CTA becomes “Go to Dashboard”.
- If `trial_active` → CTA can be “Go to Dashboard” + optional “Manage subscription”.
- If `trial_available` → primary CTA: “Start Free Trial”.
- If `trial_expired` or `none` → primary CTA: “Subscribe (Bundle recommended)”.

---

## 7. Actions
- Start trial
- Select plan (bundle or module)
- Continue to dashboard (soft gate)
- Refresh status

---

## 8. Empty / Error States
- If entitlement lookup fails:
  - show error message
  - show “Retry” button
  - allow “Continue to Dashboard” (still soft gate)
- If pricing not available:
  - show “Price TBD”

---

## 9. Visual Spec (Implementation Hints for Copilot)

### Page
- `min-height: 100vh`
- Centering: `display: grid; place-items: center;`
- Background: `var(--bg)`

### Card
- Width: `820px` (responsive: `max-width: 92vw`)
- Padding: `40px`
- Radius: `var(--radius-lg)`
- Border: `var(--border-1)`
- Shadow: `var(--shadow-sm)`

### Grid inside card
- Desktop: 2 columns
  - Left: Bundle (recommended)
  - Right: Modules (stacked)
- Narrow screens: 1 column.

### Buttons
- Primary CTA height: `48px`
- Secondary as link-button

### Tone
- Friendly-professional, no pressure language.
- Avoid “Paywall” wording; use “Access” / “Unlock” / “Subscription”.

