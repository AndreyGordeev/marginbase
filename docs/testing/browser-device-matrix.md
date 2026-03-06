# Browser and Device Matrix

## Matrix Definition

The Playwright project matrix is formalized in `playwright.config.ts` and executed in `.github/workflows/e2e-matrix.yml`.

### Browsers

- Chromium
- Firefox
- WebKit

### Device Classes

- Desktop
- Tablet
- Mobile Small
- Mobile Large

### CI Execution

- Critical E2E suite runs across all browser/device combinations.
- Layout guards run at least on:
  - `chromium-desktop`
  - `chromium-mobile-small`

This ensures baseline responsive and cross-engine confidence while keeping hard-gate layout checks explicit.
