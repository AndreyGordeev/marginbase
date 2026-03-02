# SMB Finance Toolkit
## UI Blueprint – Web Screen 3: Dashboard (Home)

---

## 1. Route
`/dashboard`

Accessible after authentication.
Soft gate model: modules may be locked, but dashboard is always accessible.

---

## 2. Purpose

- Provide quick access to modules.
- Display recent scenarios.
- Show subscription status.
- Act as the main launcher screen.

This is NOT an analytics dashboard.

---

## 3. Layout Model

**App Shell Layout**
- Left Sidebar Navigation
- Main Content Area

---

## 4. Layout Zones

### Z1 – Sidebar
- Logo
- Dashboard (active)
- Profit
- Break-even
- Cashflow
- Subscription
- Settings

### Z2 – Page Header
- Title: “Dashboard”
- Subscription status badge (Trial / Active / Expired)

### Z3 – Module Cards Grid
3 cards:
- Profit Calculator
- Break-even Calculator
- Cashflow Forecaster

Each card contains:
- Module name
- Short description
- Status indicator (Active / Locked)
- CTA button: “Open”

### Z4 – Recent Scenarios
Table (max 5 rows):
- Module
- Scenario name
- Last updated
- Open button

If empty → show empty state message.

### Z5 – Ad Block
- Bottom of main content.
- Non-sticky.
- Styled like recommendation tile.

---

## 5. Components

- `SidebarNav`
- `SubscriptionBadge`
- `ModuleCard` × 3
- `RecentScenarioTable`
- `AdBlock`

---

## 6. State Model

```yaml
dashboardState:
  subscriptionStatus:
    - trial_active
    - trial_expired
    - active_bundle
    - active_module_profit
    - active_module_breakeven
    - active_module_cashflow
  recentScenarios: []
```

---

## 7. Empty / Edge States

- If no scenarios:
  - Show: “No scenarios yet. Create your first one.”
- If module locked:
  - CTA opens Subscription screen.

---

## 8. Visual Spec

### Layout
- Sidebar width: 240px
- Main content padding: 32px
- Module grid: 3 columns (desktop), 2 (medium), 1 (small)

### Cards
- Radius: var(--radius-lg)
- Padding: 32px
- Light border + subtle shadow

### Table
- Row height: 44px
- Header muted

### Ad Block
- Height: 56px
- Bottom placement inside main column
