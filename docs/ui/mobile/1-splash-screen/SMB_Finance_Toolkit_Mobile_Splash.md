# SMB Finance Toolkit
## UI Blueprint – Mobile Screen 1: Splash Screen

---

## 1. Route
Initial app entry screen (no route).

---

## 2. Purpose
- Brand presence while app initializes.
- Lightweight loading state (auth check, local storage init).

---

## 3. Layout Model
Full-screen centered layout.

---

## 4. Layout Zones
### Z1 – Brand
- App icon mark (placeholder)
- App name: “SMB Finance Toolkit”

### Z2 – Loading
- Small spinner or progress indicator
- Optional line: “Preparing your workspace…”

---

## 5. Components
- `SplashLogo`
- `AppTitle`
- `LoadingIndicator`

---

## 6. State Model
```yaml
splashState:
  - initializing
  - done  # navigate next
```
Navigation decision:
- If first launch and onboarding enabled → Onboarding
- Else → Google Sign-In (if not authenticated) or Home

---

## 7. Visual Spec (Implementation Hints)
- Background: `bg` token
- Center stack spacing: 16px
- Title: 22px semibold
- Spinner size: 20–24px
