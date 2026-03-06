interface GoogleTokenInfoResponse {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  aud?: string;
  iss?: string;
  exp?: string;
}

const GOOGLE_TOKENINFO_URL =
  process.env.GOOGLE_TOKENINFO_URL || 'https://oauth2.googleapis.com/tokeninfo';

/**
 * AuthService - handles Google OAuth token verification
 */
export class AuthService {
  /**
   * Verify Google ID token and extract user identity
   */
  async verifyGoogleIdToken(
    idToken: string,
  ): Promise<{ userId: string; email: string | null; emailVerified: boolean }> {
    const audiences = this.parseAllowedGoogleAudiences();
    const verificationMode =
      process.env.GOOGLE_VERIFICATION_MODE ?? 'tokeninfo';

    if (verificationMode !== 'development' && audiences.length === 0) {
      throw new Error('GOOGLE_CLIENT_IDS is required in tokeninfo mode.');
    }

    if (verificationMode === 'development') {
      return this.verifyTokenDevelopment(idToken, audiences);
    }

    return this.verifyTokenViaGoogle(idToken, audiences);
  }

  private async verifyTokenViaGoogle(
    idToken: string,
    audiences: string[],
  ): Promise<{ userId: string; email: string | null; emailVerified: boolean }> {
    const tokenInfo = await this.fetchGoogleTokenInfo(idToken);
    const subject = tokenInfo?.sub;
    const audience = tokenInfo?.aud;
    const issuer = tokenInfo?.iss;

    if (!tokenInfo || !subject || !audience || !this.isTrustedIssuer(issuer)) {
      throw new Error('Google token verification failed.');
    }

    if (audiences.length > 0 && !audiences.includes(audience)) {
      throw new Error('Google token audience is not allowed.');
    }

    if (this.isExpired(tokenInfo.exp)) {
      throw new Error('Google token is expired.');
    }

    if (this.isRevokedSubject(subject)) {
      throw new Error('Google session is revoked.');
    }

    return {
      userId: subject,
      email: tokenInfo.email ?? null,
      emailVerified:
        tokenInfo.email_verified === true ||
        tokenInfo.email_verified === 'true',
    };
  }

  private verifyTokenDevelopment(
    idToken: string,
    audiences: string[],
  ): { userId: string; email: string | null; emailVerified: boolean } {
    const payload = this.decodeJwtPayload(idToken);
    const subject = typeof payload?.sub === 'string' ? payload.sub : null;
    const audience = typeof payload?.aud === 'string' ? payload.aud : undefined;
    const issuer = typeof payload?.iss === 'string' ? payload.iss : undefined;

    if (!subject) {
      throw new Error('JWT payload does not contain sub claim.');
    }

    if (audiences.length > 0 && audience && !audiences.includes(audience)) {
      throw new Error('Google token audience is not allowed.');
    }

    if (issuer && !this.isTrustedIssuer(issuer)) {
      throw new Error('Google token issuer is not trusted.');
    }

    if (this.isExpired(payload?.exp)) {
      throw new Error('Google token is expired.');
    }

    if (this.isRevokedSubject(subject)) {
      throw new Error('Google session is revoked.');
    }

    return {
      userId: subject,
      email: typeof payload?.email === 'string' ? payload.email : null,
      emailVerified: payload?.email_verified === true,
    };
  }

  private async fetchGoogleTokenInfo(
    idToken: string,
  ): Promise<GoogleTokenInfoResponse | null> {
    const url = `${GOOGLE_TOKENINFO_URL}?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GoogleTokenInfoResponse;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = Buffer.from(payloadBase64, 'base64').toString('utf8');
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private isTrustedIssuer(issuer: string | undefined): boolean {
    return (
      issuer === 'accounts.google.com' ||
      issuer === 'https://accounts.google.com'
    );
  }

  private parseAllowedGoogleAudiences(): string[] {
    const raw =
      process.env.GOOGLE_CLIENT_IDS ?? process.env.VITE_GOOGLE_CLIENT_ID;
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private isExpired(exp: unknown): boolean {
    if (typeof exp !== 'string' && typeof exp !== 'number') {
      return false;
    }

    const expSeconds = typeof exp === 'number' ? exp : Number.parseInt(exp, 10);
    if (!Number.isFinite(expSeconds)) {
      return false;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    return expSeconds <= nowSeconds;
  }

  private isRevokedSubject(subject: string): boolean {
    const revoked = (process.env.REVOKED_SESSION_SUBJECTS ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return revoked.includes(subject);
  }
}
