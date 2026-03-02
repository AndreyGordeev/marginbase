# SMB Finance Toolkit – Mobile UI Foundations (v1)

Unified mobile design foundations for **iOS/Android** in V1.  
Goal: consistent, friendly-professional UI with minimal custom styling.

---

## 1) Tokens (Conceptual)

> Implement as theme tokens in your chosen stack (Flutter / RN / native).

### Colors (Light)
- Background: `#F6F7F9`
- Surface: `#FFFFFF`
- Text: `#111827`
- Muted Text: `#6B7280`
- Border: `#E5E7EB`
- Primary (CTA): `#2563EB`
- Success: `#16A34A`
- Warning: `#F59E0B`
- Danger: `#DC2626`

### Typography
- Font: system UI (iOS: SF, Android: Roboto) or Inter if bundled
- Sizes:
  - Caption: 12
  - Body: 14–16
  - Section: 18
  - Title: 22

### Spacing
- 4 / 8 / 12 / 16 / 24 / 32

### Radius
- Small: 12
- Medium: 16
- Large: 20

### Elevation / Shadow
- Use subtle elevation only on primary cards (avoid heavy shadows).

---

## 2) Layout Rules

- Default screen padding: 16px
- Card padding: 16–24px
- CTA button height: 48px
- Minimum tap targets: 44–48px
- Keep forms single-column; avoid dense tables on mobile.

---

## 3) Components Baseline

- **Card**: surface + border + radius(16)
- **Primary Button**: filled, radius(16), height 48
- **Secondary Button**: outlined or text button
- **Input**: height 48, label always visible, error text under field

---

## 4) Ads (Mobile)
- One small non-intrusive block
- Never full-screen, never auto-play
- Prefer bottom placement inside scroll, not sticky

---

## 5) Accessibility
- High contrast
- Visible focus/pressed states
- Clear validation messages
