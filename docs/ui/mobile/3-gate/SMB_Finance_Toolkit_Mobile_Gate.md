# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 3: Trial / Subscription Gate

---

## 1. Route
`/gate`

Shown after login if:
- Trial not started
- Trial expired
- No active subscription

Soft model: user can continue to Home.

---

## 2. Purpose

- Explain current access state.
- Allow user to start trial (if eligible).
- Allow user to subscribe:
  - Bundle (recommended)
  - Individual modules
- Keep tone neutral and professional.

---

## 3. Layout Model

Scrollable single-column layout.

---

## 4. Layout Zones

### Z1 – Status Card
Shows one of:
- Trial available
- Trial active (days left)
- Trial expired
- Active subscription

### Z2 – Bundle Plan (Recommended)
- “All calculators included”
- Monthly: Price TBD
- CTA: “Subscribe to Bundle”

### Z3 – Individual Modules
Cards for:
- Profit
- Break-even
- Cashflow

Each contains:
- Monthly: Price TBD
- CTA: “Subscribe”

### Z4 – Primary Action (Contextual)
If trial available:
- Button: “Start Free Trial”

If trial expired:
- Button: “Subscribe to Bundle”

### Z5 – Secondary Action
- “Continue to App” (soft gate)

### Z6 – Legal
- Terms
- Privacy

No ads on this screen.

---

## 5. Components

- `StatusCard`
- `PlanCard`
- `PrimaryCTAButton`
- `SecondaryTextButton`
- `LegalLinks`

---

## 6. State Model

```yaml
gateState:
  entitlementStatus:
    - none
    - trial_available
    - trial_active
    - trial_expired
    - active_bundle
    - active_module_profit
    - active_module_breakeven
    - active_module_cashflow
  ui:
    - idle
    - loading
    - error
```

---

## 7. Visual Spec (Implementation Hints)

- Screen padding: 16–24px
- Card radius: 16–20
- Card padding: 16–24
- Button height: 48px
- Section spacing: 24px
- Scroll enabled if content exceeds viewport
