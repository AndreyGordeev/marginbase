# SMB Finance Toolkit
## UI Blueprint – Web Screen 6: Settings

---

## 1. Route
`/settings`

Accessible after authentication.
Opened from sidebar navigation.

---

## 2. Purpose

- Manage user-level preferences.
- Provide account visibility.
- Offer data management actions (export / import).
- Keep V1 minimal (no advanced configuration).

---

## 3. Layout Model

App Shell Layout:
- Left Sidebar
- Main Content (single-column, max-width container)

---

## 4. Layout Zones

### Z1 – Page Header
- Title: “Settings”

### Z2 – Account Section
- Google account email (read-only)
- User ID (internal, optional display)
- “Sign out” button

### Z3 – Preferences
- Theme (Light / Dark toggle – optional for V1, can default to Light)
- Number format (e.g., 1,000.00 vs 1 000,00 – optional future enhancement)

### Z4 – Data Management
- Export all scenarios (JSON)
- Import scenarios (JSON upload)
- Confirmation modal before overwrite

### Z5 – Application Info
- App version (v1.0.0 placeholder)
- Links:
  - Subscription
  - Terms
  - Privacy

### Z6 – Ad Block
- No ad block on settings page (keep it clean).

---

## 5. Components

- `AccountInfoCard`
- `PreferenceToggle`
- `DataManagementCard`
- `ExportButton`
- `ImportButton`
- `ConfirmationModal`
- `VersionInfo`
- `SignOutButton`

---

## 6. State Model

```yaml
settingsState:
  user:
    email
    id
  preferences:
    theme:
      - light
      - dark
    numberFormat:
      - us
      - eu
  ui:
    - idle
    - loading
    - saving
    - error
```

---

## 7. Visual Spec

Container:
- Max width: 840px
- Padding: 32px

Cards:
- Radius: var(--radius-lg)
- Border: var(--border-1)
- Padding: 24px–32px
- Subtle shadow

Buttons:
- Height: 40px standard
- Primary for export/import
- Secondary for sign out

Spacing:
- Section gap: 32px
