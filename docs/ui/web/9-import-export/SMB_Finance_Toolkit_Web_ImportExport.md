# SMB Finance Toolkit
## UI Blueprint – Web Screen 7: Import / Export Flow

---

## 1. Entry Points

Accessible from:
- Settings → Data Management
- Module Workspace (optional shortcut)

---

## 2. Purpose

- Allow full data portability (JSON).
- Enable backup and restore of all scenarios.
- Prevent accidental data overwrite.

All processing client-side in V1.

---

## 3. Flow Overview

### Export Flow
1. User clicks “Export all scenarios”.
2. App generates JSON file.
3. Browser download triggered.
4. Show success toast: “Export completed.”

### Import Flow
1. User clicks “Import scenarios”.
2. File picker opens (accept .json).
3. Preview modal:
   - Show number of scenarios detected.
   - Show modules affected.
4. Confirm import.
5. Replace or merge (V1: Replace all).
6. Show success message.

---

## 4. Layout Model

Modal-Based Flow (overlay)

Import uses a centered modal dialog.
Export does not require modal (direct download + toast).

---

## 5. Layout Zones (Import Modal)

### Z1 – Modal Header
- Title: “Import Scenarios”
- Close (X)

### Z2 – File Info Area
- File name
- File size
- Parsed summary:
  - Total scenarios
  - Profit count
  - Break-even count
  - Cashflow count

### Z3 – Warning Notice
- “This will replace all existing scenarios.”

### Z4 – Actions
- Secondary: Cancel
- Primary: Confirm Import

---

## 6. Components

- `ImportModal`
- `FileDropZone` (optional drag & drop)
- `ImportSummary`
- `WarningNotice`
- `PrimaryCTAButton`
- `SecondaryButton`
- `ToastNotification`

---

## 7. State Model

```yaml
importExportState:
  mode:
    - idle
    - file_selected
    - parsing
    - preview
    - importing
    - success
    - error
```

---

## 8. Validation Rules

- File must be valid JSON.
- Must contain known schema version.
- If schema mismatch → show error.
- If empty → show warning and disable confirm.

---

## 9. Visual Spec

Modal:
- Width: 520px
- Padding: 32px
- Radius: var(--radius-lg)
- Border: var(--border-1)
- Shadow: var(--shadow-md)

Buttons:
- Height: 40px
- Primary aligned right

Toast:
- Bottom-right corner
- Auto-dismiss after 4 seconds
