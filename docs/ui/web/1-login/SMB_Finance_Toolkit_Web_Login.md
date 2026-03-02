# SMB Finance Toolkit

## UI Blueprint -- Web Screen 1: Google Sign-In

------------------------------------------------------------------------

## 1. Route

`/login`

-   If user is not authenticated → redirect to `/login`
-   If authenticated → redirect to `/dashboard`

------------------------------------------------------------------------

## 2. Purpose

-   Authenticate user via Google Sign-In
-   Establish local session
-   Redirect to Dashboard on success

------------------------------------------------------------------------

## 3. Layout Model

**Centered Card Layout**

Full-height page with vertically and horizontally centered login card.

------------------------------------------------------------------------

## 4. Layout Zones

### Z1 -- Brand Area

-   Logo
-   Product name: "SMB Finance Toolkit"

### Z2 -- Value Statement

-   Single-line subtitle: \> Financial clarity for small businesses.

### Z3 -- Primary Action

-   Google Sign-In Button (official Google style)
-   Full width inside card

### Z4 -- System States

-   Loading indicator on button during authentication
-   Error message area below button

### Z5 -- Legal Links

-   Privacy Policy link
-   Terms of Service link
-   Small font at bottom of card

------------------------------------------------------------------------

## 5. Components

-   `LoginCard`
-   `GoogleSignInButton`
-   `AuthErrorMessage`
-   `LoadingSpinner`
-   `LegalLinks`

------------------------------------------------------------------------

## 6. State Model

``` yaml
authState:
  - idle
  - loading
  - success   # redirect to /dashboard
  - error     # display message
```

------------------------------------------------------------------------

## 7. Explicit Non-Goals (V1)

-   No email/password authentication
-   No additional social providers
-   No advertising on login screen
-   No trial UI elements displayed here

---

## 8. Visual Spec (Implementation Hints for Copilot)

### Layout
- Viewport: `min-height: 100vh`
- Centering: card centered both vertically and horizontally
  - `display: grid; place-items: center;` (or flex equivalent)

### Card
- Width: `520px` (responsive: `max-width: 92vw`)
- Min height: `360–400px`
- Padding: `40px`
- Border radius: `16–18px`
- Shadow: subtle (single shadow layer)
- Background: solid (light)

### Spacing (tokens)
- `space-1 = 8px`
- `space-2 = 12px`
- `space-3 = 16px`
- `space-4 = 24px`
- `space-5 = 32px`
- `space-6 = 40px`

### Typography (minimal)
- Title: `18–20px`, semibold
- Subtitle: `12–14px`, regular
- Legal: `10–12px`, muted

### Button (Google)
- Height: `48px`
- Full width inside card
- Left icon: `20px`
- Icon padding left: `16px`
- Text: `13–14px`
- Loading state: spinner on the right OR replace icon with spinner

### States
- `idle`: show button, hide error area
- `loading`: disable button, show spinner
- `error`: show error text under button

