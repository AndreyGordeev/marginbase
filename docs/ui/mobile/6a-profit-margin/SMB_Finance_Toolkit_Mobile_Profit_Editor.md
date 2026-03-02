# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 7A: Profit / Margin Editor

---

## 1. Route
`/module/profit/editor/{scenarioId}`

Opened from:
Scenario List → Tap Scenario
or
Scenario List → Create New

---

## 2. Purpose

- Input revenue and cost parameters.
- Calculate profit and margin.
- Show results clearly and immediately.
- Provide save capability.

---

## 3. Layout Model

Scrollable single-column form layout.

Top → Bottom:
1. Header (Back + Save)
2. Scenario Name
3. Input Section
4. Results Card
5. Inline warnings (if any)
6. Ad block (bottom of scroll)

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Title: “Profit Calculator”
- Save button (text button)

### Z2 – Scenario Name
- Editable text field
- Placeholder: “Scenario Name”

### Z3 – Input Fields

Fields:
- Revenue
- Variable Cost
- Fixed Cost

Each:
- Label always visible
- Numeric input
- Inline validation message under field

### Z4 – Results Card

Displays:
- Total Cost
- Profit
- Margin (%)

Styled as highlighted card.
Recalculates on input change.

### Z5 – Warning Banner (Conditional)

Examples:
- “Profit is negative.”
- “Margin below 5%.”

Non-modal, inline.

### Z6 – Ad Block

Small recommendation tile.
Placed at bottom of scroll.
Not sticky.

---

## 5. Components

- `HeaderWithSave`
- `TextInputField`
- `NumberInputField`
- `ResultsCard`
- `WarningBanner`
- `AdBlock`

---

## 6. State Model

```yaml
profitEditorState:
  scenarioId
  name
  revenue
  variableCost
  fixedCost
  computed:
    totalCost
    profit
    margin
  ui:
    - idle
    - saving
    - error
```

---

## 7. Visual Spec (Implementation Hints)

- Screen padding: 16px
- Input height: 48px
- Card radius: 16–20
- Section spacing: 16–24px
- Save button disabled if validation fails
