# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 12: Empty State Screen

---

## 1. Usage Context

Displayed when:
- No scenarios exist (per module)
- No recent activity (dashboard section)
- Filter results empty

Reusable component across app.

---

## 2. Purpose

- Guide user to next action.
- Reduce cognitive friction.
- Keep tone professional and neutral.

---

## 3. Layout Model

Centered vertical layout.
Scrollable if combined with other sections.

---

## 4. Layout Zones

### Z1 – Illustration Placeholder
Minimal line-style illustration or icon.

### Z2 – Title
Example:
- “No scenarios yet”
- “No recent activity”

### Z3 – Description
Short helper text:
“Create your first scenario to start analyzing.”

### Z4 – Primary Action
- Button: “Create Scenario”
- Height: 48px
- Full width within padding

Optional secondary text link (contextual).

---

## 5. Components

- `EmptyStateIcon`
- `EmptyStateTitle`
- `EmptyStateDescription`
- `PrimaryButton`

Reusable as `<EmptyState />`.

---

## 6. State Model

```yaml
emptyState:
  type:
    - no_scenarios
    - no_recent
    - no_results
  primaryAction
```

---

## 7. Visual Spec

- Screen padding: 24px
- Center aligned content
- Vertical spacing: 16px
- Icon size: 72–96px
- Button height: 48px
- Subtle muted description text
