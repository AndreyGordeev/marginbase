# SMB Finance Toolkit – Web UI Foundations (v1)

This document defines minimal UI foundations so the whole web app looks consistent (and so code generation tools don’t “invent” styles per screen).  
Style direction: **Friendly-professional** (clean SaaS, not playful, not banking-stiff).

---

## 1) Design Tokens

> Use CSS variables (or equivalent tokens in your UI framework).  
> Values below are defaults; keep them consistent across the app.

### Color Tokens (Light)
```css
:root {
  /* Neutrals */
  --bg: #F6F7F9;
  --surface: #FFFFFF;
  --surface-2: #F1F3F5;
  --text: #111827;
  --text-muted: #6B7280;
  --border: #E5E7EB;

  /* Brand / Accent */
  --primary: #2563EB;        /* main CTA */
  --primary-hover: #1D4ED8;
  --primary-soft: #DBEAFE;   /* subtle highlights */
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #DC2626;

  /* Links */
  --link: #2563EB;
  --link-hover: #1D4ED8;
}
```

### Color Tokens (Dark) – optional for later
```css
:root[data-theme="dark"]{
  --bg: #0B1220;
  --surface: #111827;
  --surface-2: #0F172A;
  --text: #F9FAFB;
  --text-muted: #9CA3AF;
  --border: #1F2937;

  --primary: #60A5FA;
  --primary-hover: #3B82F6;
  --primary-soft: #0B2A5B;
  --success: #22C55E;
  --warning: #FBBF24;
  --danger: #EF4444;

  --link: #60A5FA;
  --link-hover: #93C5FD;
}
```

### Typography
Recommended base font:
- `Inter` (or system UI fallback)

```css
:root{
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
  --fs-1: 12px;  /* helper */
  --fs-2: 14px;  /* body */
  --fs-3: 16px;  /* body+ */
  --fs-4: 18px;  /* section title */
  --fs-5: 20px;  /* page title */
  --fs-6: 24px;  /* big heading (rare) */

  --lh-tight: 1.2;
  --lh-normal: 1.45;

  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
}
```

### Spacing Scale
```css
:root{
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 40px;
  --space-8: 48px;
}
```

### Radius
```css
:root{
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
}
```

### Shadows (subtle)
```css
:root{
  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);
  --shadow-md: 0 8px 24px rgba(0,0,0,.10);
}
```

### Borders
```css
:root{
  --border-1: 1px solid var(--border);
}
```

---

## 2) Layout Rules

### App Shell (Web)
- Left sidebar navigation + main content.
- Main content padding: `var(--space-6)` (32px) on desktop.
- Use max content width for text-heavy pages: `960–1100px` (dashboard can be wider).

### Responsive Breakpoints (simple)
- `>= 1200px`: 3-column grids allowed
- `768–1199px`: 2-column grids
- `< 768px`: 1-column, sidebar becomes drawer (later)

---

## 3) Components (Baseline Specs)

### Buttons
**Primary Button**
- Height: `40px` (compact) or `48px` (prominent CTA like Google)
- Radius: `var(--radius-md)`
- Padding: `0 var(--space-5)`
- Background: `--primary`, text: white
- Hover: `--primary-hover`
- Disabled: opacity `0.55`, cursor not-allowed

**Secondary Button**
- Background: `--surface`
- Border: `--border-1`
- Text: `--text`
- Hover background: `--surface-2`

### Inputs
- Height: `40px`
- Radius: `var(--radius-md)`
- Border: `--border-1`
- Focus ring: `2px` outline using `--primary-soft` (or `--primary` with opacity)
- Error state: border `--danger`, helper text in `--danger`

### Cards
- Background: `--surface`
- Border: `--border-1`
- Radius: `--radius-lg` for major cards; `--radius-md` for smaller cards
- Shadow: `--shadow-sm` (only when needed; avoid heavy shadows everywhere)
- Padding: `var(--space-6)` for main cards; `var(--space-5)` for compact

### Table (Recent Scenarios)
- Row height: `44px`
- Header text: `--text-muted`, `--fs-1/2`
- Zebra: optional (very light using `--surface-2`)

### Ad Block
- Non-sticky, non-modal.
- Preferred sizes:
  - Horizontal: height `56px` (desktop), `64px` (wide)
- Visual style: looks like a “recommendation tile”, not a screaming banner.
- Border and radius consistent with cards.

---

## 4) Iconography & Tone
- Use simple line icons (consistent set).
- Avoid playful emojis inside UI; keep friendly tone in microcopy.

---

## 5) Accessibility (must-have)
- Minimum contrast: WCAG AA for text where possible.
- Focus visible on all interactive elements.
- Click targets: at least `40px` height.
- Forms: labels always present (no placeholder-only).

---

## 6) Microcopy (tone)
- Friendly, short, professional.
- Avoid jargon where possible.
- Prefer: “Save scenario”, “Duplicate”, “Export”, “Import”.
- Errors: explain what to do next.

---

## 7) Reference Snippets (Optional)

### Card container
```css
.card{
  background: var(--surface);
  border: var(--border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-6);
}
```

### Page background
```css
.page{
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
}
```
