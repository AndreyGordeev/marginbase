# SMB Finance Toolkit
## UI Blueprint – Web Screen 4C: Module Workspace (Cashflow)

---

## 1. Route
`/cashflow`

Accessible after authentication.
If module not subscribed → show locked overlay inside workspace.

---

## 2. Purpose

- Forecast cash inflows and outflows over time.
- Visualize running cash balance.
- Detect negative balance periods early.
- Allow scenario comparison (future enhancement).

All calculations client-side in V1.

---

## 3. Layout Model

App Shell Layout:
- Left Sidebar (global navigation)
- Workspace split layout (desktop):

  1. Scenario List (left)
  2. Forecast Editor (center)
  3. Summary Panel (right)

---

## 4. Layout Zones

### Z1 – Scenario List (Left Panel)
- Saved forecasts
- “+ New Forecast”
- Duplicate / Delete inline actions
- Width: 280px

### Z2 – Forecast Editor (Center)

Sections:

Period Settings
- Start month
- Number of months (e.g., 6 / 12 / 24)

Cash Inflows
- Recurring revenue
- One-time inflows
- Add row button

Cash Outflows
- Fixed monthly costs
- Variable monthly costs
- One-time expenses
- Add row button

Table-style input grid (month columns).

### Z3 – Visualization Area (Center Bottom)

- Line chart: Cash Balance over time
- Optional: Inflow / Outflow stacked bars (future enhancement)
- Highlight negative periods (red indicator)

### Z4 – Summary Panel (Right)

Key Metrics:
- Initial cash
- Ending cash
- Minimum balance
- Month of lowest balance
- Total inflow
- Total outflow

Warnings:
- “Negative balance in Month X”

### Z5 – Ad Block
- Bottom of center panel (non-sticky).

---

## 5. Components

- `ScenarioListPanel`
- `CashflowSettingsForm`
- `CashflowTableGrid`
- `CashflowChart`
- `CashflowSummaryCard`
- `WarningNotice`
- `AdBlock`

---

## 6. State Model

```yaml
cashflowWorkspaceState:
  selectedScenarioId
  periodSettings
  inflows[]
  outflows[]
  calculatedTimeline[]
  warnings[]
  ui:
    - idle
    - editing
    - saving
```

---

## 7. Locked State

If module not subscribed:
- Blur workspace.
- Overlay:
  - “Subscribe to unlock Cashflow Forecaster”
  - CTA → Subscription screen.

---

## 8. Visual Spec

Panels:
- Scenario panel: 280px
- Summary panel: 340px
- Center flexible (min 640px)

Table:
- Row height: 40px
- Horizontal scroll allowed if months > 12
- Sticky first column (label)

Chart:
- Height: 260px
- Line chart (cash balance)
- Red highlight if balance < 0

Spacing:
- Panel padding: 24px
- Section gap: 24px
