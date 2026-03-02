# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 4: Home / Dashboard

---

## 1. Route
`/home`

Accessible after authentication.
Soft gate model: modules may show locked state.

---

## 2. Purpose

- Main launcher screen.
- Quick access to modules.
- Show subscription status.
- Display recent scenarios.

This is not an analytics dashboard.

---

## 3. Layout Model

Scrollable single-column layout.

Top → Bottom:
1. Header
2. Subscription status card
3. Module cards
4. Recent scenarios
5. Ad block

---

## 4. Layout Zones

### Z1 – Header
- Title: “Dashboard”

### Z2 – Subscription Status Card
Displays:
- Trial active (days left)
- Active bundle
- Active module(s)
- Expired / None

CTA (if needed):
- “Manage Subscription”

### Z3 – Module Cards (3 stacked)

Each card contains:
- Module name
- Short description
- Status badge (Active / Locked)
- CTA button: “Open”

Modules:
- Profit Calculator
- Break-even Calculator
- Cashflow Forecaster

If locked → CTA navigates to Subscription screen.

### Z4 – Recent Scenarios

Max 5 items:
- Scenario name
- Module label
- Last updated
- Tap to open

If empty:
- “No recent scenarios yet.”

### Z5 – Ad Block

- Small recommendation tile
- Placed at bottom of scroll
- Non-sticky

---

## 5. Components

- `HeaderTitle`
- `SubscriptionStatusCard`
- `ModuleCard`
- `RecentScenarioItem`
- `AdBlock`

---

## 6. State Model

```yaml
homeState:
  subscriptionStatus
  recentScenarios[]
```

---

## 7. Visual Spec (Implementation Hints)

- Screen padding: 16px
- Card radius: 16–20
- Card padding: 16–24
- Module CTA height: 44–48px
- Section spacing: 24px
- Status badge small pill style
