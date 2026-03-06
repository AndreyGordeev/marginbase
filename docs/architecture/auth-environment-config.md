# Authentication Environment Configuration

## Overview

MarginBase authentication requires specific environment variables to function correctly in production and development environments.

## Environment Variables

### Production (Required)

#### `GOOGLE_CLIENT_IDS`

- **Purpose:** Comma-separated list of allowed Google OAuth client IDs for token audience validation
- **Format:** `client-id-1.apps.googleusercontent.com,client-id-2.apps.googleusercontent.com`
- **Required:** Yes (production)
- **Used by:** Backend auth service token verification
- **Example:** `123456789-abc.apps.googleusercontent.com`

#### `VITE_GOOGLE_CLIENT_ID`

- **Purpose:** Google OAuth client ID for web app sign-in button
- **Format:** Single client ID string
- **Required:** Yes (production web app)
- **Used by:** Web app Google OAuth service
- **Example:** `123456789-abc.apps.googleusercontent.com`
- **Note:** Must be included in `GOOGLE_CLIENT_IDS` list on backend

#### `VITE_API_BASE_URL`

- **Purpose:** Base URL for backend API
- **Format:** Full URL including protocol
- **Required:** Yes
- **Used by:** Web app API client
- **Example Production:** `https://api.marginbase.app`
- **Example Development:** `http://localhost:3000`

### Development/Testing (Optional)

#### `GOOGLE_VERIFICATION_MODE`

- **Purpose:** Controls how Google ID tokens are verified
- **Values:**
  - `tokeninfo` (default): Verify tokens via Google's tokeninfo endpoint (production mode)
  - `development`: Decode JWT payload without external verification (dev/test only)
- **Required:** No (defaults to `tokeninfo`)
- **Used by:** Backend auth service
- **Security:** `development` mode MUST NOT be used in production

#### `GOOGLE_TOKENINFO_URL`

- **Purpose:** Override Google tokeninfo endpoint URL
- **Format:** Full URL
- **Required:** No (defaults to `https://oauth2.googleapis.com/tokeninfo`)
- **Used by:** Backend auth service in production mode
- **Use case:** Testing with mock server

## Configuration by Environment

### Production

```bash
# Backend (Lambda environment variables)
GOOGLE_CLIENT_IDS=production-client-id.apps.googleusercontent.com
GOOGLE_VERIFICATION_MODE=tokeninfo  # Or omit (defaults to tokeninfo)

# Web App (Vite build-time)
VITE_GOOGLE_CLIENT_ID=production-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=https://api.marginbase.app
```

### Development

```bash
# Backend (.env or process.env)
GOOGLE_CLIENT_IDS=dev-client-id.apps.googleusercontent.com
GOOGLE_VERIFICATION_MODE=development  # Bypass Google verification

# Web App (apps/web/.env.development)
VITE_GOOGLE_CLIENT_ID=dev-client-id.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:3000
```

### Testing (Unit Tests)

```typescript
// In test setup
process.env.GOOGLE_VERIFICATION_MODE = "development";
process.env.GOOGLE_CLIENT_IDS = "test-client.apps.googleusercontent.com";
```

## Security Guidelines

### ✅ DO:

- Use `tokeninfo` mode in production
- Validate all tokens against allowed client IDs
- Keep client IDs in environment variables (not hardcoded)
- Use separate client IDs for development and production
- Rotate client IDs if compromised

### ❌ DON'T:

- Use `development` verification mode in production
- Commit real client IDs to version control
- Allow empty `GOOGLE_CLIENT_IDS` in production
- Share production client IDs across environments
- Disable token verification

## Token Flow

1. **Web App:**
   - User clicks "Sign in with Google" button
   - Google OAuth library loaded with `VITE_GOOGLE_CLIENT_ID`
   - User authenticates with Google → receives ID token
   - App sends ID token to backend `/auth/verify`

2. **Backend:**
   - Receives ID token in request body or Authorization header
   - Verifies token via mode set by `GOOGLE_VERIFICATION_MODE`:
     - **Production (`tokeninfo`):** Calls Google's tokeninfo endpoint
     - **Development:** Decodes JWT without external verification
   - Validates `aud` claim against `GOOGLE_CLIENT_IDS`
   - Validates issuer is `accounts.google.com`
   - Returns user ID, email, verification status

3. **Session:**
   - Web app stores token in localStorage: `marginbase_google_id_token`
   - Subsequent API calls include token in Authorization header
   - Backend verifies token on protected endpoints
   - Token remains valid until Google expiration (typically 1 hour)

## Troubleshooting

### "Missing or invalid idToken"

- Ensure token is sent in request body (`idToken` or `googleIdToken`) or Authorization header
- Check token is not empty or whitespace

### "Google token audience is not allowed"

- Verify `VITE_GOOGLE_CLIENT_ID` matches one of the IDs in backend `GOOGLE_CLIENT_IDS`
- Check for typos or extra whitespace in environment variables

### "Google token verification failed"

- In production mode: Check network access to `oauth2.googleapis.com`
- Verify token is a valid Google ID token (not access token or other token type)
- Check token has not expired (typically 1 hour lifetime)

### "Google library not loaded" (Web App)

- Verify `VITE_GOOGLE_CLIENT_ID` is set
- Check browser can load `https://accounts.google.com/gsi/client`
- Look for console errors related to Google OAuth library

## Example Test Configuration

```typescript
// vitest.config.ts or test setup
beforeEach(() => {
  process.env.GOOGLE_VERIFICATION_MODE = "development";
  process.env.GOOGLE_CLIENT_IDS = "test-client.apps.googleusercontent.com";
});

// Mock Google ID token for tests
const createMockIdToken = (payload: {
  sub: string;
  email?: string;
  email_verified?: boolean;
}) => {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64");
  const body = Buffer.from(
    JSON.stringify({
      ...payload,
      aud: "test-client.apps.googleusercontent.com",
      iss: "https://accounts.google.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64");
  return `${header}.${body}.mock-signature`;
};
```

## References

- [Google Identity: Verify ID Token](https://developers.google.com/identity/sign-in/web/backend-auth#verify-the-integrity-of-the-id-token)
- [Google OAuth 2.0: Tokeninfo Endpoint](https://developers.google.com/identity/protocols/oauth2/openid-connect#validatinganidtoken)
- [MarginBase Backend Server Package](../../packages/backend-server/README.md)
- [MarginBase Web App Configuration](../../apps/web/.env.example)
