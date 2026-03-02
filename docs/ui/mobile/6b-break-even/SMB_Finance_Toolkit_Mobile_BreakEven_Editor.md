# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 7B: Break-even Editor

---

## 1. Route
`/module/breakeven/editor/{scenarioId}`

Opened from:
Scenario List → Tap Scenario
or
Scenario List → Create New

---

## 2. Purpose

- Calculate break-even point (units & revenue).
- Show contribution margin.
- Provide clear financial interpretation.
- Save scenario.

---

## 3. Layout Model

Scrollable single-column form layout.

Top → Bottom:
1. Header (Back + Save)
2. Scenario Name
3. Input Section
4. Results Card
5. Warning Banner (if needed)
6. Ad block (bottom)

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Title: “Break-even Calculator”
- Save button

### Z2 – Scenario Name
- Editable text field

### Z3 – Input Fields

Fields:
- Price per Unit
- Variable Cost per Unit
- Fixed Cost

Inline validation under each field.

### Z4 – Results Card

Displays:
- Contribution Margin per Unit
- Break-even Units
- Break-even Revenue

Auto recalculates on change.

### Z5 – Warning Banner (Conditional)

Examples:
- “Contribution margin must be positive.”
- “Break-even cannot be calculated.”

Non-modal.

### Z6 – Ad Block

Small recommendation tile.
Not sticky.

---

## 5. Components

- `HeaderWithSave`
- `NumberInputField`
- `ResultsCard`
- `WarningBanner`
- `AdBlock`

---

## 6. State Model

```yaml
breakEvenEditorState:
  scenarioId
  name
  pricePerUnit
  variableCostPerUnit
  fixedCost
  computed:
    contributionMargin
    breakEvenUnits
    breakEvenRevenue
  ui:
    - idle
    - saving
    - error
```

---

## 7. Visual Spec

- Screen padding: 16px
- Input height: 48px
- Card radius: 16–20
- Section spacing: 16–24px
- Save disabled if invalid
