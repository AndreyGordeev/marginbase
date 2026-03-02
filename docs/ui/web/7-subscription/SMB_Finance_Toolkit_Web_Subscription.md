# SMB Finance Toolkit
## UI Blueprint – Web Screen 5: Subscription Page

---

## 1. Route
`/subscription`

Accessible after authentication.
Can be opened from:
- Sidebar
- Locked module overlay
- Gate screen

---

## 2. Purpose

- Display current subscription status.
- Allow upgrade / downgrade between:
  - Bundle (all modules)
  - Individual module subscriptions
- Show billing model (monthly).
- Provide simple management interface (V1 minimal).

---

## 3. Layout Model

App Shell Layout:
- Left Sidebar
- Main Content (centered max-width container)

Main content uses single-column layout.

---

## 4. Layout Zones

### Z1 – Page Header
- Title: “Subscription”
- Current status badge (Trial / Active Bundle / Active Modules / None)

### Z2 – Current Plan Summary Card
- Active plan name
- Renewal status (Monthly)
- Trial end date (if applicable)
- “Manage billing” (placeholder in V1)
- “Cancel subscription” (if active)

### Z3 – Available Plans

#### Bundle Plan (Recommended)
- “All calculators included”
- Monthly price (placeholder: Price TBD)
- Feature list:
  - Profit Calculator
  - Break-even Calculator
  - Cashflow Forecaster
- CTA:
  - If not active → “Subscribe to Bundle”
  - If active → “Current Plan” (disabled)

#### Individual Module Plans (3 cards)
- Profit
- Break-even
- Cashflow
Each:
- Monthly price (Price TBD)
- CTA:
  - “Subscribe” or “Current Plan”

### Z4 – Restore / Refresh
- “Refresh subscription status”

### Z5 – Legal
- Terms
- Privacy

### Z6 – Ad Block
- No ad block on subscription page.

---

## 5. Components

- `SubscriptionStatusBadge`
- `PlanSummaryCard`
- `PlanCard` (bundle)
- `PlanCard` (module) × 3
- `PrimaryCTAButton`
- `SecondaryButton`
- `RefreshStatusLink`
- `LegalLinks`

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
  billing:
    - monthly
  ui:
    - idle
    - loading
    - error
```

---

## 7. Visual Spec

Container:
- Max width: 960px
- Padding: 32px

Plan Cards:
- Radius: var(--radius-lg)
- Border: var(--border-1)
- Padding: 32px
- Subtle shadow

CTA Buttons:
- Height: 48px
- Full width inside card

Spacing:
- Section gap: 32px
