# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 8: Subscription Screen

---

## 1. Route
`/subscription`

Accessible from:
- Gate screen
- Dashboard (Manage Subscription)
- Locked module CTA

---

## 2. Purpose

- Display current subscription state.
- Allow subscribe to:
  - Bundle (recommended)
  - Individual modules
- Show monthly billing model.
- Keep UI simple and neutral.

---

## 3. Layout Model

Scrollable single-column layout.

Top → Bottom:
1. Header
2. Current Plan Card
3. Bundle Plan Card
4. Individual Module Cards
5. Restore / Refresh
6. Legal

No ads on subscription screen.

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Title: “Subscription”

### Z2 – Current Plan Card
Displays:
- Trial active (days left)
- Active bundle
- Active module(s)
- Expired / None

If active:
- “Cancel Subscription” (secondary style)

### Z3 – Bundle Plan Card (Highlighted)
- “All calculators included”
- Monthly: Price TBD
- CTA: “Subscribe to Bundle”
- If active → “Current Plan” (disabled)

### Z4 – Individual Module Cards

Cards for:
- Profit
- Break-even
- Cashflow

Each:
- Monthly: Price TBD
- CTA: “Subscribe” or “Current Plan”

### Z5 – Restore / Refresh

- “Restore purchases” (future-safe)
- “Refresh subscription status”

### Z6 – Legal

- Terms
- Privacy

---

## 5. Components

- `HeaderWithBack`
- `PlanStatusCard`
- `PlanCard`
- `PrimaryButton`
- `SecondaryButton`
- `TextLink`

---

## 6. State Model

```yaml
subscriptionState:
  entitlementStatus:
    - none
    - trial_active
    - trial_expired
    - active_bundle
    - active_module_profit
    - active_module_breakeven
    - active_module_cashflow
  ui:
    - idle
    - loading
    - purchasing
    - error
```

---

## 7. Visual Spec

- Screen padding: 16px
- Card radius: 16–20
- Card padding: 16–24px
- Button height: 48px
- Section spacing: 24px
- Bundle card slightly visually emphasized (border or subtle tint)
