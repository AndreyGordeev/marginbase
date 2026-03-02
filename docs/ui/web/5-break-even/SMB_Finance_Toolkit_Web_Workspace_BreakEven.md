# SMB Finance Toolkit
## UI Blueprint – Web Screen 4B: Module Workspace (Break-even)

---

## 1. Route
`/break-even`

Accessible after authentication.
If module not subscribed → show locked overlay inside workspace.

---

## 2. Purpose

- Calculate break-even quantity and revenue.
- Optionally compute required volume for target profit.
- Show margin of safety when planned volume provided.
- Recalculate instantly on input change.

---

## 3. Layout Model

App Shell Layout:
- Left Sidebar (global navigation)
- Workspace split into 3 panels (desktop):

  1. Scenario List (left)
  2. Input Panel (center)
  3. Results Panel (right)

---

## 4. Layout Zones

### Z1 – Scenario List (Left Panel)
- Saved scenarios
- “+ New Scenario”
- Duplicate / Delete inline actions
- Width: 280px

### Z2 – Input Panel (Center)

Sections:

Pricing & Costs
- Unit price
- Variable cost per unit
- Fixed costs (period total)

Optional
- Target profit
- Planned quantity (or planned revenue)

Auto recalculation on change.

### Z3 – Results Panel (Right)

Core Outputs:
- Break-even quantity (highlighted)
- Break-even revenue
- Contribution per unit

Optional Outputs:
- Required quantity for target profit
- Margin of safety (units)
- Margin of safety %

Warnings:
- If contribution ≤ 0 → show warning banner.

### Z4 – Simple Chart Area (Bottom of Center Panel)
- Revenue line
- Total cost line
- Intersection = break-even point
- Static minimal line chart (no heavy analytics)

### Z5 – Ad Block
- Bottom of center panel (non-sticky).

---

## 5. Components

- `ScenarioListPanel`
- `BreakEvenInputForm`
- `BreakEvenResultsCard`
- `MetricHighlight`
- `WarningNotice`
- `SimpleLineChart`
- `AdBlock`

---

## 6. State Model

```yaml
breakEvenWorkspaceState:
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
- Blur workspace panels.
- Overlay with:
  - “Subscribe to unlock Break-even Calculator”
  - CTA → Subscription screen.

---

## 8. Visual Spec

Panels:
- Scenario panel: 280px
- Results panel: 320px
- Center flexible (min 520px)

Spacing:
- Panel padding: 24px
- Section gap: 24px

Chart:
- Height: 240px
- Simple 2-line visualization
- No animations required in V1.
