# SMB Finance Toolkit
## UI Blueprint – Web Screen 8: Error & Empty States

---

## 1. Purpose

Define consistent handling of:
- Empty states
- Validation errors
- System errors
- Network failures
- Module locked states (overlay reference)

All states must be predictable and reusable across screens.

---

## 2. Empty States

### 2.1 No Scenarios (Module Workspace)

Displayed when scenario list is empty.

Content:
- Icon (minimal line illustration placeholder)
- Title: “No scenarios yet”
- Description: “Create your first scenario to start analyzing.”
- Primary CTA: “Create Scenario”

Layout:
- Centered inside workspace panel.
- No ad block displayed in empty state.

---

### 2.2 No Recent Scenarios (Dashboard)

Content:
- Title: “No recent activity”
- Description: “Your recent scenarios will appear here.”
- CTA: “Open Profit Calculator” (optional shortcut)

---

## 3. Validation Errors (Form Level)

### Input Validation Rules
- Inline error message under input.
- Border color: var(--danger)
- Message font size: 12px
- Example:
  - “Value must be greater than 0.”
  - “Fixed cost cannot be negative.”

Rules:
- Validation triggers on blur and on save.
- No alert dialogs for field-level errors.

---

## 4. Warning Notices (Calculation Logic)

Displayed in results panel.

Examples:
- “Contribution is zero or negative.”
- “Break-even cannot be calculated.”
- “Cash balance becomes negative in Month 4.”

Style:
- Inline warning banner.
- Use subtle background + danger or warning accent.
- Not modal.

---

## 5. System Errors (Blocking)

Examples:
- Subscription lookup failed
- Import parsing failed
- Unexpected runtime error

Display:
- Centered error card
- Title: “Something went wrong.”
- Short explanation
- Buttons:
  - Retry
  - Go to Dashboard

No technical stack traces in UI.

---

## 6. Network Failure State

If backend call fails:

Display banner at top of screen:
- “Connection lost. Trying to reconnect…”
Auto retry logic optional (future enhancement).

---

## 7. Locked Module Overlay

Overlay content:
- Blur background
- Center card:
  - “This module requires an active subscription.”
  - CTA → Subscription page
  - Secondary: Back to Dashboard

---

## 8. Visual Spec

Empty State Container:
- Center aligned
- Max width: 420px
- Gap: 16px

Error Card:
- Width: 480px
- Padding: 32px
- Radius: var(--radius-lg)
- Border: var(--border-1)

Inline Error:
- Margin-top: 4px
- Color: var(--danger)

Warning Banner:
- Padding: 12px–16px
- Radius: var(--radius-md)

---

Consistency Rule:
All error and empty states must use reusable components:
- <EmptyState />
- <InlineError />
- <WarningBanner />
- <SystemErrorCard />
