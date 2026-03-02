# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 7C: Cashflow Editor

---

## 1. Route
`/module/cashflow/editor/{scenarioId}`

Opened from:
Scenario List → Tap Scenario
or
Scenario List → Create New

---

## 2. Purpose

- Forecast monthly cash balance.
- Model inflows and outflows over time.
- Detect negative cash positions.
- Save scenario.

---

## 3. Layout Model

Scrollable single-column layout with horizontal month scrolling.

Top → Bottom:
1. Header (Back + Save)
2. Scenario Name
3. Global Parameters
4. Monthly Inputs (horizontal scroll)
5. Results Section
6. Warning Banner (if needed)
7. Ad block

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Title: “Cashflow Forecaster”
- Save button

### Z2 – Scenario Name
- Editable text field

### Z3 – Global Parameters

Fields:
- Starting Cash Balance
- Forecast Period (months)

### Z4 – Monthly Inputs

Horizontally scrollable month cards.

Each month card contains:
- Month label (M1, M2, …)
- Cash In
- Cash Out

Numeric inputs only.

### Z5 – Results Section

Displays:
- Net Cash Flow per month
- Ending Balance per month
- Final Balance (highlighted)

Optionally simplified mini-chart placeholder (future enhancement).

### Z6 – Warning Banner (Conditional)

Examples:
- “Cash balance becomes negative in Month 3.”

Non-modal inline banner.

### Z7 – Ad Block

Small recommendation tile.
Placed at bottom of scroll.

---

## 5. Components

- `HeaderWithSave`
- `NumberInputField`
- `MonthCard`
- `ResultsCard`
- `WarningBanner`
- `AdBlock`

---

## 6. State Model

```yaml
cashflowEditorState:
  scenarioId
  name
  startingBalance
  months
  monthlyData[]:
    - monthIndex
    - cashIn
    - cashOut
  computed[]:
    - netFlow
    - endingBalance
  ui:
    - idle
    - saving
    - error
```

---

## 7. Visual Spec

- Screen padding: 16px
- Input height: 48px
- Month card width: ~200px
- Card radius: 16–20
- Horizontal scroll for months
- Section spacing: 16–24px
