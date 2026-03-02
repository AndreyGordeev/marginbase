# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 11: Error / Validation Modal

---

## 1. Triggered From

- Form validation failure (Save attempt)
- Critical action (Delete scenario)
- Subscription purchase error
- Unexpected runtime error

Presented as centered modal overlay.

---

## 2. Purpose

- Clearly explain problem.
- Avoid technical jargon.
- Provide corrective action.
- Never expose stack traces.

---

## 3. Layout Model

Centered modal.
Background dimmed.
Max width ~320–340px.

---

## 4. Modal Types

### A) Validation Error

Example:
Title: “Invalid input”
Message: “Contribution margin must be positive.”
Primary CTA: “Fix Inputs”
Secondary: Cancel

---

### B) Destructive Confirmation

Example:
Title: “Delete Scenario?”
Message: “This action cannot be undone.”
Primary CTA: “Delete” (destructive style)
Secondary: Cancel

---

### C) System Error

Example:
Title: “Something went wrong”
Message: “We couldn’t complete the request.”
Primary CTA: Retry
Secondary: Close

---

## 5. Components

- `ModalOverlay`
- `ModalCard`
- `ModalTitle`
- `ModalMessage`
- `PrimaryButton`
- `SecondaryButton`

---

## 6. State Model

```yaml
modalState:
  type:
    - validation
    - destructive_confirm
    - system_error
  message
  ui:
    - idle
    - processing
```

---

## 7. Visual Spec

- Radius: 20px
- Padding: 24px
- Vertical spacing: 16px
- Primary button height: 48px
- Destructive button color: danger token
