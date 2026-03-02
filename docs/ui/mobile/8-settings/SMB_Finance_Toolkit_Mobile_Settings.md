# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 9: Settings

---

## 1. Route
`/settings`

Accessible from:
- Dashboard (profile/settings icon)
- Drawer (future optional)

---

## 2. Purpose

- Manage account info.
- Configure lightweight preferences.
- Handle data export/import.
- Provide access to subscription & legal.

---

## 3. Layout Model

Scrollable single-column layout.

Top → Bottom:
1. Header
2. Account Section
3. Preferences
4. Data Management
5. App Info
6. Sign Out

---

## 4. Layout Zones

### Z1 – Header
- Back arrow
- Title: “Settings”

### Z2 – Account Card
Displays:
- Google email (read-only)
- User ID (optional small text)

### Z3 – Preferences Card

Fields:
- Theme (Light / Dark toggle)
- Number Format (US / EU) – optional V1 toggle

### Z4 – Data Management Card

Actions:
- Export all scenarios (JSON)
- Import scenarios (opens modal)
- Confirmation required before overwrite

### Z5 – App Info

- Version (v1.0.0 placeholder)
- Link → Subscription
- Terms
- Privacy

### Z6 – Sign Out

- Text button (destructive style)
- Confirmation dialog before logout

---

## 5. Components

- `HeaderWithBack`
- `AccountCard`
- `ToggleRow`
- `ActionRow`
- `ConfirmationModal`
- `TextLink`
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

- Screen padding: 16px
- Card radius: 16–20
- Card padding: 16–24px
- Row height: 48px
- Section spacing: 24px
