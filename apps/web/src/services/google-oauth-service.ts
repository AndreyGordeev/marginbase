/**
 * Google OAuth Service for Web App
 * Handles Google Sign-In flow and token management
 */

interface GoogleOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
}

interface GoogleIdTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  at_hash: string;
  iat: number;
  exp: number;
}

const decodeIdToken = (token: string): GoogleIdTokenPayload => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token');
  }

  // Decode the payload (second part)
  const payload = parts[1];
  const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(decoded) as GoogleIdTokenPayload;
};

export class GoogleOAuthService {
  private config: GoogleOAuthConfig;
  private scriptLoaded: boolean = false;

  public constructor(config: GoogleOAuthConfig) {
    this.config = {
      scopes: ['openid', 'email', 'profile'],
      ...config,
    };
  }

  /**
   * Load the Google Identity Library script
   */
  public async loadGoogleLibrary(): Promise<void> {
    if (this.scriptLoaded) {
      return;
    }

    if (typeof window === 'undefined') {
      throw new Error('Google OAuth only works in browser environment');
    }

    return new Promise((resolve, reject) => {
      try {
        // Load Google Identity Services library
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
          // Verify google object is available
          if (
            (window as Window & { google?: { accounts?: { id?: unknown } } })
              .google?.accounts?.id
          ) {
            this.scriptLoaded = true;
            resolve();
          } else {
            reject(
              new Error('Google Identity Services library failed to load'),
            );
          }
        };

        script.onerror = () => {
          reject(new Error('Failed to load Google Identity Services library'));
        };

        document.head.appendChild(script);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Initialize Google Sign-In button on element
   */
  public initializeButton(
    elementId: string,
    onSuccess: (idToken: string) => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.scriptLoaded) {
      onError(new Error('Google library not loaded'));
      return;
    }
    const google = (
      window as Window & {
        google?: {
          accounts?: {
            id?: {
              initialize: (config: unknown) => void;
              renderButton: (el: HTMLElement | null, config: unknown) => void;
            };
          };
        };
      }
    ).google;
    if (!google?.accounts?.id) {
      onError(new Error('Google Identity Services not available'));
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: { credential?: string }) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else {
            onError(new Error('No credential received from Google'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      google.accounts.id.renderButton(document.getElementById(elementId), {
        theme: 'outline',
        size: 'large',
        text: 'signin',
        logo_alignment: 'left',
      });
    } catch (error) {
      onError(
        error instanceof Error
          ? error
          : new Error('Failed to initialize Google Sign-In'),
      );
    }
  }

  /**
   * Decode and validate ID token
   */
  public getTokenPayload(idToken: string): GoogleIdTokenPayload {
    return decodeIdToken(idToken);
  }

  /**
   * Get authorization URL for OAuth flow (alternative to button)
   */
  public getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: this.config.scopes?.join(' ') || 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }
}

/**
 * Create a Google OAuth service instance
 */
export const createGoogleOAuthService = (
  clientId: string,
  redirectUri: string,
): GoogleOAuthService => {
  return new GoogleOAuthService({
    clientId,
    redirectUri,
  });
};
