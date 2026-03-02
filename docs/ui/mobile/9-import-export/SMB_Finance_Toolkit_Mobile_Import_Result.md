# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 10: Import / Export Result

---

## 1. Route

Triggered after:
- Import completion
- Export completion
- Import failure

Presented as modal or full-screen result state (V1: modal).

---

## 2. Purpose

- Confirm successful export.
- Confirm successful import (with summary).
- Clearly explain import errors.
- Provide next action.

---

## 3. Layout Model

Centered modal overlay.

Background dimmed.

---

## 4. Result Types

### A) Export Success

Content:
- Icon (success)
- Title: “Export completed”
- Subtitle: “Your scenarios were saved as a JSON file.”
- Primary CTA: “Done”

---

### B) Import Success

Content:
- Icon (success)
- Title: “Import completed”
- Summary:
  - Total scenarios imported
  - Modules affected
- Primary CTA: “Go to Scenarios”
- Secondary CTA: “Done”

---

### C) Import Error

Content:
- Icon (error)
- Title: “Import failed”
- Reason (invalid file / schema mismatch / empty file)
- Primary CTA: “Try Again”
- Secondary CTA: “Cancel”

---

## 5. Components

- `ResultModal`
- `ResultIcon`
- `PrimaryButton`
- `SecondaryButton`
- `ResultSummaryList`

---

## 6. State Model

```yaml
importResultState:
  type:
    - export_success
    - import_success
    - import_error
  summary:
    totalScenarios
    affectedModules[]
  errorMessage
```

---

## 7. Visual Spec

- Modal width: ~320–340px
- Radius: 20px
- Padding: 24px
- Vertical spacing: 16px
- Primary button height: 48px
- Secondary button text style
