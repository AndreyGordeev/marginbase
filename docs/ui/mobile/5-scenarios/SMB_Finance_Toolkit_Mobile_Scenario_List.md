# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 6: Scenario List (Per Module)

---

## 1. Route
`/module/{moduleId}/scenarios`

Opened from:
Home → Tap Module Card

moduleId:
- profit
- breakeven
- cashflow

---

## 2. Purpose

- Display saved scenarios for selected module.
- Allow create, duplicate, delete.
- Allow import/export (per module).
- Provide fast navigation to Editor.

---

## 3. Layout Model

Scrollable single-column layout.

Top → Bottom:
1. Header (with back)
2. Scenario list
3. Floating Create button
4. Ad block (bottom of scroll)

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Module name (e.g., “Profit Scenarios”)
- Optional overflow menu (⋯) for Import / Export

### Z2 – Scenario Items (List)

Each item contains:
- Scenario name
- Last updated (small text)
- Quick actions (swipe or overflow):
  - Duplicate
  - Delete

Tap → Open Scenario Editor

### Z3 – Empty State

If no scenarios:
- Icon placeholder
- Title: “No scenarios yet”
- Subtitle: “Create your first scenario.”
- Primary CTA: “Create Scenario”

### Z4 – Floating Action Button (FAB)

- Circular button
- Bottom-right
- Action: Create new scenario

### Z5 – Ad Block

- Small recommendation card
- Placed at bottom of scroll content
- Not sticky

---

## 5. Components

- `HeaderWithBack`
- `ScenarioListItem`
- `EmptyState`
- `FloatingActionButton`
- `AdBlock`
- `OverflowMenu`

---

## 6. State Model

```yaml
scenarioListState:
  moduleId
  scenarios[]
  ui:
    - idle
    - loading
    - error
```

---

## 7. Visual Spec (Implementation Hints)

- Screen padding: 16px
- List item height: 64–80px
- Divider between items (subtle border)
- FAB size: 56px
- FAB radius: full (circular)
- Section spacing: 16–24px
