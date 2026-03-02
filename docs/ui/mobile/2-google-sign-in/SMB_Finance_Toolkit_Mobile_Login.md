# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 2: Google Sign-In

---

## 1. Route
`/login`

Displayed if user is not authenticated.

---

## 2. Purpose
- Authenticate user via Google.
- Establish local session.
- Navigate to Home (or Gate if needed).

---

## 3. Layout Model
Full-screen centered layout.
Single primary action.

---

## 4. Layout Zones

### Z1 – Brand
- App icon
- App name: “SMB Finance Toolkit”

### Z2 – Value Line
Short neutral subtitle:
“Financial clarity for small businesses.”

### Z3 – Primary Action
- Google Sign-In button (full width)
- Height: 48px

### Z4 – System States
- Loading indicator inside button
- Inline error message below button

### Z5 – Legal
- Privacy
- Terms
Small text at bottom of screen.

---

## 5. Components

- `LogoMark`
- `AppTitle`
- `GoogleSignInButton`
- `InlineError`
- `LoadingIndicator`
- `LegalLinks`

---

## 6. State Model

```yaml
authState:
  - idle
  - loading
  - success
  - error
```

On success:
- If trial required → Gate
- Else → Home

---

## 7. Visual Spec (Implementation Hints)

- Screen padding: 24px
- Button full width inside padding
- Button height: 48px
- Border radius: 16px
- Title size: 20–22
- Subtitle: 14–16
- Error text: 12 (danger color)
