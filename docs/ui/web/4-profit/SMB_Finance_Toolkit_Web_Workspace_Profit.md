# SMB Finance Toolkit
## UI Blueprint – Web Screen 4A: Module Workspace (Profit)

---

## 1. Route
`/profit`

Accessible after authentication.
If module not subscribed → show locked state overlay inside workspace.

---

## 2. Purpose

- Create and edit Profit/Margin scenarios.
- Display calculated results in real time.
- Allow scenario switching without page reload.
- Keep calculations client-side (engine-driven).

---

## 3. Layout Model

**App Shell Layout**
- Left Sidebar (global navigation)
- Workspace (split layout)

Workspace Layout (desktop):
- Left Panel: Scenario List
- Center: Input Form
- Right Panel: Results Summary

---

## 4. Layout Zones

### Z1 – Scenario List (Left Panel)
- List of saved scenarios
- “+ New Scenario” button
- Duplicate / Delete (inline actions)
- Width: 280px

### Z2 – Input Panel (Center)
Sections:
- Revenue
  - Unit price
  - Quantity
  - Toggle: total revenue mode
- Costs
  - Variable cost per unit
  - Fixed costs
- Auto recalculation on change
- “Save” button

### Z3 – Results Panel (Right)
- Net Profit (highlighted)
- Net Profit %
- Contribution Margin %
- Revenue
- Total Cost
- Warning messages (if any)

### Z4 – Ad Block
- Bottom of center panel (non-sticky)

---

## 5. Components

- `ScenarioListPanel`
- `ScenarioListItem`
- `NewScenarioButton`
- `ProfitInputForm`
- `ResultsCard`
- `MetricHighlight`
- `WarningNotice`
- `AdBlock`

---

## 6. State Model

```yaml
profitWorkspaceState:
  selectedScenarioId
  inputData
  calculatedData
  warnings[]
  ui:
    - idle
    - editing
    - saving
```

---

## 7. Locked State

If module not subscribed:
- Blur input + results panels
- Show centered overlay:
  - “Subscribe to unlock Profit Calculator”
  - CTA → Subscription screen

---

## 8. Visual Spec

### Panels
- Scenario panel: 280px width
- Results panel: 320px width
- Center panel flexible (min 520px)

### Spacing
- Panel padding: 24px
- Section gap: 24px

### Inputs
- Height: 40px
- Full width in center column

### Results
- Net Profit font size larger (20–24px)
- Highlight color: use --primary or --success depending on sign
